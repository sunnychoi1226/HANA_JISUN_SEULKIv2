
import {reply,assertUser} from './_common.mjs';

function getOutputText(j){
  if(j.output_text) return j.output_text;
  for(const item of (j.output||[])) for(const c of (item.content||[])) if(c.type==='output_text'&&c.text) return c.text;
  return '';
}
export async function handler(event){
  if(event.httpMethod!=='POST') return reply(405,{error:'POST only'});
  try{
    await assertUser(event);
    const {text='',context={}}=JSON.parse(event.body||'{}');
    if(!text.trim()) return reply(400,{error:'호텔 회신 본문이 필요합니다.'});
    const key=process.env.OPENAI_API_KEY; if(!key) return reply(500,{error:'OPENAI_API_KEY 환경변수가 필요합니다.'});
    const schema={
      type:'object',additionalProperties:false,
      properties:{
        hotel:{type:['string','null']},currency:{type:['string','null']},room_rate:{type:['number','null']},
        twin_rate:{type:['number','null']},single_rate:{type:['number','null']},king_rate:{type:['number','null']},
        tax_pct:{type:['number','null']},tax_flat:{type:['number','null']},tax_included:{type:['boolean','null']},
        resort_fee:{type:['number','null']},breakfast_included:{type:['boolean','null']},breakfast_pp:{type:['number','null']},
        porterage_pp:{type:['number','null']},comp_room_nights:{type:['number','null']},commission_pct:{type:['number','null']},
        option_date:{type:['string','null']},cancellation:{type:['string','null']},payment_terms:{type:['string','null']},
        attrition:{type:['string','null']},other_terms:{type:['string','null']},summary:{type:'string'}
      },
      required:['hotel','currency','room_rate','twin_rate','single_rate','king_rate','tax_pct','tax_flat','tax_included','resort_fee','breakfast_included','breakfast_pp','porterage_pp','comp_room_nights','commission_pct','option_date','cancellation','payment_terms','attrition','other_terms','summary']
    };
    const prompt=`You extract hotel group quotation terms for a Korean travel company's incentive-group workflow.
Return only facts explicitly supported by the hotel reply. Never guess missing values; use null.
Normalize dates to YYYY-MM-DD only when unambiguous. Percentages are numeric percentage points.
"++" should not be converted into an invented tax rate; if exact tax percentage is not stated, tax_pct=null and explain ++ in other_terms.
Context: ${JSON.stringify(context)}
Hotel reply:
${text}`;
    const body={
      model:process.env.OPENAI_MODEL||'gpt-5.6-luna',
      input:prompt,
      store:false,
      text:{format:{type:'json_schema',name:'hotel_quote',strict:true,schema}}
    };
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||'AI API 오류');
    const out=getOutputText(j); const extracted=JSON.parse(out);
    return reply(200,{ok:true,extracted});
  }catch(e){return reply(500,{error:e.message});}
}
