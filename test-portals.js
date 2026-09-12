const fs=require('node:fs'), assert=require('node:assert/strict');
const source=fs.readFileSync('src-mod/com/company/assembleegameclient/game/MapUserInput.as','utf8');
const state={arrival:null}, params={data_:{labFollowLeaderPlayer:true,labFollowPortals:true,cameraAngle:0}};
let now=10000;
class Player { constructor(name,id,x=0,y=0){Object.assign(this,{name_:name,objectId_:id,x_:x,y_:y});} isPaused(){return false;} isConfused(){return false;} setRelativeMovement(...v){this.movement=v;} }
class Portal { constructor(){Object.assign(this,{objectId_:20,objectType_:100,x_:3,y_:0,active_:true,lockedPortal_:false});} getName(){return 'Test portal';} }
const compile=(name,args)=>{
 let body=source.match(new RegExp('(?:private|public) function '+name+'\\([^\\n]*\\) : \\w+\\s*\\{([\\s\\S]*?)\\n      \\}'))[1]
  .replace(/var (\w+):(Boolean|Number|int|Player|GameObject|Square|Portal|Object)/g,'var $1')
  .replace(/for each\(var candidate in this.gs_\.map.goDict_\)/,'for(var candidate of Object.values(this.gs_.map.goDict_))')
  .replace(/candidate is Player/g,'candidate instanceof Player').replace(/offer.destinationHost is String/g,"typeof offer.destinationHost === 'string'")
  .replace(/ as (Player|Portal)/g,'').replace(/int\(/g,'Number(').replace(/new Date\(\).time/g,'Date.now()').replace(/labPortalArrival_/g,'state.arrival');
 const fn=new Function(...args,'Parameters','getTimer','Player','AddTextLineVO','state',body);
 return function(...v){return fn.call(this,...v,params,()=>now,Player,function(a,b){this.text=b;},state);};
};
const receive=compile('labReceivePortal',['offer']), matches=compile('labPortalMatches',['portal','offer']), update=compile('updateLabFollow',['player']);
const p=new Player('FollowerOne',2), leader=new Player('LeaderPlayer',1,3,0), portal=new Portal();
const sent=[], notices=[];
const ctx={labFollowing_:false,labFollowManualUntil_:0,labPortalSeen_:0,labLeaderSeenId_:1,labLeaderSeenAt_:now,
 enablePlayerInput_:true,setHotkeysInput_:true,labPortalListen(){},labFollowStalled(){return false;},labPortalMatches:matches,labIsFollower(p){return p && ['FollowerOne','FollowerTwo'].includes(p.name_);},
 addTextLine:{dispatch:v=>notices.push(v.text)},setPlayerMovement(){p.setRelativeMovement(0,0,0);},
 labPortalStop(reason){this.labPortalPending_=null;state.arrival=null;params.data_.labFollowLeaderPlayer=false;this.setPlayerMovement();notices.push(reason);},
 gs_:{map:{player_:p,name_:'Source',goDict_:{1:leader,20:portal},getSquare:()=>({isWalkable:()=>true,props_:{maxDamage_:0,minDamage_:0}})},
 gsc_:{gameId_:7,server_:{address:'server',port:2000},usePortal:id=>sent.push(id)},isGroupStunActive:()=>false}};
const offer=()=>({stamp:Date.now(),leader:1,id:20,type:100,x:3,y:0,name:'Test portal',map:'Source',game:7,host:'server',port:2000,destinationGame:8,destinationHost:'server',destinationPort:2000});
const reset=()=>{ctx.labPortalSeen_=0;ctx.labPortalPending_=null;ctx.labLeaderSeenAt_=now;params.data_.labFollowLeaderPlayer=true;state.arrival=null;};
receive.call(ctx,offer()); assert.ok(ctx.labPortalPending_);
const accepted=ctx.labPortalPending_; receive.call(ctx,{...offer(),stamp:accepted.stamp}); assert.equal(ctx.labPortalPending_,accepted);
update.call(ctx,p); assert.equal(ctx.labFollowing_,true); assert.equal(sent.length,0);
p.x_=2.4; update.call(ctx,p); assert.deepEqual(sent,[20]); assert.equal(ctx.labPortalPending_,null); assert.ok(state.arrival);
update.call(ctx,p); assert.equal(sent.length,1); // old map: no repeated request
const sourceGame=ctx.gs_;
ctx.gs_={...sourceGame,gsc_:{...sourceGame.gsc_,gameId_:8},map:{...sourceGame.map,goDict_:{}}};
update.call(ctx,p); assert.ok(state.arrival); // destination alone is insufficient
ctx.gs_.map.goDict_={1:leader}; update.call(ctx,p); assert.equal(state.arrival,null); assert.ok(notices.some(x=>x.includes('confirmed')));
ctx.gs_=sourceGame; p.x_=0;
reset(); receive.call(ctx,{...offer(),game:99}); assert.equal(ctx.labPortalPending_,null);
reset(); ctx.labLeaderSeenAt_=now-3000; receive.call(ctx,offer()); assert.equal(ctx.labPortalPending_,null);
reset(); receive.call(ctx,{...offer(),stamp:Date.now()-7000}); assert.equal(ctx.labPortalPending_,null);
reset(); receive.call(ctx,{...offer(),id:21}); assert.equal(params.data_.labFollowLeaderPlayer,false);
reset(); portal.lockedPortal_=true; receive.call(ctx,offer()); assert.equal(params.data_.labFollowLeaderPlayer,false); portal.lockedPortal_=false;
reset(); receive.call(ctx,offer()); delete ctx.gs_.map.goDict_[20]; update.call(ctx,p); assert.equal(params.data_.labFollowLeaderPlayer,false); ctx.gs_.map.goDict_[20]=portal;
reset(); receive.call(ctx,offer()); ctx.gs_.map.getSquare=()=>null; update.call(ctx,p); assert.equal(params.data_.labFollowLeaderPlayer,false);
ctx.gs_.map.getSquare=()=>({isWalkable:()=>true,props_:{maxDamage_:0,minDamage_:0}});
reset(); receive.call(ctx,offer()); now+=10001; update.call(ctx,p); assert.equal(params.data_.labFollowLeaderPlayer,false);
reset(); state.arrival={source:ctx.gs_,sentAt:now-15001}; update.call(ctx,p); assert.equal(params.data_.labFollowLeaderPlayer,false);
reset(); state.arrival={source:{},sentAt:now,destinationGame:99}; update.call(ctx,p); assert.equal(params.data_.labFollowLeaderPlayer,false);
reset(); params.data_.labFollowPortals=false; receive.call(ctx,offer()); assert.equal(ctx.labPortalPending_,null);
assert.match(source,/allowDomain\("app#Evershade.Lab.LeaderPlayer"\)/);
assert.doesNotMatch(source,/allowDomain\("\*"\)/);
assert.match(source,/send\("app#Evershade.Lab.FollowerOne:labPortals","labReceivePortal",offer\)/);
const gsc=fs.readFileSync('src-mod/kabam/rotmg/messaging/impl/GameServerConnection.as','utf8');
assert.match(gsc,/private function onReconnect[\s\S]*?MapUserInput.labPortalConfirmed[\s\S]*?this.disconnect\(\)/);
console.log('Portal checks passed: identity, recent source witness, freshness/dedup, approach, one request, arrival witness, missing/locked/blocked/expired, wrong destination, OFF, restricted local channel.');
