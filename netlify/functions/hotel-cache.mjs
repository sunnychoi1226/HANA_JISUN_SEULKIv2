
import {reply,assertUser,sb} from './_common.mjs';

const CACHE_DAYS=30;
const MAX_RESULTS=30;

export async function handler(event){
  if(event.httpMethod!=='POST') return reply(405,{error:'POST only'});
  try{
    await assertUser(event);
    const {city='',region=''}=JSON.parse(event.body||'{}');
    const qcity=String(city).trim();
    const qregion=String(region).trim();
    if(!qcity) return reply(400,{error:'city required'});

    const since=new Date(Date.now()-CACHE_DAYS*86400000).toISOString();
    let path='hotel_discovery_cache?city_name=eq.'+encodeURIComponent(qcity);
    if(qregion) path+='&region=eq.'+encodeURIComponent(qregion);
    path+='&cached_at=gte.'+encodeURIComponent(since)+
      '&select=*&order=cached_at.desc&limit='+MAX_RESULTS;

    const rows=await sb(path,{headers:{'Prefer':''}});
    return reply(200,{
      ok:true,
      source:'cache',
      cache_days:CACHE_DAYS,
      count:Array.isArray(rows)?rows.length:0,
      hotels:Array.isArray(rows)?rows:[]
    });
  }catch(e){
    return reply(500,{error:e.message});
  }
}
