const fs=require('node:fs'), assert=require('node:assert/strict');
const source=fs.readFileSync('src-mod/com/company/assembleegameclient/game/MapUserInput.as','utf8');
const body=source.match(/private function onEnterFrame\(param1:Event\) : void\s*\{([\s\S]*?)\n      \}/)[1]
 .replace(/var (\w+):(Number|Player|GameObject)/g,'var $1');
const frame=new Function('Parameters','doneAction','getTimer',body);
let shots=[],lookups=0;
const player={x_:0,y_:0,isPaused:()=>false,isUnstable:()=>false,attemptAttackAngle:a=>shots.push(a)};
const parameters={data_:{labAutoNexus:false,cameraAngle:0}};
const ctx={mouseDown_:true,enablePlayerInput_:true,autofire_:true,labCheckIdentity(){return true;},
 gs_:{map:{player_:player,cursorX_:0,cursorY_:1,sampleMousePosition(){}},isGroupStunActive:()=>false},
 labTarget(){lookups++;return {x_:5,y_:0};},updateLabFollow(){},updateLabLoot(){},updateLabAutoAbility(){}};
const run=()=>frame.call(ctx,parameters,()=>{},()=>10000);
run();run();assert.deepEqual(shots,[Math.PI/2,Math.PI/2]);assert.equal(lookups,0);
ctx.gs_.map.cursorX_=-1;ctx.gs_.map.cursorY_=0;run();assert.equal(shots.at(-1),Math.PI);
ctx.mouseDown_=false;run();assert.equal(shots.at(-1),0);assert.equal(lookups,1);
ctx.mouseDown_=true;ctx.enablePlayerInput_=false;const count=shots.length;run();assert.equal(shots.length,count);
ctx.enablePlayerInput_=true;ctx.gs_.isGroupStunActive=()=>true;run();assert.equal(shots.length,count);
ctx.gs_.isGroupStunActive=()=>false;parameters.data_.cameraAngle=Math.PI/2;run();assert.equal(shots.at(-1),Math.PI);
ctx.mouseDown_=false;run();assert.equal(shots.at(-1),-Math.PI/2);
ctx.mouseDown_=true;ctx.autofire_=false;run();assert.equal(shots.at(-1),Math.PI);
console.log('Manual aim checks passed: held click overrides continuously, cursor changes, no target lookup while held, release resumes, camera and input/stun guards.');
