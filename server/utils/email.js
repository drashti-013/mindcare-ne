import nodemailer from 'nodemailer';

let transporter=null;

function getTransporter(){
  if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS) return null;
  if(!transporter){
    transporter=nodemailer.createTransport({
      host:process.env.SMTP_HOST,
      port:Number(process.env.SMTP_PORT||587),
      secure:String(process.env.SMTP_SECURE||'false')==='true',
      auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
    });
  }
  return transporter;
}

export async function verifyEmail(){
  const t=getTransporter();
  if(!t) return {configured:false,ok:false,message:'SMTP is not configured'};
  try{await t.verify();return {configured:true,ok:true,message:'SMTP connection is ready'};}
  catch(e){return {configured:true,ok:false,message:e.message};}
}

export async function sendEmergencyEmail({to,patientName,message,time,mapUrl}){
  const t=getTransporter();
  if(!t||!to) return false;
  await t.sendMail({
    from:process.env.SMTP_FROM||process.env.SMTP_USER,
    to,
    subject:`MindCare NE Emergency Alert – ${patientName}`,
    html:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>🚨 MindCare NE Emergency Alert</h2><p><b>Patient:</b> ${patientName}</p><p><b>Time:</b> ${time}</p><p><b>Message:</b> ${message}</p><p>${mapUrl?`<a href="${mapUrl}">📍 View the patient's SOS location</a>`:'Location was not available.'}</p><p>Please check on the patient immediately.</p></div>`
  });
  return true;
}

export async function sendMedicineEmail({to,patientName,medicine,dosage,time,instructions}){
  const t=getTransporter();
  if(!t||!to) return false;
  await t.sendMail({
    from:process.env.SMTP_FROM||process.env.SMTP_USER,
    to,
    subject:`MindCare NE Medicine Reminder – ${medicine}`,
    html:`<div style="font-family:Arial,sans-serif;max-width:600px"><h2>💊 Medicine Reminder</h2><p>Hello ${patientName},</p><p>It is time for your scheduled medicine.</p><p><b>Medicine:</b> ${medicine}</p><p><b>Dosage:</b> ${dosage||'As prescribed'}</p><p><b>Time:</b> ${time}</p><p><b>Instructions:</b> ${instructions||'Follow the prescribed instructions.'}</p></div>`
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
  const t=getTransporter();
  if(!t) throw new Error('SMTP is not configured. Add SMTP settings to server/.env');
  await t.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to,subject:'MindCare NE test email',html:'<h2>MindCare NE</h2><p>Your medicine email reminder configuration is working.</p>'});
  return true;
}

export async function testSms(to){
  await twilioSend({to,body:'MindCare NE test SMS: your medicine reminder SMS configuration is working.'});
  return true;
}

export function emailConfigured(){return Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS)}
export function smsConfigured(){return Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM)}
export function smsPhone(phone){return normalizePhone(phone)}
