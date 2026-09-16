import React from 'react';
import {Link} from 'react-router-dom';
import {Brain, ShieldAlert, Pill, Mic, HeartPulse, ArrowRight, UserRound, Stethoscope, Users} from 'lucide-react';

export default function Landing(){
  return <div className="landing">
    <header className="landing-nav">
      <Link to="/" className="brand landing-brand"><div className="logo"><HeartPulse/></div><div><b>MindCare NE</b><small>AI • Memory • Care</small></div></Link>
      <div className="landing-actions"><Link className="secondary" to="/signin">Sign In</Link><Link className="primary" to="/signup">Sign Up <ArrowRight size={16}/></Link></div>
    </header>
    <main>
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="pill">AI-assisted cognitive wellness</span>
          <h1>Gentle care for memory, routines &amp; emergencies.</h1>
          <p>MindCare NE brings cognitive games, daily check-ups, medicine reminders, voice assistance and SOS communication into one simple platform for patients, caregivers and doctors.</p>
          <div className="landing-cta"><Link className="primary" to="/signup">Create an account <ArrowRight size={17}/></Link><Link className="secondary" to="/signin">I already have an account</Link></div>
          <div className="landing-trust"><span><ShieldAlert size={16}/> SOS-ready care team</span><span><Pill size={16}/> Email + SMS reminders</span><span><Brain size={16}/> Progressive memory games</span></div>
        </div>
        <div className="landing-visual"><div className="landing-orb"><Brain size={94}/></div><div className="float-card one"><Brain size={18}/><span>Memory practice<br/><b>4 progressive levels</b></span></div><div className="float-card two"><ShieldAlert size={18}/><span>Emergency SOS<br/><b>Doctor + caregiver alerts</b></span></div></div>
      </section>
      <section className="landing-features">
        <Feature icon={Brain} title="Cognitive games" text="Memory Match, Find the Number and Memory Pattern with progressive levels."/>
        <Feature icon={Pill} title="Medicine routine" text="Set times and receive browser, email and SMS reminders."/>
        <Feature icon={Mic} title="Voice assistant" text="Use natural voice commands for common website actions and general help."/>
        <Feature icon={ShieldAlert} title="Emergency SOS" text="Send a message with GPS location to the linked doctor and caregivers."/>
      </section>
      <section className="landing-roles"><h2>One platform, three care roles</h2><div className="landing-role-grid"><Role icon={UserRound} title="Patient" text="Practice cognitive skills, manage medicines and request help."/><Role icon={Users} title="Caregiver" text="Follow assigned patients and receive emergency notifications."/><Role icon={Stethoscope} title="Doctor" text="Approve patients and review care and cognitive activity."/></div></section>
      <p className="landing-disclaimer">AI features are supportive screening and pattern tools, not a medical diagnosis.</p>
    </main>
  </div>
}
function Feature({icon:I,title,text}){return <div className="landing-feature"><div className="feature-icon"><I size={22}/></div><h3>{title}</h3><p>{text}</p></div>}
function Role({icon:I,title,text}){return <div className="landing-role"><I size={28}/><div><b>{title}</b><p>{text}</p></div></div>}
