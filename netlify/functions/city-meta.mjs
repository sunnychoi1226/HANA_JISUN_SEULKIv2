
import {reply,assertUser,sb} from './_common.mjs';

export async function handler(event){
  if(event.httpMethod!=='POST') return reply(405,{error:'POST only'});
  try{
    await assertUser(event);
    const {city='',region=''}=JSON.parse(event.body||'{}');
    const q=String(city).trim();
    const r=String(region).trim();
    if(!q) return reply(400,{error:'city required'});

    let path='cities?city_name=eq.'+encodeURIComponent(q);
    if(r) path+='&region=eq.'+encodeURIComponent(r);
    path+='&select=city_name,region,country,currency,latitude,longitude,zoom&limit=1';

    const rows=await sb(path,{headers:{'Prefer':''}});
    return reply(200,{city:Array.isArray(rows)&&rows.length?rows[0]:null});
  }catch(e){
    return reply(500,{error:e.message});
  }
}
