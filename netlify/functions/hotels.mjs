
import {reply,sb,assertUser} from './_common.mjs';

export async function handler(event){
  try{
    await assertUser(event);
    if(event.httpMethod==='GET'){
      const city=(event.queryStringParameters?.city||'').trim();
      let path='hotels?select=*&order=city.asc,hotel_name.asc&limit=5000';
      if(city) path='hotels?city=eq.'+encodeURIComponent(city)+'&select=*&order=hotel_name.asc&limit=1000';
      const rows=await sb(path,{headers:{'Prefer':''}});
      const qrows=await sb('quotes?select=hotel&limit=5000',{headers:{'Prefer':''}});
      const quote_history={};
      for(const q of (qrows||[])){
        const key=String(q.hotel||'').toLowerCase().replace(/\s+/g,' ').trim();
        if(key) quote_history[key]=(quote_history[key]||0)+1;
      }
      return reply(200,{hotels:rows||[],count:(rows||[]).length,quote_history});
    }
    return reply(405,{error:'GET only'});
  }catch(e){
    return reply(500,{error:e.message});
  }
}
