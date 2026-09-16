import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {supabase,reminderFromRow,userFromRow} from './utils/supabase.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import assessmentRoutes from './routes/assessments.js';
import reminderRoutes from './routes/reminders.js';
import dashboardRoutes from './routes/dashboard.js';
import emergencyRoutes from './routes/emergency.js';
import {initAI} from './utils/aiEngine.js';
import {sendMedicineEmail,sendMedicineSms,emailConfigured,smsConfigured,smsPhone} from './utils/email.js';

dotenv.config();

const {data:dbCheck,error:dbError}=await supabase.from('users').select('id').limit(1);
if(dbError){console.error('Supabase connection failed:',dbError.message);process.exit(1)}
console.log('Supabase connected');

initAI();
const app=express();
const clientUrl=process.env.CLIENT_URL||'http://localhost:5173';
app.set('trust proxy',1);app.use(cors({origin:clientUrl,credentials:true}));app.use(express.json());
app.get('/api/health',(_,res)=>res.json({ok:true,service:'MindCare NE API',database:'supabase',auth:'stateless'}));
app.use('/api/auth',authRoutes);app.use('/api/games',gameRoutes);app.use('/api/assessments',assessmentRoutes);app.use('/api/reminders',reminderRoutes);app.use('/api/dashboard',dashboardRoutes);app.use('/api/emergency',emergencyRoutes);

async function processMedicineNotifications(){try{const now=new Date();const timeZone=process.env.APP_TIMEZONE||'Asia/Kolkata';const parts=new Intl.DateTimeFormat('en-CA',{timeZone,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(now);const get=t=>parts.find(p=>p.type===t)?.value||'';const hm=`${get('hour')}:${get('minute')}`;const day=`${get('year')}-${get('month')}-${get('day')}`;const notifyKey=`${day}_${hm}`;const {data,error}=await supabase.from('reminders').select('*').eq('time',hm).or('notify_email.eq.true,notify_sms.eq.true');if(error)throw error;for(const raw of data||[]){const rem=reminderFromRow(raw);if(rem.lastNotifiedKey===notifyKey)continue;const {data:p,error:pe}=await supabase.from('users').select('name,email,phone').eq('id',rem.userId).maybeSingle();if(pe)throw pe;if(!p)continue;const patient=userFromRow(p);let sent=false;if(rem.notifyEmail&&emailConfigured()&&patient.email){try{sent=(await sendMedicineEmail({to:patient.email,patientName:patient.name,medicine:rem.medicine,dosage:rem.dosage,time:rem.time,instructions:rem.instructions}))||sent}catch(e){console.error('Medicine email failed:',e.message)}}if(rem.notifySms&&smsConfigured()&&patient.phone){sent=(await sendMedicineSms({to:smsPhone(patient.phone),patientName:patient.name,medicine:rem.medicine,dosage:rem.dosage,time:rem.time}))||sent}if(sent)await supabase.from('reminders').update({last_notified_key:notifyKey}).eq('id',raw.id)}}catch(e){console.error('Medicine notification error:',e.message)}}

const port=process.env.PORT||5000;app.listen(port,()=>{console.log(`API running on http://localhost:${port}`);setInterval(processMedicineNotifications,60000);processMedicineNotifications()});
