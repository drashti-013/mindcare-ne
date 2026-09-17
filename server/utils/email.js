import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

export function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const user = String(process.env.SMTP_USER).trim();
  const pass = String(process.env.SMTP_PASS).replace(/\s+/g, '');
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: String(process.env.SMTP_HOST).trim(),
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user,
        pass
      }
    });
  }
  return transporter;
}

export async function verifyEmail() {
  const t = getTransporter();
  if (!t) return { configured: false, ok: false, message: 'SMTP not configured in server/.env' };
  try {
    await t.verify();
    return { configured: true, ok: true, message: `SMTP connected (${process.env.SMTP_USER})` };
  } catch (e) {
    return { configured: true, ok: false, message: `SMTP login failed: ${e.message}` };
  }
}

export async function sendEmergencyEmail({ to, patientName, message, time, mapUrl }) {
  const t = getTransporter();
  if (!t || !to) return false;
  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `🚨 MindCare NE Emergency Alert – ${patientName}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;border:2px solid #ef4444;border-radius:8px;padding:24px;background:#ffffff">
      <h2 style="color:#ef4444;margin-top:0">🚨 MindCare NE Emergency Alert</h2>
      <p><b>Patient:</b> ${patientName}</p>
      <p><b>Time:</b> ${time}</p>
      <p><b>Message:</b> ${message}</p>
      <p>${mapUrl ? `<a href="${mapUrl}" style="background:#ef4444;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;display:inline-block">📍 View SOS Location</a>` : 'Location was not available.'}</p>
      <p style="color:#64748b;font-size:13px;margin-top:20px">Please check on the patient immediately.</p>
    </div>`
  });
  return true;
}

export async function sendMedicineEmail({ to, patientName, medicine, dosage, time, instructions, frequency, doctorName, isNewPrescription = false }) {
  const t = getTransporter();
  if (!t || !to) return false;
  const subject = isNewPrescription
    ? `MindCare NE: New Medicine Prescribed – ${medicine}`
    : `MindCare NE Medicine Reminder – ${medicine}`;

  const heading = isNewPrescription
    ? `<h2>💊 New Medication Added</h2><p>Hello <b>${patientName}</b>,</p><p>${doctorName ? `<b>Dr. ${doctorName}</b> has prescribed a new medication plan for you.` : 'A new medicine reminder has been added to your care routine.'}</p>`
    : `<h2>💊 Medicine Reminder</h2><p>Hello <b>${patientName}</b>,</p><p>It is time for your scheduled medicine.</p>`;

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;border:1px solid #e2e8f0;border-radius:8px;padding:24px;background:#ffffff">
      ${heading}
      <table style="width:100%;margin-top:16px;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#64748b;width:130px"><b>Medicine:</b></td><td style="padding:8px 0;font-size:16px;color:#0f172a"><b>${medicine}</b></td></tr>
        <tr><td style="padding:8px 0;color:#64748b"><b>Dosage:</b></td><td style="padding:8px 0;color:#0f172a">${dosage || 'As prescribed'}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b"><b>Scheduled Time:</b></td><td style="padding:8px 0;color:#0f172a">${time}</td></tr>
        ${frequency ? `<tr><td style="padding:8px 0;color:#64748b"><b>Frequency:</b></td><td style="padding:8px 0;color:#0f172a">${frequency}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#64748b"><b>Instructions:</b></td><td style="padding:8px 0;color:#0f172a">${instructions || 'Follow the prescribed routine.'}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:13px;color:#94a3b8">MindCare NE — Intelligent Health & Cognitive Care</p>
    </div>`
  });
  return true;
}

function normalizePhone(phone){
  const raw=String(phone||'').trim();
  if(!raw) return '';
  if(raw.startsWith('+')) return raw.replace(/\s+/g,'');
  const digits=raw.replace(/\D/g,'');
  if(digits.length===10) return `${process.env.DEFAULT_SMS_COUNTRY_CODE||'+91'}${digits}`;
  if(digits.length===12&&digits.startsWith('91')) return `+${digits}`;
  return raw.replace(/\s+/g,'');
}

async function twilioSend({to,body}){
  if(!smsConfigured()) throw new Error('SMS is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM to server/.env');
  const destination=normalizePhone(to);
  if(!destination) throw new Error('A valid patient phone number is required for SMS');
  const payload=new URLSearchParams({To:destination,From:process.env.TWILIO_FROM,Body:body});
  const auth=Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:payload});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data?.message||`Twilio returned HTTP ${response.status}`);
  return data;
}

export async function sendEmergencySms({to,patientName,message,mapUrl,time}){
  try{
    const locationText=mapUrl?` Location: ${mapUrl}`:'';
    await twilioSend({to,body:`MindCare NE EMERGENCY: ${patientName} needs immediate assistance. ${message||'Please check on the patient now.'} Time: ${time}.${locationText}`});
    return true;
  }catch(e){
    console.error('Emergency SMS failed:',e.message);
    return false;
  }
}

export async function sendMedicineSms({to,patientName,medicine,dosage,time}){
  try{
    await twilioSend({to,body:`MindCare NE medicine reminder for ${patientName}: ${medicine}${dosage?` (${dosage})`:''} at ${time}. Please follow the prescribed instructions.`});
    return true;
  }catch(e){
    console.error('Medicine SMS failed:',e.message);
    return false;
  }
}

export async function testEmail(to){
  const t = getTransporter();
  if(!t) throw new Error('SMTP is not configured. Add SMTP settings to server/.env');
  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'MindCare NE Test Email',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;border:1px solid #e2e8f0;border-radius:8px;padding:24px;background:#ffffff">
      <h2 style="color:#0f172a;margin-top:0">MindCare NE</h2>
      <p>Your medicine email notification configuration is active and working properly.</p>
      <p>Target patient: <b>${to}</b></p>
      <p style="color:#64748b;font-size:13px;margin-top:20px">MindCare NE Notification System</p>
    </div>`
  });
  return true;
}

export async function testSms(to){
  await twilioSend({to,body:'MindCare NE test SMS: your medicine reminder SMS configuration is working.'});
  return true;
}

export function emailConfigured(){
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
export function smsConfigured(){return Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM)}
export function smsPhone(phone){return normalizePhone(phone)}

