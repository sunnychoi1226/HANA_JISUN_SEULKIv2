
import {reply,assertUser,sb} from './_common.mjs';

const ENDPOINTS=[
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];
const CACHE_DAYS=30;
const MAX_RESULTS=30;

function parseStars(tags={}){
  const raw=String(tags.stars||tags['hotel:stars']||'').match(/[1-5]/);
  return raw ? Number(raw[0]) : null;
}
function area(tags={}){
  return tags['addr:suburb']||tags['addr:district']||tags['addr:city']||tags['addr:street']||'';
}
function website(tags={}){
  return tags.website||tags['contact:website']||tags.url||'';
}
async function query(endpoint,q){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),3500);
  try{
    const r=await fetch(endpoint,{
      method:'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent':'Hana-Incentive-Hotel-Tool/1.0'
      },
      body:'data='+encodeURIComponent(q),
      signal:ctrl.signal
    });
    if(!r.ok) throw new Error(`Overpass ${r.status}`);
    return await r.json();
  }finally{clearTimeout(timer);}
}
function mapCache(x){
  return {
    name:x.hotel_name,
    lat:x.latitude,
    lng:x.longitude,
    star_rating:x.star_rating,
    area_name:x.area_name||'',
    website:x.website||'',
    phone:x.phone||'',
    email:x.email||'',
    osm_id:x.osm_id||''
  };
}

export async function handler(event){
  if(event.httpMethod!=='POST') return reply(405,{error:'POST only'});
  try{
    await assertUser(event);
    const {city='',region='',lat,lng,radius=18000,forceExternal=false}=JSON.parse(event.body||'{}');
    const qcity=String(city).trim(), qregion=String(region).trim();
    if(!qcity) return reply(400,{error:'도시명이 필요합니다.'});

    // 1) 일반 호출은 30일 캐시 우선. 프론트에서 forceExternal=true면 신규 검색만 수행.
    if(!forceExternal){
      const since=new Date(Date.now()-CACHE_DAYS*86400000).toISOString();
      const cached=await sb(
        'hotel_discovery_cache?city_name=eq.'+encodeURIComponent(qcity)+
        '&region=eq.'+encodeURIComponent(qregion)+
        '&cached_at=gte.'+encodeURIComponent(since)+
        '&select=*&order=cached_at.desc&limit='+MAX_RESULTS,
        {headers:{'Prefer':''}}
      );

      if(Array.isArray(cached) && cached.length){
        return reply(200,{
          ok:true,
          source:'cache',
          cache_days:CACHE_DAYS,
          count:cached.length,
          hotels:cached
        });
      }
    }

    // 2) 캐시 없을 때만 Overpass
    const y=Number(lat),x=Number(lng),r=Math.max(5000,Math.min(Number(radius)||18000,50000));
    if(!Number.isFinite(y)||!Number.isFinite(x)) return reply(400,{error:'도시 좌표가 필요합니다.'});

    const oq=`[out:json][timeout:10];
(
  nwr["tourism"="hotel"](around:${r},${y},${x});
  nwr["tourism"="resort"](around:${r},${y},${x});
  nwr["building"="hotel"]["name"](around:${r},${y},${x});
);
out center tags;`;

    let data=null,last='';
    for(const ep of ENDPOINTS.slice(0,2)){
      try{
        data=await query(ep,oq);
        if(data?.elements) break;
      }catch(e){last=e.message||String(e);}
    }
    if(!data?.elements){
      return reply(502,{error:'외부 호텔 검색 서버 응답 실패'+(last?` (${last})`:'')});
    }

    const seen=new Set(),hotels=[];
    for(const el of data.elements){
      if(hotels.length>=MAX_RESULTS) break;
      const t=el.tags||{};
      const name=t['name:en']||t.name||t['name:ko'];
      if(!name) continue;
      const hlat=Number(el.lat??el.center?.lat),hlng=Number(el.lon??el.center?.lon);
      if(!Number.isFinite(hlat)||!Number.isFinite(hlng)) continue;
      const key=String(name).toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
      if(!key||seen.has(key)) continue;
      seen.add(key);
      hotels.push({
        name,lat:hlat,lng:hlng,star_rating:parseStars(t),
        area_name:area(t),website:website(t),
        phone:t.phone||t['contact:phone']||'',
        email:t.email||t['contact:email']||'',
        osm_id:`${el.type}/${el.id}`
      });
    }

    // 3) 새 결과 캐시 저장
    try{
      await sb(
        'hotel_discovery_cache?city_name=eq.'+encodeURIComponent(qcity)+
        '&region=eq.'+encodeURIComponent(qregion),
        {method:'DELETE'}
      );
      if(hotels.length){
        const rows=hotels.map(h=>({
          city_name:qcity,
          region:qregion,
          hotel_name:h.name,
          latitude:h.lat,
          longitude:h.lng,
          star_rating:h.star_rating,
          area_name:h.area_name,
          website:h.website,
          phone:h.phone,
          email:h.email,
          osm_id:h.osm_id,
          cached_at:new Date().toISOString()
        }));
        await sb('hotel_discovery_cache',{method:'POST',body:JSON.stringify(rows)});
      }
    }catch(e){
      console.warn('hotel cache save failed',e.message);
    }

    return reply(200,{
      ok:true,
      source:'overpass',
      cache_days:CACHE_DAYS,
      count:hotels.length,
      hotels
    });
  }catch(e){
    return reply(500,{error:e.message});
  }
}
