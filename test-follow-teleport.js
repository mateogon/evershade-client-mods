const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('src-mod/com/company/assembleegameclient/game/MapUserInput.as','utf8');
const body=src.match(/private function labFollowTeleport\(player:Player, leader:Player\) : void\s*\{([\s\S]*?)\n      \}/)[1];
const teleport=new Function('player','leader','Parameters','getTimer','AddTextLineVO',body);
let now=10000,cooldown=0,eligible=true,calls=0;
const leader={name_:'LeaderPlayer',objectId_:7};
const params={data_:{labFollowTeleport:true}};
const player={msUtilTeleport:()=>cooldown,isTeleportEligible:()=>eligible,teleportTo(){calls++;return true;}};
const ctx={labFollowTeleportAt_:-10000,gs_:{map:{allowPlayerTeleport_:true,goDict_:{7:leader}}},addTextLine:{dispatch(){}}};
const run=()=>teleport.call(ctx,player,leader,params,()=>now,function(){});
run();assert.equal(calls,1);run();assert.equal(calls,1);
now+=4999;run();assert.equal(calls,1);now++;run();assert.equal(calls,2);
now+=10000;cooldown=1;run();assert.equal(calls,2);cooldown=0;
eligible=false;run();assert.equal(calls,2);eligible=true;
ctx.gs_.map.allowPlayerTeleport_=false;run();assert.equal(calls,2);ctx.gs_.map.allowPlayerTeleport_=true;
delete ctx.gs_.map.goDict_[7];run();assert.equal(calls,2);ctx.gs_.map.goDict_[7]={...leader};run();assert.equal(calls,2);ctx.gs_.map.goDict_[7]=leader;
params.data_.labFollowTeleport=false;run();assert.equal(calls,2);params.data_.labFollowTeleport=true;
leader.dead_=true;run();assert.equal(calls,2);leader.dead_=false;run();assert.equal(calls,3);
// Integration uses the real follow method to verify distance and manual/portal guards.
let arrival=null;
const followBody=src.match(/private function updateLabFollow\(player:Player\) : void\s*\{([\s\S]*?)\n      \}/)[1]
 .replace(/var (\w+):(Boolean|Number|int|Player|GameObject|Square|Portal)/g,'var $1')
 .replace(/for each\(var candidate in this.gs_\.map.goDict_\)/,'for(var candidate of Object.values(this.gs_.map.goDict_))')
 .replace(/candidate is Player/g,'candidate instanceof Player').replace(/ as (Player|Portal)/g,'').replace(/int\(/g,'Number(');
const follow=new Function('player','Parameters','getTimer','Player','labPortalArrival_',followBody);
class Player {constructor(name,x){Object.assign(this,{name_:name,x_:x,y_:0,objectId_:7});}isPaused(){return false;}isConfused(){return false;}setRelativeMovement(...v){this.movement=v;}}
const follower=new Player('FollowerOne',0), target=new Player('LeaderPlayer',30);let attempts=0;
const stalledBody=src.match(/private function labFollowStalled\(player:Player, leader:Player\) : Boolean\s*\{([\s\S]*?)\n      \}/)[1].replace(/var (\w+):(Number|int)/g,'var $1');
const stalled=new Function('player','leader','getTimer',stalledBody);
const context={labFollowing_:false,labFollowManualUntil_:0,enablePlayerInput_:true,setHotkeysInput_:true,labPortalListen(){},labFollowTeleport(){attempts++;},labIsFollower(p){return p && ['FollowerOne','FollowerTwo'].includes(p.name_);},
 labFollowSampleAt_:-10000,labFollowProgressAt_:0,labFollowAnchorX_:0,labFollowAnchorY_:0,labFollowLeaderId_:-1,
 labFollowStalled(p,l){return stalled.call(this,p,l,()=>now);},setPlayerMovement(){follower.setRelativeMovement(0,0,0);},
 gs_:{map:{goDict_:{7:target},getSquare:()=>({isWalkable:()=>true,props_:{maxDamage_:0,minDamage_:0}})},isGroupStunActive:()=>false}};
params.data_.labFollowLeaderPlayer=true;
params.data_.cameraAngle=0;
const tick=()=>follow.call(context,follower,params,()=>now,Player,arrival);
tick();assert.equal(attempts,0);assert.deepEqual(follower.movement,[0,1,0]);
target.x_=1000;now+=100;tick();assert.equal(attempts,0);assert.deepEqual(follower.movement,[0,1,0]);
// Walking for a long time still never teleports when movement makes progress.
for(let i=0;i<200;i++){follower.x_+=0.1;now+=100;tick();}assert.equal(attempts,0);
// Even a nearby wall does not trigger an immediate teleport.
context.gs_.map.getSquare=()=>null; now+=600;tick();
for(let i=0;i<79;i++){now+=100;tick();}assert.equal(attempts,0);
now+=100;tick();assert.equal(attempts,1);
context.moveLeft_=true;tick();assert.equal(attempts,1);context.moveLeft_=false;now+=1001;
tick();assert.equal(attempts,1); // manual pause resets stationary time
arrival={sentAt:now,source:context.gs_};tick();assert.equal(attempts,1);arrival=null;
delete context.gs_.map.goDict_[7];tick();assert.equal(attempts,1);
// Changing the target identity and long frame gaps also reset stuck detection.
context.labFollowProgressAt_=now-9000;context.labFollowSampleAt_=now;context.labFollowLeaderId_=999;
assert.equal(context.labFollowStalled(follower,target),false);
context.labFollowProgressAt_=now-9000;now+=600;assert.equal(context.labFollowStalled(follower,target),false);
assert.doesNotMatch(followBody,/distance > 18/);
console.log('Follow teleport passed: walk at 1000 tiles, moving indefinitely, eight-second stuck fallback, cooldown, eligibility, map permission, backoff, OFF, manual override, no leader, and portal transition.');
