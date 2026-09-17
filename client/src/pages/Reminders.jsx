import React, { useEffect, useState } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Mail,
  MessageSquare,
  RefreshCw,
  Phone
} from 'lucide-react';
import api from '../api';

function currentTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export default function Reminders({ user }) {
  const professional = user.role !== 'patient';
  const isDoctor = user.role === 'doctor';

  const [items, setItems] = useState([]);
  const [ai, setAI] = useState(null);
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(user);
  const [testMsg, setTestMsg] = useState('');

  // Doctor states
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [customMedicine, setCustomMedicine] = useState('');
  const medicineOptions = [
    'Paracetamol',
    'Ibuprofen',
    'Vitamin D',
    'Amlodipine',
    'Metformin',
    'Omeprazole',
    'Amoxicillin',
    'Insulin',
    'Other'
  ];

  const [f, setF] = useState({
    medicine: '',
    dosage: '',
    time: currentTime(),
    frequency: 'Daily',
    instructions: '',
    notifyEmail: true,
    notifySms: true
  });

  const load = () =>
    api
      .get('/reminders')
      .then((r) => setItems(r.data || []))
      .catch(() => {});

  const loadAI = () =>
    api
      .get('/reminders/ai')
      .then((r) => setAI(r.data))
      .catch(() => {});

  const loadStatus = () =>
    api
      .get('/reminders/delivery-status')
      .then((r) => setStatus(r.data))
      .catch(() => {});

  useEffect(() => {
    const refresh = () => {
      load();

      if (isDoctor) {
        api
          .get('/assessments/patients')
          .then((r) => {
            setPatients((r.data || []).map((x) => x.patient));
          })
          .catch(() => {});
      }

      if (!professional) {
        loadAI();
        loadStatus();

        api
          .get('/auth/me')
          .then((r) => setProfile(r.data.user))
          .catch(() => {});
      }
    };

    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [user, isDoctor, professional]);

  const add = async (e) => {
    e.preventDefault();

    try {
      const medicineName = f.medicine === 'Other'
        ? customMedicine.trim()
        : f.medicine;

      if (!medicineName) {
        alert('Please select or enter a medicine name.');
        return;
      }

      const payload = isDoctor
        ? {
            ...f,
            medicine: medicineName,
            userId: selectedPatient
          }
        : {
            ...f,
            medicine: medicineName
          };

      const res = await api.post('/reminders', payload);

      setF({
        medicine: '',
        dosage: '',
        time: currentTime(),
        frequency: 'Daily',
        instructions: '',
        notifyEmail: true,
        notifySms: true
      });

      setCustomMedicine('');
      setSelectedPatient('');

      load();
      loadAI();

      let msg = 'Medicine reminder saved.';
      if (res.data?.emailSent && res.data?.smsSent) {
        msg = `✅ Medicine plan saved! Email and SMS sent to ${isDoctor ? 'the patient' : 'your contact'}.`;
      } else if (res.data?.emailSent) {
        msg = `✅ Medicine plan saved! Confirmation email sent to ${isDoctor ? 'the patient' : 'your email'}.`;
      } else if (res.data?.smsSent) {
        msg = `✅ Medicine plan saved! Confirmation SMS sent to ${isDoctor ? 'the patient' : 'your phone'}.`;
      } else {
        msg = '✅ Medicine reminder saved. Scheduled reminders will trigger at the prescribed time.';
      }
      setTestMsg(msg);
    } catch (e) {
      alert(
        e.response?.data?.message || 'Could not save reminder'
      );
    }
  };

  const toggle = async (x) => {
    try {
      await api.patch(`/reminders/${x._id}`, {
        taken: !x.taken
      });

      load();
      loadAI();
    } catch (e) {
      alert(
        e.response?.data?.message || 'Could not update medicine status'
      );
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);

      load();
      loadAI();
    } catch (e) {
      alert(
        e.response?.data?.message || 'Could not delete reminder'
      );
    }
  };

  const test = async (type) => {
    try {
      const r = await api.post(`/reminders/test-${type}`, {});
      setTestMsg(r.data.message);
    } catch (e) {
      setTestMsg(
        e.response?.data?.message || `Test ${type} failed`
      );
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="pill">
            {professional ? 'Medicine Overview' : 'Medicine + AI'}
          </span>

          <h1>
            {professional
              ? 'Medication overview'
              : 'My medicine routine'}
          </h1>

          <p>
            {professional
              ? 'Review assigned medicine routines and adherence patterns.'
              : 'Set a reminder and deliver it to your registered email and phone by enabling Email + SMS.'}
          </p>
        </div>
      </div>

      {/* Patient email/SMS delivery section */}
      {!professional && (
        <section className="panel delivery-panel">
          <div className="panel-title">
            <div>
              <h3>
                <ShieldCheck /> Reminder delivery
              </h3>

              <span className="muted">
                Your medicine reminders can reach both your email and phone.
              </span>
            </div>

            <button
              className="secondary"
              onClick={loadStatus}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          <div className="delivery-recipient">
            <b>Patient contact</b>
            <br />

            <Mail size={13} />{' '}
            {profile.email || 'Email not added'}

            &nbsp;

            <Phone size={13} />{' '}
            {profile.phone || 'Phone not added'}
          </div>

          <div className="delivery-grid">
            <div
              className={`delivery-card ${
                status?.email?.ok ? 'ok' : 'bad'
              }`}
            >
              <Mail />

              <div>
                <b>Email</b>

                <small>
                  {status?.email?.message || 'Checking SMTP…'}
                </small>
              </div>
            </div>

            <div
              className={`delivery-card ${
                status?.sms?.ok ? 'ok' : 'bad'
              }`}
            >
              <MessageSquare />

              <div>
                <b>SMS</b>

                <small>
                  {status?.sms?.message || 'Checking Twilio…'}
                </small>
              </div>
            </div>
          </div>


          {testMsg && (
            <div className="delivery-message">
              {testMsg}
            </div>
          )}
        </section>
      )}

      {/* Doctor medicine plan */}
      {isDoctor && (
        <form className="panel" onSubmit={add}>
          <h3>
            <Plus />{' '}
            {isDoctor
              ? 'Decide medicine plan for patient'
              : 'Add medicine reminder'}
          </h3>

          {isDoctor && (
            <select
              value={selectedPatient}
              onChange={(e) =>
                setSelectedPatient(e.target.value)
              }
              required
            >
              <option value="">
                Select approved patient
              </option>

              {patients.map((p) => (
                <option
                  key={p.id || p._id}
                  value={p.id || p._id}
                >
                  {p.name} — {p.email}
                </option>
              ))}
            </select>
          )}

          <select
            value={f.medicine || ''}
            onChange={(e) =>
              setF({
                ...f,
                medicine: e.target.value
              })
            }
            required
          >
            <option value="">Select medicine</option>
            {medicineOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {f.medicine === 'Other' && (
            <input
              placeholder="Type medicine name"
              value={customMedicine}
              onChange={(e) => setCustomMedicine(e.target.value)}
              required
            />
          )}

          <input
            placeholder="Dosage e.g. 1 tablet"
            value={f.dosage}
            onChange={(e) =>
              setF({
                ...f,
                dosage: e.target.value
              })
            }
          />

          <label className="field-label">
            Reminder time

            <input
              type="time"
              value={f.time}
              onChange={(e) =>
                setF({
                  ...f,
                  time: e.target.value
                })
              }
            />
          </label>

          <select
            value={f.frequency}
            onChange={(e) =>
              setF({
                ...f,
                frequency: e.target.value
              })
            }
          >
            <option>Daily</option>
            <option>Twice daily</option>
            <option>Weekly</option>
          </select>

          <input
            placeholder="Instructions e.g. after breakfast"
            value={f.instructions}
            onChange={(e) =>
              setF({
                ...f,
                instructions: e.target.value
              })
            }
          />

          <div className="notify-options">
            <label>
              <input
                type="checkbox"
                checked={f.notifyEmail}
                onChange={(e) =>
                  setF({
                    ...f,
                    notifyEmail: e.target.checked
                  })
                }
              />

              <Mail size={15} />
              {isDoctor ? 'Notify patient via email' : 'Send to my email'}
            </label>

            <label>
              <input
                type="checkbox"
                checked={f.notifySms}
                onChange={(e) =>
                  setF({
                    ...f,
                    notifySms: e.target.checked
                  })
                }
              />

              <MessageSquare size={15} />
              {isDoctor ? 'Notify patient via SMS' : 'Send to my phone (SMS)'}
            </label>
          </div>

          <button className="primary">
            <Bell />

            {isDoctor
              ? 'Save medicine plan'
              : 'Save reminder'}
          </button>

          {testMsg && (
            <div className="delivery-message" style={{ marginTop: '12px' }}>
              {testMsg}
            </div>
          )}

          <div className="note">
            <ShieldCheck size={16} />

            Email notifications are delivered via SMTP. SMS is delivered via Twilio.
          </div>
        </form>
      )}

      {/* AI adherence */}
      {ai && (
        <section className="ai-box">
          <strong>
            {ai.score}% medicine adherence
          </strong>

          <p>{ai.message}</p>

          <span className="ai-tag">
            AI pattern summary
          </span>
        </section>
      )}

      {/* Medicine list */}
      <section className="panel">
        <h3>
          <Bell />{' '}
          {professional
            ? 'Assigned medicine routines'
            : 'My reminders'}
        </h3>

        {items
          .filter((x) => !(!professional && x.taken))
          .map((x) => (
            <div
              className="rem-card"
              key={x._id}
            >
              <div>
                <b>{x.medicine}</b>

                <small>
                  {x.dosage} • {x.frequency}{' '}
                  {x.instructions &&
                    `• ${x.instructions}`}
                </small>

                <small>
                  {x.notifyEmail
                    ? '✉ Email on'
                    : '✉ Email off'}

                  {x.notifySms
                    ? ' • SMS on'
                    : ' • SMS off'}
                </small>
              </div>

              <strong>{x.time}</strong>

              {!professional && (
                <button
                  className={
                    x.taken
                      ? 'done icon'
                      : 'icon'
                  }
                  onClick={() => toggle(x)}
                  title="Mark taken"
                >
                  <Check />
                </button>
              )}
            </div>
          ))}

        {!items.length && (
          <p className="muted">
            No medicine schedules found.
          </p>
        )}
      </section>
    </div>
  );
}