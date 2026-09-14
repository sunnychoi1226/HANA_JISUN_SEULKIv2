
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
export function employee(event){
  return String(
    event.headers?.['x-employee-id'] ||
    event.headers?.['X-Employee-Id'] ||
    ''
  ).trim().toUpperCase();
}

export function validEmployeeFormat(id){
  return /^H[A-Z0-9]{4}$/.test(String(id||'').trim().toUpperCase());
}

export async function assertUser(event){
  const id = employee(event);
  if(!validEmployeeFormat(id)) throw new Error('H로 시작하는 5자리 사번 형식이 필요합니다.');

  const mode = String(process.env.AUTH_MODE || 'test').toLowerCase();

  // 개발/테스트 단계:
  // H로 시작하는 5자리 형식만 확인하고 바로 통과.
  if(mode !== 'production'){
    return {
      employee_id: id,
      name: id,
      department: 'TEST',
      active: true,
      auth_mode: 'test'
    };
  }

  // 실제 운영 단계:
  // Supabase users 테이블에 active=true로 등록된 사번만 통과.
  const rows = await sb(
    'users?employee_id=eq.' + encodeURIComponent(id) + '&active=eq.true&select=employee_id,name,department,active',
    {headers:{'Prefer':''}}
  );
  if(!Array.isArray(rows) || !rows.length) throw new Error('접근 권한이 없는 사번입니다.');

  return {...rows[0], auth_mode:'production'};
}
