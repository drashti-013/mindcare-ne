import { Router } from "express";
import { supabase, reminderFromRow, userFromRow } from "../utils/supabase.js";
import { auth } from "../middleware/auth.js";
import { medicationAdherence } from "../utils/aiEngine.js";
import {
  emailConfigured,
  smsConfigured,
  testEmail,
  testSms,
  verifyEmail,
  smsPhone,
  sendMedicineEmail,
  sendMedicineSms,
} from "../utils/email.js";
const r = Router();
const target = (req, body) =>
  req.user.role === "patient" ? req.user.id : body.userId || req.user.id;
async function getUser(id, select = "*") {
  const { data, error } = await supabase
    .from("users")
    .select(select)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
async function patientsForProfessional(req) {
  let { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "patient");
  if (error) throw error;
  if (req.user.role === "doctor")
    return (data || []).filter(
      (p) =>
        p.doctor_id === req.user.id && p.doctor_request_status === "accepted",
    );
  return (data || []).filter(
    (p) =>
      p.doctor_request_status === "accepted" &&
      (p.caregiver_id === req.user.id ||
        (p.caregivers || []).some(
          (c) => String(c.userId) === String(req.user.id),
        )),
  );
}
r.get("/delivery-status", auth, async (req, res) => {
  try {
    const email = await verifyEmail();
    const p =
      req.user.role === "patient" ? await getUser(req.user.id, "phone") : null;
    res.json({
      email: {
        configured: email.configured,
        ok: email.ok,
        message: email.message,
      },
      sms: {
        configured: smsConfigured(),
        ok: smsConfigured(),
        message: smsConfigured()
          ? "Twilio SMS is configured"
          : "SMS is not configured",
      },
      patientPhone: req.user.role === "patient" ? smsPhone(p?.phone) : null,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
r.post("/test-email", auth, async (req, res) => {
  try {
    const user = await getUser(req.user.id, "email");
    const to = String(req.body.to || user?.email || "").trim();
    if (!to)
      return res.status(400).json({ message: "No email address is available" });
    const outcome = await testEmail(to);
    if (outcome?.isFallback) {
      res.json({
        ok: true,
        message: `Mock email generated for ${to}. To send to actual Gmail inboxes, set your Gmail App Password in server/.env.`,
      });
    } else {
      res.json({ ok: true, message: `Real email delivered to ${to}` });
    }
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});
r.post("/test-sms", auth, async (req, res) => {
  try {
    const user = await getUser(req.user.id, "phone");
    const to = String(req.body.to || user?.phone || "").trim();
    if (!to)
      return res
        .status(400)
        .json({
          message: "Add a phone number to your profile before testing SMS",
        });
    await testSms(to);
    res.json({ ok: true, message: `Test SMS sent to ${smsPhone(to)}` });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});
r.get("/", auth, async (req, res) => {
  try {
    let ids = [target(req, req.query)];
    if (req.user.role !== "patient")
      ids = (await patientsForProfessional(req)).map((p) => p.id);
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .in("user_id", ids)
      .order("time", { ascending: true });
    if (error) throw error;
    res.json((data || []).map(reminderFromRow));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
r.get("/ai", auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", req.user.id);
    if (error) throw error;
    res.json(medicationAdherence((data || []).map(reminderFromRow)));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
r.post("/", auth, async (req, res) => {
  try {
    if (req.user.role === "patient")
      return res
        .status(403)
        .json({ message: "Only doctors can add medicine plans for patients" });
    if (req.user.role === "caregiver")
      return res
        .status(403)
        .json({ message: "Caregivers cannot create doctor medication plans" });
    if (req.user.role === "doctor") {
      const patientId = String(req.body.userId || "");
      if (!patientId)
        return res.status(400).json({ message: "Select a patient" });
      const { data: p, error: pe } = await supabase
        .from("users")
        .select("id")
        .eq("id", patientId)
        .eq("role", "patient")
        .eq("doctor_id", req.user.id)
        .eq("doctor_request_status", "accepted")
        .maybeSingle();
      if (pe) throw pe;
      if (!p)
        return res
          .status(403)
          .json({ message: "Patient is not approved or assigned to you" });
    }
    const allowed = [
      "medicine",
      "dosage",
      "time",
      "frequency",
      "instructions",
      "notifyEmail",
      "notifySms",
    ];
    const data = {};
    for (const k of allowed)
      if (req.body[k] !== undefined) data[k] = req.body[k];
    if (!data.medicine || !data.time)
      return res
        .status(400)
        .json({ message: "Medicine name and reminder time are required" });
    const targetId = target(req, req.body);
    const patient = await getUser(targetId, "id,name,email,phone");
    let notifySms = Boolean(data.notifySms);
    if (notifySms && !patient?.phone) {
      if (req.user.role === "patient") {
        return res
          .status(400)
          .json({
            message: "Add your phone number in Profile before enabling SMS",
          });
      } else {
        notifySms = false;
      }
    }
    const notifyEmail =
      data.notifyEmail !== undefined ? Boolean(data.notifyEmail) : true;
    const row = {
      user_id: targetId,
      medicine: data.medicine,
      dosage: data.dosage ?? null,
      time: data.time,
      frequency: data.frequency || "Daily",
      instructions: data.instructions ?? null,
      notify_email: notifyEmail,
      notify_sms: notifySms,
    };
    const { data: out, error } = await supabase
      .from("reminders")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    let emailSent = false,
      smsSent = false;
    if (row.notify_email && patient?.email && emailConfigured()) {
      try {
        emailSent = await sendMedicineEmail({
          to: patient.email,
          patientName: patient.name || "Patient",
          medicine: row.medicine,
          dosage: row.dosage,
          time: row.time,
          frequency: row.frequency,
          instructions: row.instructions,
          doctorName: req.user.role === "doctor" ? req.user.name : null,
          isNewPrescription: true,
        });
      } catch (err) {
        console.error("Medicine creation email failed:", err.message);
      }
    }
    if (row.notify_sms && patient?.phone && smsConfigured()) {
      try {
        smsSent = await sendMedicineSms({
          to: smsPhone(patient.phone),
          patientName: patient.name || "Patient",
          medicine: row.medicine,
          dosage: row.dosage,
          time: row.time,
        });
      } catch (err) {
        console.error("Medicine creation SMS failed:", err.message);
      }
    }
    res.status(201).json({ ...reminderFromRow(out), emailSent, smsSent });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
r.patch("/:id", auth, async (req, res) => {
  try {
    const { data: x, error: xe } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    if (xe) throw xe;
    if (!x) return res.status(404).json({ message: "Reminder not found" });
    if (
      req.user.role === "patient" &&
      String(x.user_id) !== String(req.user.id)
    )
      return res.status(403).json({ message: "Not allowed" });
    if (req.user.role === "doctor") {
      const { data: p, error: pe } = await supabase
        .from("users")
        .select("id")
        .eq("id", x.user_id)
        .eq("role", "patient")
        .eq("doctor_id", req.user.id)
        .eq("doctor_request_status", "accepted")
        .maybeSingle();
      if (pe) throw pe;
      if (!p)
        return res
          .status(403)
          .json({ message: "Patient is not approved or assigned to you" });
    }
    if (req.user.role === "caregiver")
      return res
        .status(403)
        .json({ message: "Caregivers cannot edit doctor medication plans" });
    const update = {};
    const map = {
      taken: "taken",
      notifyEmail: "notify_email",
      notifySms: "notify_sms",
      instructions: "instructions",
      time: "time",
      frequency: "frequency",
      dosage: "dosage",
      medicine: "medicine",
    };
    for (const [k, col] of Object.entries(map))
      if (req.body[k] !== undefined) update[col] = req.body[k];
    if (update.taken === true) update.taken_at = new Date().toISOString();
    if (update.taken === false) update.missed_count = (x.missed_count || 0) + 1;
    if (update.time && update.time !== x.time) update.last_notified_key = null;
    const { data, error } = await supabase
      .from("reminders")
      .update(update)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) throw error;
    res.json(reminderFromRow(data));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
r.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role === "patient")
      return res
        .status(403)
        .json({
          message: "Patients cannot remove doctor prescribed medicines",
        });
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
export default r;
