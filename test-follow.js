const fs = require('node:fs');
const assert = require('node:assert/strict');
const src = fs.readFileSync('src-mod/com/company/assembleegameclient/game/MapUserInput.as','utf8');
const body = src.match(/private function updateLabFollow\(player:Player\) : void\s*\{([\s\S]*?)\n      \}/)[1]
 .replace(/var (\w+):(Boolean|Number|int|Player|GameObject|Square|Portal)/g,'var $1')
 .replace(/for each\(var candidate in this.gs_\.map.goDict_\)/,'for(var candidate of Object.values(this.gs_.map.goDict_))')
 .replace(/candidate is Player/g,'candidate instanceof Player').replace(/candidate as Player/g,'candidate')
 .replace(/ as Portal/g,'').replace(/int\(/g,'Number(');
class Player {
 constructor(name,x,y) { Object.assign(this,{name_:name,x_:x,y_:y}); }
 isPaused(){return false;} isConfused(){return false;}
 setRelativeMovement(...v){this.movement=v;}
}
const follow = new Function('player','Parameters','getTimer','Player','labPortalArrival_',body);
const p=new Player('FollowerOne',0,0), leader=new Player('LeaderPlayer',6,0);
const params={data_:{labFollowLeaderPlayer:true,cameraAngle:0}};
const safe=()=>({isWalkable:()=>true,props_:{maxDamage_:0,minDamage_:0}});
const ctx={labFollowing_:false,labFollowManualUntil_:0,enablePlayerInput_:true,setHotkeysInput_:true,labPortalListen(){},labFollowStalled(){return false;},labIsFollower(p){return p && ['FollowerOne','FollowerTwo'].includes(p.name_);},
 gs_:{isGroupStunActive:()=>false,map:{goDict_:{leader},getSquare:safe}},setPlayerMovement(){p.setRelativeMovement(0,0,0);}};
const run=()=>follow.call(ctx,p,params,()=>10000,Player);
run(); assert.equal(ctx.labFollowing_,true); assert.deepEqual(p.movement,[0,1,0]);
leader.x_=2; run(); assert.equal(ctx.labFollowing_,true); // continue inside start deadband
leader.x_=1.7; run(); assert.equal(ctx.labFollowing_,false); assert.deepEqual(p.movement,[0,0,0]);
leader.x_=2; run(); assert.equal(ctx.labFollowing_,false); // no oscillation
leader.x_=6; params.data_.cameraAngle=Math.PI/2; run(); assert.ok(Math.abs(p.movement[1])<1e-9); assert.equal(p.movement[2],-1);
delete ctx.gs_.map.goDict_.leader; run(); assert.deepEqual(p.movement,[0,0,0]);
ctx.gs_.map.goDict_.leader=leader;
ctx.gs_.map.getSquare=()=>null; run(); assert.equal(ctx.labFollowing_,false);
ctx.gs_.map.getSquare=()=>({isWalkable:()=>true,props_:{maxDamage_:10}}); run(); assert.equal(ctx.labFollowing_,false);
ctx.gs_.map.getSquare=()=>({isWalkable:()=>false,props_:{}}); run(); assert.equal(ctx.labFollowing_,false);
ctx.gs_.map.getSquare=safe; ctx.moveLeft_=true; run(); assert.equal(ctx.labFollowManualUntil_,11000); assert.equal(ctx.labFollowing_,false);
ctx.moveLeft_=false; run(); assert.equal(ctx.labFollowing_,false);
ctx.labFollowManualUntil_=0; run(); assert.equal(ctx.labFollowing_,true);
params.data_.labFollowLeaderPlayer=false; run(); assert.deepEqual(p.movement,[0,0,0]);
params.data_.labFollowLeaderPlayer=true; p.name_='LeaderPlayer'; run(); assert.equal(ctx.labFollowing_,false);
const a=fs.readFileSync('profiles/LeaderPlayer.xml','utf8'), b=fs.readFileSync('profiles/FollowerOne.xml','utf8');
assert.notEqual(a.match(/<id>(.*?)<\/id>/)[1],b.match(/<id>(.*?)<\/id>/)[1]);
assert.match(src,/setRelativeMovement\(0,Math.cos\(angle\),Math.sin\(angle\)\)/);
console.log('Follow checks passed: role, visibility, camera, hysteresis, manual override, disable, walls/lava; profile IDs distinct.');
