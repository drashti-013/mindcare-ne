import {supabase,userFromRow} from '../utils/supabase.js';
export async function auth(req,res,next){
  try{
    const id=String(req.get('X-User-Id')||'').trim();
    if(!id)return res.status(401).json({message:'Login required'});
    const {data,error}=await supabase.from('users').select('*').eq('id',id).maybeSingle();
    if(error||!data)return res.status(401).json({message:'Login required'});
    const u=userFromRow(data); req.user={id:String(u.id),role:u.role,name:u.name}; next();
  }catch(e){return res.status(401).json({message:'Login required'})}
}
