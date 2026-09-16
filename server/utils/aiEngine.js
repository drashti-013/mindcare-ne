import fs from 'fs';
import path from 'path';

// Lightweight, explainable ML prototype: logistic regression trained at server startup
// on the bundled synthetic cognitive dataset. This is for competition/demo use only.
const sigmoid = x => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))));
let model = null;

function csvRows(file) {
  const text = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const header = text.shift().split(',');
  return text.map(line => {
    const values = line.split(',');
    return Object.fromEntries(header.map((h,i) => [h, Number(values[i])]));
  });
}

function train() {
  const file = path.join(process.cwd(), 'data', 'cognitive_dataset.csv');
  const rows = csvRows(file);
  const features = ['memory','attention','orientation','language','reactionTimeMs','gameAccuracy','sleepHours','medicationAdherence'];
  const X = rows.map(r => features.map(f => Number(r[f])));
  const y = rows.map(r => Number(r.supportPriority));
  const mean = features.map((_,j) => X.reduce((s,r)=>s+r[j],0)/X.length);
  const std = features.map((_,j) => Math.sqrt(X.reduce((s,r)=>s+(r[j]-mean[j])**2,0)/X.length)||1);
  const Z = X.map(r=>r.map((v,j)=>(v-mean[j])/std[j]));
  let w = Array(features.length).fill(0), b = 0;
  const lr = 0.08;
  for(let epoch=0;epoch<700;epoch++){
    const gw=Array(features.length).fill(0); let gb=0;
    Z.forEach((r,i)=>{const p=sigmoid(r.reduce((s,v,j)=>s+v*w[j],b));const e=p-y[i];r.forEach((v,j)=>gw[j]+=e*v);gb+=e;});
    w=w.map((v,j)=>v-lr*gw[j]/Z.length); b-=lr*gb/Z.length;
  }
  model={features,mean,std,w,b,trainedOn:rows.length};
}

export function initAI(){ try{train(); console.log(`AI model trained on ${model.trainedOn} cognitive records`);}catch(e){console.warn('AI model training skipped:',e.message);} }

export function cognitivePrediction(input){
  if(!model) initAI();
  const z=model.features.map((f,j)=>(Number(input[f]??0)-model.mean[j])/model.std[j]);
  const probability=sigmoid(z.reduce((s,v,j)=>s+v*model.w[j],model.b));
  const priority=probability>=0.67?'High':probability>=0.34?'Moderate':'Low';
  const reasons=[];
  if(Number(input.memory)<6) reasons.push('memory score below the demo baseline');
  if(Number(input.attention)<6) reasons.push('attention score below the demo baseline');
  if(Number(input.gameAccuracy)<65) reasons.push('recent game accuracy is lower');
  if(Number(input.medicationAdherence)<70) reasons.push('medicine adherence is lower');
  const action = priority==='High' ? 'Consider a timely caregiver/clinician review and repeat the check-in to confirm whether the pattern persists.' : priority==='Moderate' ? 'Keep the daily routine active, use memory games and medicine reminders, and repeat the check-in regularly.' : 'Continue regular cognitive activities, sleep/routine support and medicine reminders while monitoring changes over time.';
  const recommendation = reasons.length ? 'The result is driven by observable signals from the check-in and recent routine data: '+reasons.join(', ')+'.' : 'The current combination of signals does not show a strong demo-level support flag.';
  return {probability:Number(probability.toFixed(3)),priority,reasons,action,recommendation,model:'Logistic Regression',trainedOn:model.trainedOn};
}

export function medicationAdherence(reminders){
  const total=reminders.length;
  if(!total) return {score:100,risk:'Low',message:'No medicines scheduled yet.'};
  const taken=reminders.filter(r=>r.taken).length;
  const score=Math.round((taken/total)*100);
  const risk=score<50?'High':score<80?'Moderate':'Low';
  return {score,risk,message:risk==='Low'?'Routine looks consistent.':'Consider caregiver follow-up for missed doses.'};
}
