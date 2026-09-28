
import {reply,sb,validEmployeeFormat} from './_common.mjs';

export async function handler(event){
  if(event.httpMethod!=='POST') return reply(405,{error:'POST only'});

  try{
    const {employee_id=''} = JSON.parse(event.body||'{}');
    const id = String(employee_id).trim().toUpperCase();

    if(!validEmployeeFormat(id)){
      return reply(400,{error:'H로 시작하는 총 5자리 형식으로 입력해 주세요.'});
    }

    const mode = String(process.env.AUTH_MODE || 'test').toLowerCase();

    // 개발/테스트 단계: 형식만 확인
    if(mode !== 'production'){
      return reply(200,{
        ok:true,
        auth_mode:'test',
        user:{
          employee_id:id,
          name:id,
          department:'TEST',
          active:true
        }
      });
    }

    // 실제 운영 단계: Supabase users 화이트리스트 확인
    const rows = await sb(
      'users?employee_id=eq.'+encodeURIComponent(id)+'&active=eq.true&select=employee_id,name,department,active',
      {headers:{'Prefer':''}}
    );

    if(!Array.isArray(rows)||!rows.length){
      return reply(403,{error:'접근 권한이 없는 사번입니다.'});
    }

    return reply(200,{ok:true,auth_mode:'production',user:rows[0]});
  }catch(e){
    return reply(500,{error:e.message});
  }
}
