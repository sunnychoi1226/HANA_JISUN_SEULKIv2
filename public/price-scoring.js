(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.HotelPriceScoring=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function finitePositive(value){
    const n=Number(value);
    return Number.isFinite(n) && n>0 ? n : null;
  }

  function representativeRate(rateMin,rateMax){
    const min=finitePositive(rateMin);
    const max=finitePositive(rateMax);
    if(min && max) return (min+max)/2;
    return min || max || null;
  }

  function evaluatePriceFit({rateMin,rateMax,budget,tolerance=0}={}){
    const target=finitePositive(budget);
    const rate=representativeRate(rateMin,rateMax);
    const tol=Math.max(0,Number(tolerance)||0);
    const allowed=target ? target*(1+tol/100) : null;

    if(!target){
      return {known:Boolean(rate),rate,ratio:null,allowed,status:'no_budget',bucket:1,points:5,label:'예산 기준 없음',hardExclude:false};
    }
    if(!rate){
      return {known:false,rate:null,ratio:null,allowed,status:'unknown',bucket:1,points:5,label:'기준요금 확인 필요',hardExclude:false};
    }

    const ratio=rate/target;
    if(rate<=target){
      return {known:true,rate,ratio,allowed,status:'target',bucket:0,points:50,label:'목표예산 이내',hardExclude:false};
    }
    if(ratio<=1.10 && rate<=allowed){
      return {known:true,rate,ratio,allowed,status:'near',bucket:0,points:40,label:'목표예산 +10% 이내',hardExclude:false};
    }
    if(rate<=allowed){
      const span=Math.max(0.01,(allowed/target)-1.10);
      const progress=Math.min(1,Math.max(0,(ratio-1.10)/span));
      const points=Math.round((40-progress*15)*10)/10;
      return {known:true,rate,ratio,allowed,status:'tolerance',bucket:0,points,label:'허용 예산 이내',hardExclude:false};
    }

    const hardExclude=ratio>=1.5;
    return {
      known:true,rate,ratio,allowed,status:hardExclude?'excluded':'over',bucket:2,points:0,
      label:hardExclude?'예산 대비 50% 이상 초과 · 추천 제외':'허용 예산 초과 · 참고 후보',hardExclude
    };
  }

  return {representativeRate,evaluatePriceFit};
});
