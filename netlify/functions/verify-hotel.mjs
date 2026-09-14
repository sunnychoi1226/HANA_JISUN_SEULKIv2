
import {reply,sb,assertUser} from './_common.mjs';

function norm(s){return String(s||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9가-힣]/g,'');}
function outputText(j){
  if(j.output_text)return j.output_text;
  for(const item of (j.output||[])) for(const c of (item.content||[])) if(c.type==='output_text'&&c.text)return c.text;
  return '';
}
function cleanJson(s){
  return String(s||'').trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'');
}
export async function handler(event){
  if(event.httpMethod!=='POST')return reply(405,{error:'POST only'});
  try{
    const user=await assertUser(event);
    const {hotel={}}=JSON.parse(event.body||'{}');
    const name=String(hotel.name||'').trim(), city=String(hotel.city||'').trim(), country=String(hotel.country||'').trim();
    if(!name)return reply(400,{error:'호텔명이 필요합니다.'});
    const key=norm(name)+'__'+norm(city);
    const cached=await sb('hotel_verifications?hotel_key=eq.'+encodeURIComponent(key)+'&select=*',{headers:{'Prefer':''}});
    if(cached?.length){
      const age=Date.now()-new Date(cached[0].verified_at).getTime();
      if(age < 30*86400000) return reply(200,{cached:true,verification:cached[0]});
    }
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey)return reply(500,{error:'OPENAI_API_KEY 환경변수가 필요합니다.'});
    const prompt=`Verify this real hotel for an incentive-group hotel sourcing workflow.
Hotel: ${name}
City: ${city}
Country/region: ${country}
Possible website from OpenStreetMap: ${hotel.website||'(none)'}

Use web search. Prioritize the hotel's official website or official hotel-chain website.
Find ONLY information supported by sources. Never estimate or invent.
Need:
- official_name
- star_rating only if an authoritative/official source clearly states it, otherwise null
- total_rooms
- largest_event_capacity (largest clearly stated reception/theater/banquet capacity; null if not found)
- official_url
- group_sales_email only if publicly shown by official/authoritative source
- address
- notes: short operational note, including what could not be verified
- sources: up to 5 source objects with title and url

Return ONLY valid JSON with keys:
official_name, star_rating, total_rooms, largest_event_capacity, official_url, group_sales_email, address, notes, sources.
Use null for unknown values.`;
    const body={
      model:process.env.OPENAI_WEB_MODEL||process.env.OPENAI_MODEL||'gpt-5.6-luna',
      tools:[{type:'web_search'}],
      include:['web_search_call.action.sources'],
      input:prompt,
      store:false
    };
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error?.message||'웹 검증 API 오류');
    let v;
    try{v=JSON.parse(cleanJson(outputText(j)));}catch{throw new Error('공식정보 검증 결과를 구조화하지 못했습니다. 다시 시도해 주세요.');}
    const row={
      hotel_key:key,hotel_name:name,city,country,
      official_name:v.official_name||name,
      star_rating:v.star_rating??null,total_rooms:v.total_rooms??null,
      largest_event_capacity:v.largest_event_capacity??null,
      official_url:v.official_url||hotel.website||null,
      group_sales_email:v.group_sales_email||null,address:v.address||null,
      notes:v.notes||'',sources:Array.isArray(v.sources)?v.sources:[],
      verified_at:new Date().toISOString(),verified_by:user.employee_id
    };
    await sb('hotel_verifications?hotel_key=eq.'+encodeURIComponent(key),{method:'DELETE'});
    const saved=await sb('hotel_verifications',{method:'POST',body:JSON.stringify(row)});
    return reply(200,{cached:false,verification:saved?.[0]||row});
  }catch(e){return reply(500,{error:e.message});}
}
