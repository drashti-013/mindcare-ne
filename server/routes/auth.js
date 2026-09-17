import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {supabase,userFromRow,userToRow} from '../utils/supabase.js';
import {auth} from '../middleware/auth.js';
const r=Router();
const safe=u=>({id:u.id||u._id,name:u.name,email:u.email,role:u.role,age:u.age,gender:u.gender,phone:u.phone,language:u.language,specialization:u.specialization,doctorId:u.doctorId,doctorRequestStatus:u.doctorRequestStatus,doctorDecisionNote:u.doctorDecisionNote,caregivers:u.caregivers||[]});
function cleanCaregivers(list){return (Array.isArray(list)?list:[]).slice(0,2).map(c=>({userId:c.userId||null,name:String(c.name||'').trim(),contact:String(c.contact||'').trim(),email:String(c.email||'').trim().toLowerCase(),gender:String(c.gender||'').trim()})).filter(c=>c.name||c.contact||c.email||c.gender)}
function handle(err,res){return res.status(500).json({message:err.message})}

r.get('/doctors',async(_,res)=>{try{const {data,error}=await supabase.from('users').select('id,name,email,specialization').eq('role','doctor').order('name',{ascending:true});if(error)throw error;res.json((data||[]).map(x=>({_id:x.id,...x})))}catch(e){handle(e,res)}});
r.get('/caregivers',async(_,res)=>{try{const {data,error}=await supabase.from('users').select('id,name,email,phone,gender').eq('role','caregiver').order('name',{ascending:true});if(error)throw error;res.json((data||[]).map(x=>({_id:x.id,...x})))}catch(e){handle(e,res)}});

r.post('/register',async(req,res)=>{try{
 const {name,email,password,role='patient',age,phone,gender,language,emergencyContact,specialization,doctorId,caregivers}=req.body;
 if(!name||!email||!password)return res.status(400).json({message:'Name, email and password are required'});
 const normalizedEmail=String(email).toLowerCase().trim();
 let q=await supabase.from('users').select('*').eq('email',normalizedEmail).maybeSingle(); if(q.error)throw q.error;if(q.data)return res.status(409).json({message:'Email already registered'});
 if(role==='patient'&&!doctorId)return res.status(400).json({message:'Please select a doctor for registration'});
 let doctor=null;if(role==='patient'){q=await supabase.from('users').select('*').eq('id',doctorId).eq('role','doctor').maybeSingle();if(q.error)throw q.error;doctor=q.data;if(!doctor)return res.status(400).json({message:'Selected doctor was not found'})}
 let caregiverList=cleanCaregivers(caregivers);const caregiverEmails=caregiverList.map(c=>c.email).filter(Boolean);
 if(caregiverEmails.length){q=await supabase.from('users').select('id,email').eq('role','caregiver').in('email',caregiverEmails);if(q.error)throw q.error;const map=new Map((q.data||[]).map(c=>[c.email,String(c.id)]));caregiverList=caregiverList.map(c=>({...c,userId:map.get(c.email)||c.userId}))}
 const linked=caregiverList.find(c=>c.userId)?.userId||null;
 const u={name,email:normalizedEmail,password:await bcrypt.hash(password,10),role,age:age??null,phone:phone??null,gender:gender??null,language:language||'English',emergencyContact,specialization,doctorId:doctor?.id||null,doctorRequestStatus:role==='patient'?'pending':'not_required',doctorRequestAt:role==='patient'?new Date().toISOString():null,caregiverId:linked,caregivers:caregiverList};
 q=await supabase.from('users').insert(userToRow(u)).select('*').single();if(q.error)throw q.error;const user=userFromRow(q.data);
 if(role==='patient')return res.status(201).json({message:'Registration request sent to your selected doctor. Wait for approval before logging in.',status:'pending',user:safe(user)});
 res.status(201).json({message:'Account created',user:safe(user)});
}catch(e){handle(e,res)}});

r.post('/login',async(req,res)=>{try{const email=String(req.body.email||'').toLowerCase().trim();const {data,error}=await supabase.from('users').select('*').eq('email',email).maybeSingle();if(error)throw error;const u=userFromRow(data);if(!u||!(await bcrypt.compare(req.body.password||'',u.password)))return res.status(401).json({message:'Invalid email or password'});if(u.role==='patient'&&u.doctorRequestStatus!=='accepted')return res.status(403).json({message:u.doctorRequestStatus==='denied'?'Your doctor denied the registration request. Please contact the doctor or register again.':'Your registration is waiting for doctor approval.'});res.json({user:safe(u)})}catch(e){handle(e,res)}});

r.get('/me',auth,async(req,res)=>{try{const {data,error}=await supabase.from('users').select('*').eq('id',req.user.id).maybeSingle();if(error)throw error;if(!data)return res.status(401).json({message:'Login required'});res.json({user:safe(userFromRow(data))})}catch(e){handle(e,res)}});
r.patch('/me',auth,async(req,res)=>{try{
 const allowed={name:'name',age:'age',phone:'phone',gender:'gender',language:'language',emergencyContact:'emergency_contact',specialization:'specialization'};
 const update={};for(const [k,col] of Object.entries(allowed)){if(req.body[k]!==undefined)update[col]=k==='age'?(req.body[k]===''?null:Number(req.body[k])):String(req.body[k]||'').trim()||null}
 if(update.name!==undefined&&!update.name)return res.status(400).json({message:'Name is required'});
 const {data,error}=await supabase.from('users').update(update).eq('id',req.user.id).select('*').single();if(error)throw error;
 res.json({message:'Profile updated successfully',user:safe(userFromRow(data))});
}catch(e){handle(e,res)}});

r.post('/logout',(_,res)=>res.json({ok:true}));
r.get('/doctor/requests',auth,async(req,res)=>{if(req.user.role!=='doctor')return res.status(403).json({message:'Doctors only'});const {data,error}=await supabase.from('users').select('id,name,email,age,phone,gender,language,caregivers,doctor_request_at,created_at').eq('role','patient').eq('doctor_id',req.user.id).eq('doctor_request_status','pending').order('doctor_request_at',{ascending:true});if(error)return handle(error,res);res.json((data||[]).map(x=>({...x,_id:x.id,doctorRequestAt:x.doctor_request_at,createdAt:x.created_at})))})
r.patch('/doctor/requests/:id',auth,async(req,res)=>{if(req.user.role!=='doctor')return res.status(403).json({message:'Doctors only'});const status=req.body.status;if(!['accepted','denied'].includes(status))return res.status(400).json({message:'Status must be accepted or denied'});const {data,error}=await supabase.from('users').update({doctor_request_status:status,doctor_decision_at:new Date().toISOString(),doctor_decision_note:String(req.body.note||'')}).eq('id',req.params.id).eq('role','patient').eq('doctor_id',req.user.id).select('*').maybeSingle();if(error)return handle(error,res);if(!data)return res.status(404).json({message:'Patient request not found'});res.json({message:`Patient request ${status}`,user:safe(userFromRow(data))})});
export default r;
