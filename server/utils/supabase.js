import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY;
if(!url||!key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
export const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

export const userFromRow=u=>u?({
  _id:u.id,id:u.id,name:u.name,email:u.email,password:u.password,role:u.role,age:u.age,phone:u.phone,gender:u.gender,
  language:u.language,emergencyContact:u.emergency_contact,specialization:u.specialization,doctorId:u.doctor_id,
  doctorRequestStatus:u.doctor_request_status,doctorRequestAt:u.doctor_request_at,doctorDecisionAt:u.doctor_decision_at,
  doctorDecisionNote:u.doctor_decision_note,caregiverId:u.caregiver_id,caregivers:u.caregivers||[],createdAt:u.created_at
}):null;
export const userToRow=u=>({name:u.name,email:u.email,password:u.password,role:u.role,age:u.age??null,phone:u.phone??null,gender:u.gender??null,language:u.language??'English',emergency_contact:u.emergencyContact??null,specialization:u.specialization??null,doctor_id:u.doctorId??null,doctor_request_status:u.doctorRequestStatus??'not_required',doctor_request_at:u.doctorRequestAt??null,doctor_decision_at:u.doctorDecisionAt??null,doctor_decision_note:u.doctorDecisionNote??null,caregiver_id:u.caregiverId??null,caregivers:u.caregivers??[]});

export function assessmentFromRow(x){return x?({...x,_id:x.id,userId:x.user_id,gameAccuracy:x.game_accuracy,reactionTimeMs:x.reaction_time_ms,aiRisk:x.ai_risk,aiProbability:x.ai_probability,aiReasons:x.ai_reasons||[],aiRecommendation:x.ai_recommendation,aiAction:x.ai_action,createdAt:x.created_at}):null}
export function gameFromRow(x){return x?({...x,_id:x.id,userId:x.user_id,createdAt:x.created_at}):null}
export function reminderFromRow(x){return x?({...x,_id:x.id,userId:x.user_id,notifyEmail:x.notify_email,notifySms:x.notify_sms,lastNotifiedKey:x.last_notified_key,takenAt:x.taken_at,missedCount:x.missed_count,createdAt:x.created_at}):null}
export function alertFromRow(x){return x?({...x,_id:x.id,patientId:x.patient_id,acknowledgedAt:x.acknowledged_at,resolvedAt:x.resolved_at,createdAt:x.created_at}):null}
