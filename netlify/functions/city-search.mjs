
import {reply,assertUser,sb} from './_common.mjs';

export async function handler(event){
  if(event.httpMethod!=='POST') return reply(405,{error:'POST only'});
  try{
    await assertUser(event);
    const {city='',region=''}=JSON.parse(event.body||'{}');
    const q=String(city).trim();
    if(!q) return reply(400,{error:'도시명을 입력해 주세요.'});

    const endpoint=new URL('https://nominatim.openstreetmap.org/search');
    endpoint.searchParams.set('q',q);
    endpoint.searchParams.set('format','jsonv2');
    endpoint.searchParams.set('addressdetails','1');
    endpoint.searchParams.set('limit','5');
    endpoint.searchParams.set('accept-language','ko,en');

    const contact=process.env.APP_CONTACT_EMAIL || 'hotel-tool@example.invalid';
    const r=await fetch(endpoint,{
      headers:{
        'User-Agent':`Hana-Incentive-Hotel-Tool/1.0 (${contact})`,
        'Accept':'application/json'
      }
    });
    if(!r.ok) throw new Error('도시 위치 검색에 실패했습니다.');
    const list=await r.json();
    if(!Array.isArray(list)||!list.length) return reply(404,{error:'도시 위치를 찾지 못했습니다.'});

    const preferred=list.find(x=>['city','town','municipality','administrative'].includes(x.type)) || list[0];
    const a=preferred.address||{};
    const cityRow={
      city_name:q,
      region:region||'미분류',
      country:a.country||'',
      currency:null,
      latitude:Number(preferred.lat),
      longitude:Number(preferred.lon),
      zoom:11,
      source_type:'nominatim'
    };

    try{
      await sb(
        'cities?city_name=eq.'+encodeURIComponent(q)+'&region=eq.'+encodeURIComponent(region||'미분류'),
        {method:'DELETE'}
      );
      await sb('cities',{method:'POST',body:JSON.stringify(cityRow)});
    }catch(e){
      console.warn('city cache save failed',e.message);
    }

    return reply(200,{
      city:{
        query:q,
        lat:Number(preferred.lat),
        lng:Number(preferred.lon),
        display_name:preferred.display_name,
        country:a.country||'',
        country_code:a.country_code||'',
        state:a.state||a.region||'',
        matched_type:preferred.type||'',
        region_hint:region||''
      }
    });
  }catch(e){
    return reply(500,{error:e.message});
  }
}
