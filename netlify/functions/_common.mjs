
const JSON_HEADERS = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
export function reply(statusCode, body){ return {statusCode, headers:JSON_HEADERS, body:JSON.stringify(body)}; }
export function env(){
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  return {url:url.replace(/\/$/,''), key};
}
export async function sb(path, options={}){
  const {url,key}=env();
  const headers=Object.assign({'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'return=representation'},options.headers||{});
  const r=await fetch(url+'/rest/v1/'+path,Object.assign({},options,{headers}));
  const text=await r.text(); let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok) throw new Error((data&&data.message)||text||('Supabase '+r.status));
  return data;
}
export function employee(event){ return String(event.headers?.['x-employee-id']||event.headers?.['X-Employee-Id']||'').trim().toUpperCase(); }
export async function assertUser(event){
  const id=employee(event);
  if(!/^H(\d{4}|[B-I]\d{3})$/.test(id)) throw new Error('로그인이 필요합니다.');
  const rows=await sb('users?employee_id=eq.'+encodeURIComponent(id)+'&active=eq.true&select=employee_id,name,department,active',{headers:{'Prefer':''}});
  if(!Array.isArray(rows)||!rows.length) throw new Error('접근 권한이 없는 사번입니다.');
  return rows[0];
}
