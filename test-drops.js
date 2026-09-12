const assert=require('node:assert/strict');
const {dropName,percent,matchBoss}=require('./drops/app.js');
assert.equal(dropName({tier:'14',itemType:'Weapon'}),'Weapon · T14');
assert.equal(percent('0.01'),'1%');assert.equal(percent('1'),'100%');
const b={id:'Septavius',displayId:'Septavius',drops:[{item:'Potion of Defense'},{tier:'5',itemType:'Ring'}]};
assert.equal(matchBoss(b,'septáv'),true);assert.equal(matchBoss(b,'potion'),true);assert.equal(matchBoss(b,'ring'),true);assert.equal(matchBoss(b,'malphas'),false);
console.log('Drop explorer search, tier groups and probability formatting passed.');
