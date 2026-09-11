
import {reply,sb,assertUser} from './_common.mjs';

export async function handler(event){
  try{
    await assertUser(event);
    if(event.httpMethod==='GET'){
      const city=(event.queryStringParameters?.city||'').trim();
      let path='hotels?select=*&order=city.asc,hotel_name.asc&limit=5000';
      if(city) path='hotels?city=eq.'+encodeURIComponent(city)+'&select=*&order=hotel_name.asc&limit=1000';
      const rows=await sb(path,{headers:{'Prefer':''}});
      return reply(200,{hotels:rows||[],count:(rows||[]).length});
    }
    return reply(405,{error:'GET only'});
  }catch(e){
    return reply(500,{error:e.message});
  }
}
