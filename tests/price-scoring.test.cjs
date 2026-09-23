const assert=require('node:assert/strict');
const {evaluatePriceFit}=require('../public/price-scoring.js');

const budget=110;

let fit=evaluatePriceFit({rateMin:95,rateMax:105,budget,tolerance:20});
assert.equal(fit.bucket,0);
assert.equal(fit.points,50);

fit=evaluatePriceFit({rateMin:115,rateMax:125,budget,tolerance:20});
assert.equal(fit.bucket,0);
assert.equal(fit.points,40);

fit=evaluatePriceFit({rateMin:125,rateMax:131,budget,tolerance:20});
assert.equal(fit.bucket,0);
assert.ok(fit.points>=25 && fit.points<40);

fit=evaluatePriceFit({rateMin:330,rateMax:390,budget,tolerance:20});
assert.equal(fit.bucket,2);
assert.equal(fit.points,0);
assert.equal(fit.hardExclude,true);

fit=evaluatePriceFit({rateMin:null,rateMax:null,budget,tolerance:20});
assert.equal(fit.bucket,1);
assert.equal(fit.points,5);

console.log('price scoring tests passed');

