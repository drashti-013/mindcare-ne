import React, { useEffect, useState } from 'react';import {useNavigate} from 'react-router-dom';
import api from '../api';
import {
  HeartPulse,
  ShieldCheck,
  UserPlus,
  Stethoscope,
  Users,
  Trash2,
} from 'lucide-react';

const emptyCaregiver = {
  userId: '',
  name: '',
  contact: '',
  email: '',
  gender: '',
};

const blank = {
  name: '',
  email: '',
  password: '',
  role: 'patient',
  age: '',
  phone: '',
  gender: '',
  language: 'English',
  specialization: '',
  doctorId: '',
  caregivers: [{ ...emptyCaregiver }],
};

export default function Login({ setUser, initialSignup=false }) {
  const navigate=useNavigate();
  const [signup, setSignup] = useState(initialSignup);
  const [f, setF] = useState(blank);
  const [doctors, setDoctors] = useState([]);
  const [registeredCaregivers, setRegisteredCaregivers] = useState([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!signup) return;

    api.get('/auth/doctors')
      .then((r) => setDoctors(r.data || []))
      .catch(() => setDoctors([]));

    api.get('/auth/caregivers')
      .then((r) => setRegisteredCaregivers(r.data || []))
      .catch(() => setRegisteredCaregivers([]));
  }, [signup]);

  const update = (key, value) => {
    setF((old) => ({ ...old, [key]: value }));
  };

  const updateCaregiver = (index, key, value) => {
    setF((old) => ({
      ...old,
      caregivers: old.caregivers.map((c, i) =>
        i === index ? { ...c, [key]: value } : c
      ),
    }));
  };

  const addCaregiver = () => {
    setF((old) => {
      if (old.caregivers.length >= 2) return old;
      return {
        ...old,
        caregivers: [...old.caregivers, { ...emptyCaregiver }],
      };
    });
  };

  const removeCaregiver = (index) => {
    setF((old) => ({
      ...old,
      caregivers: old.caregivers.filter((_, i) => i !== index),
    }));
  };

  const chooseRegisteredCaregiver = (index, id) => {
    const selected = registeredCaregivers.find((c) => c._id === id);

    if (!selected) {
      updateCaregiver(index, 'userId', id);
      return;
    }

    setF((old) => ({
      ...old,
      caregivers: old.caregivers.map((c, i) =>
        i === index
          ? {
              ...c,
              userId: id,
              name: selected.name || '',
              contact: selected.phone || '',
              email: selected.email || '',
              gender: selected.gender || '',
            }
          : c
      ),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setMsgType('');
    setBusy(true);

    try {
      if (signup) {
        const caregivers = f.caregivers
          .slice(0, 2)
          .filter((c) => c.name || c.contact || c.email || c.gender);

        const payload = { ...f, caregivers };
        const response = await api.post('/auth/register', payload);

        if (payload.role === 'patient') {
          setMsg(response.data.message);
          setMsgType('success');
          setSignup(false);
          setF(blank);
        } else {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } else {
        const response = await api.post('/auth/login', {
          email: f.email,
          password: f.password,
        });
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (error) {
      setMsg(error.response?.data?.message || 'Something went wrong. Please try again.');
      setMsgType('error');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setSignup((value) => !value);
    setMsg('');
    setMsgType('');
    setF(blank);
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand center">
          <div className="logo"><HeartPulse /></div>
          <div>
            <b>MindCare NE</b>
            <small>AI Cognitive Care Platform</small>
          </div>
        </div>

        <h1>{signup ? 'Create your care account' : 'Welcome back'}</h1>
        <p className="muted">
          {signup
            ? 'Patients choose a doctor and can add up to two caregivers.'
            : 'Sign in to your secure care session.'}
        </p>

        <form onSubmit={submit}>
          {signup && (
            <>
              <input
                placeholder="Full name"
                value={f.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />

              <div className="form-grid">
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Age"
                  value={f.age}
                  onChange={(e) => update('age', e.target.value)}
                />
                <select value={f.gender} onChange={(e) => update('gender', e.target.value)}>
                  <option value="">Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={f.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={f.password}
            onChange={(e) => update('password', e.target.value)}
            required
          />

          {signup && (
            <>
              <select value={f.role} onChange={(e) => update('role', e.target.value)}>
                <option value="patient">Patient</option>
                <option value="caregiver">Caregiver</option>
                <option value="doctor">Doctor</option>
              </select>

              <input
                placeholder="Contact number"
                value={f.phone}
                onChange={(e) => update('phone', e.target.value)}
              />

              <select value={f.language} onChange={(e) => update('language', e.target.value)}>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Assamese">Assamese</option>
                <option value="Bengali">Bengali</option>
                <option value="Khasi">Khasi</option>
                <option value="Mizo">Mizo</option>
                <option value="Nagamese">Nagamese</option>
              </select>

              {f.role === 'doctor' && (
                <select value={f.specialization} onChange={(e) => update('specialization', e.target.value)} required>
                  <option value="">Select specialization</option>
                  <option>Neurologist</option>
                  <option>Psychiatrist</option>
                  <option>Geriatrician</option>
                  <option>Neuropsychologist</option>
                  <option>Clinical Psychologist</option>
                  <option>General Physician</option>
                </select>
              )}

              {f.role === 'patient' && (
                <>
                  <div className="registration-box">
                    <div className="box-title">
                      <Stethoscope size={18} />
                      <b>Choose your doctor</b>
                    </div>

                    <select
                      value={f.doctorId}
                      onChange={(e) => update('doctorId', e.target.value)}
                      required
                    >
                      <option value="">Select a registered doctor</option>
                      {doctors.map((doctor) => (
                        <option value={doctor._id} key={doctor._id}>
                          {doctor.name} — {doctor.specialization || 'Doctor'}
                        </option>
                      ))}
                    </select>

                    <small className="muted">
                      A registration request will be sent to this doctor. You can log in after approval.
                    </small>
                  </div>

                  <div className="registration-box">
                    <div className="box-title">
                      <Users size={18} />
                      <b>Caregivers (maximum 2)</b>
                    </div>

                    {f.caregivers.map((caregiver, index) => (
                      <div className="caregiver-form" key={index}>
                        <div className="caregiver-title">
                          <b>Caregiver {index + 1}</b>
                          {f.caregivers.length > 1 && (
                            <button
                              type="button"
                              className="icon danger"
                              onClick={() => removeCaregiver(index)}
                              aria-label={`Remove caregiver ${index + 1}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <select
                          value={caregiver.userId || ''}
                          onChange={(e) => chooseRegisteredCaregiver(index, e.target.value)}
                        >
                          <option value="">Select registered caregiver (optional)</option>
                          {registeredCaregivers.map((person) => (
                            <option value={person._id} key={person._id}>
                              {person.name} — {person.email}
                            </option>
                          ))}
                        </select>

                        <input
                          placeholder="Name"
                          value={caregiver.name}
                          onChange={(e) => updateCaregiver(index, 'name', e.target.value)}
                        />

                        <input
                          placeholder="Contact"
                          value={caregiver.contact}
                          onChange={(e) => updateCaregiver(index, 'contact', e.target.value)}
                        />

                        <input
                          type="email"
                          placeholder="Gmail / Email"
                          value={caregiver.email}
                          onChange={(e) => updateCaregiver(index, 'email', e.target.value)}
                        />

                        <select
                          value={caregiver.gender}
                          onChange={(e) => updateCaregiver(index, 'gender', e.target.value)}
                        >
                          <option value="">Gender</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    ))}

                    {f.caregivers.length < 2 && (
                      <button type="button" className="secondary full" onClick={addCaregiver}>
                        <UserPlus size={17} /> Add second caregiver
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <button className="primary full" disabled={busy} type="submit">
            {busy
              ? 'Please wait…'
              : signup
                ? f.role === 'patient'
                  ? 'Send doctor registration request'
                  : 'Create account'
                : 'Login'}
          </button>

          {msg && (
            <div className={msgType === 'success' ? 'success' : 'error'}>
              {msg}
            </div>
          )}
        </form>

        <button className="link" type="button" onClick={switchMode}>
          {signup ? 'Already have an account? Login' : 'New here? Create an account'}
        </button>

        <div className="privacy">
          <ShieldCheck size={16} />
          Secure session authentication. AI supports decisions; it does not diagnose.
        </div>
      </div>
    </div>
  );
}
