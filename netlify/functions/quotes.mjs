
import {reply,sb,assertUser} from './_common.mjs';

function toDb(q,user){
  return {
    id:q.id,event_name:q.event_name||'',status:q.status||'견적수신',hotel:q.hotel||'',city:q.city||'',cur:q.cur||'USD',
    nights:+q.nights||0,r1:+q.r1||0,rate1:+q.rate1||0,r2:+q.r2||0,rate2:+q.rate2||0,guests:+q.guests||0,
    tax_pct:+q.taxPct||0,tax_flat:+q.taxFlat||0,fee:+q.fee||0,bf_pp:+q.bfPP||0,bf_days:+q.bfDays||0,
    porter:+q.porter||0,comp:+q.comp||0,comm:+q.comm||0,option_date:q.option||null,note:q.note||'',
    tax_incl:!!q.taxIncl,fee_taxed:!!q.feeTaxed,bf_incl:!!q.bfIncl,source:q.source||'manual',
    updated_by:user.employee_id,updated_at:new Date().toISOString()
  };
}
function fromDb(x){
  return {id:x.id,event_name:x.event_name,status:x.status,hotel:x.hotel,city:x.city,cur:x.cur,nights:x.nights,r1:x.r1,rate1:x.rate1,r2:x.r2,rate2:x.rate2,guests:x.guests,
    taxPct:x.tax_pct,taxFlat:x.tax_flat,fee:x.fee,bfPP:x.bf_pp,bfDays:x.bf_days,porter:x.porter,comp:x.comp,comm:x.comm,option:x.option_date||'',note:x.note||'',
    taxIncl:x.tax_incl,feeTaxed:x.fee_taxed,bfIncl:x.bf_incl,source:x.source,created_by:x.created_by,updated_by:x.updated_by,created_at:x.created_at,updated_at:x.updated_at};
}
export async function handler(event){
  try{
    const user=await assertUser(event);
    if(event.httpMethod==='GET'){
      const rows=await sb('quotes?select=*&order=updated_at.desc&limit=1000',{headers:{'Prefer':''}});
      return reply(200,{quotes:(rows||[]).map(fromDb)});
    }
    if(event.httpMethod==='POST'){
      const {quote}=JSON.parse(event.body||'{}'); if(!quote?.id||!quote?.hotel) return reply(400,{error:'견적 정보가 부족합니다.'});
      const existing=await sb('quotes?id=eq.'+encodeURIComponent(quote.id)+'&select=id,created_by',{headers:{'Prefer':''}});
      const row=toDb(quote,user);
      if(existing?.length){
        await sb('quotes?id=eq.'+encodeURIComponent(quote.id),{method:'PATCH',body:JSON.stringify(row)});
      }else{
        row.created_by=user.employee_id; row.created_at=new Date().toISOString();
        await sb('quotes',{method:'POST',body:JSON.stringify(row)});
      }
      // immutable snapshot history
      await sb('quote_history',{method:'POST',body:JSON.stringify({
        quote_id:quote.id,action:existing?.length?'update':'create',snapshot:row,changed_by:user.employee_id
      })});
      return reply(200,{ok:true,id:quote.id});
    }
    if(event.httpMethod==='DELETE'){
      const id=event.queryStringParameters?.id; if(!id)return reply(400,{error:'id가 필요합니다.'});
      const before=await sb('quotes?id=eq.'+encodeURIComponent(id)+'&select=*',{headers:{'Prefer':''}});
      await sb('quotes?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
      await sb('quote_history',{method:'POST',body:JSON.stringify({quote_id:id,action:'delete',snapshot:before?.[0]||{},changed_by:user.employee_id})});
      return reply(200,{ok:true});
    }
    return reply(405,{error:'Unsupported method'});
  }catch(e){return reply(500,{error:e.message});}
}
