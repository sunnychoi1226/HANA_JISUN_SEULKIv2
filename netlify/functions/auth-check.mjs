
import {reply,sb} from './_common.mjs';
export async function handler(event){
  if(event.httpMethod!=='POST') return reply(405,{error:'POST only'});
  try{
    const {employee_id=''}=JSON.parse(event.body||'{}'); const id=String(employee_id).trim().toUpperCase();
    if(!/^H(\d{4}|[B-I]\d{3})$/.test(id)) return reply(400,{error:'올바른 사번 형식을 입력해 주세요.'});
    const rows=await sb('users?employee_id=eq.'+encodeURIComponent(id)+'&active=eq.true&select=employee_id,name,department,active',{headers:{'Prefer':''}});
    if(!Array.isArray(rows)||!rows.length) return reply(403,{error:'접근 권한이 없는 사번입니다.'});
    return reply(200,{ok:true,user:rows[0]});
  }catch(e){ return reply(500,{error:e.message}); }
}
