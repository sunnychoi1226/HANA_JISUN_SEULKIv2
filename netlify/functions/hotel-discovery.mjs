
import {reply,assertUser} from './_common.mjs';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];

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
  const timer=setTimeout(()=>ctrl.abort(),15000);
  try{
    const r=await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','User-Agent':'Hana-Incentive-Hotel-Tool/1.0'},
      body:'data='+encodeURIComponent(q),
      signal:ctrl.signal
    });
    if(!r.ok) throw new Error(`Overpass ${r.status}`);
    return await r.json();
  }finally{clearTimeout(timer);}
}

export async function handler(event){
  if(event.httpMethod!=='POST') return reply(405,{error:'POST only'});
  try{
    await assertUser(event);
    const {city='',region='',lat,lng,radius=18000}=JSON.parse(event.body||'{}');
    const y=Number(lat),x=Number(lng),r=Math.max(5000,Math.min(Number(radius)||18000,50000));
    if(!Number.isFinite(y)||!Number.isFinite(x)) return reply(400,{error:'도시 좌표가 필요합니다.'});

    const q=`[out:json][timeout:18];
(
  nwr["tourism"="hotel"](around:${r},${y},${x});
  nwr["tourism"="resort"](around:${r},${y},${x});
  nwr["building"="hotel"]["name"](around:${r},${y},${x});
);
out center tags;`;

    let data=null,last='';
    for(const ep of ENDPOINTS){
      try{data=await query(ep,q);if(data?.elements)break;}catch(e){last=e.message||String(e);}
    }
    if(!data?.elements) return reply(502,{error:'외부 호텔 검색 서버 응답 실패'+(last?` (${last})`:'')});

    const seen=new Set(),hotels=[];
    for(const el of data.elements){
      const t=el.tags||{};
      const name=t['name:en']||t.name||t['name:ko'];
      if(!name)continue;
      const hlat=Number(el.lat??el.center?.lat),hlng=Number(el.lon??el.center?.lon);
      if(!Number.isFinite(hlat)||!Number.isFinite(hlng))continue;
      const key=String(name).toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
      if(!key||seen.has(key))continue;
      seen.add(key);
      hotels.push({
        name,lat:hlat,lng:hlng,star_rating:parseStars(t),
        area_name:area(t),website:website(t),
        phone:t.phone||t['contact:phone']||'',
        email:t.email||t['contact:email']||'',
        osm_id:`${el.type}/${el.id}`
      });
    }
    return reply(200,{ok:true,city,region,count:hotels.length,hotels:hotels.slice(0,120)});
  }catch(e){
    return reply(500,{error:e.message});
  }
}
