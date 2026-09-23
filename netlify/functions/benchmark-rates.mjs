import {reply,assertUser,sb} from './_common.mjs';

function norm(s){
  return String(s||'').toLowerCase()
    .replace(/&/g,'and')
    .replace(/\b(hotel|resort|spa|the|a|an|by|and|of|at)\b/g,'')
    .replace(/[^a-z0-9가-힣]/g,'');
}

function keyFor(hotel,city){ return `${norm(hotel)}__${norm(city)}`; }
function dateOnly(value){ return /^\d{4}-\d{2}-\d{2}$/.test(String(value||'')) ? String(value) : ''; }

export async function handler(event){
  try{
    const user=await assertUser(event);

    if(event.httpMethod==='GET'){
      const city=String(event.queryStringParameters?.city||'').trim();
      if(!city) return reply(400,{error:'city required'});
      const rows=await sb(
        'hotel_benchmark_rates?city=eq.'+encodeURIComponent(city)+
        '&select=*&order=searched_at.desc&limit=1000',
        {headers:{'Prefer':''}}
      );
      const latest={}, all=Array.isArray(rows)?rows:[];
      for(const row of all){
        if(row.hotel_key && !latest[row.hotel_key]) latest[row.hotel_key]=row;
      }
      return reply(200,{rates:Object.values(latest),history_count:all.length});
    }

    if(event.httpMethod==='POST'){
      const body=JSON.parse(event.body||'{}');
      const hotelName=String(body.hotel_name||'').trim();
      const city=String(body.city||'').trim();
      const currency=String(body.currency||'').trim().toUpperCase();
      const rateMin=Number(body.rate_min);
      const rateMax=Number(body.rate_max||body.rate_min);
      const roomName=String(body.room_name||'').trim();
      const stayDate=dateOnly(body.stay_date);
      const checkoutDate=dateOnly(body.checkout_date);
      const sourceName=String(body.source_name||'').trim();

      if(!hotelName||!city||!currency||!roomName||!stayDate||!checkoutDate||!sourceName){
        return reply(400,{error:'호텔·객실명·도시·통화·숙박일·출처는 필수입니다.'});
      }
      if(!(rateMin>0) || !(rateMax>=rateMin)){
        return reply(400,{error:'최대 요금은 최소 요금보다 같거나 커야 합니다.'});
      }
      if(new Date(checkoutDate)<=new Date(stayDate)){
        return reply(400,{error:'체크아웃일은 체크인일보다 뒤여야 합니다.'});
      }

      const row={
        hotel_key:keyFor(hotelName,city), hotel_name:hotelName, city, currency,
        rate_min:rateMin, rate_max:rateMax,
        room_name:roomName,
        stay_date:stayDate, checkout_date:checkoutDate,
        adults:Math.max(1,Number(body.adults)||2),
        children:Math.max(0,Number(body.children)||0),
        rooms:Math.max(1,Number(body.rooms)||1),
        meal_plan:String(body.meal_plan||'room_only'),
        tax_included:body.tax_included===true ? true : (body.tax_included===false ? false : null),
        source_name:sourceName,
        source_url:String(body.source_url||'').trim()||null,
        searched_at:new Date().toISOString(),
        created_by:user.employee_id,
        updated_at:new Date().toISOString()
      };
      const saved=await sb(
        'hotel_benchmark_rates?on_conflict=hotel_key,stay_date,source_name',
        {method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)}
      );
      return reply(200,{ok:true,rate:saved?.[0]||row});
    }

    return reply(405,{error:'GET or POST only'});
  }catch(e){
    return reply(500,{error:e.message});
  }
}
