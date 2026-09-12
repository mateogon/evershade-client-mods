const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('src-mod/com/company/assembleegameclient/game/MapUserInput.as','utf8');
let now=1000,arrival=null,sender=null;const sent=[];
class LocalConnection {addEventListener(){}send(...args){sent.push(args);}}
const state={arrival:null,sender:null};
const params={data_:{labFollowKey:188,labTeleportFollowersKey:190,labAbilityMode:1},save(){}};
const library={xmlLibrary_:{10:{Usable:true,MpCost:50,HpCost:0,Activate:['Shoot']}}};
function method(name,args){
 let body=src.match(new RegExp('(?:private|public) function '+name+'\\([^\\n]*\\) : \\w+\\s*\\{([\\s\\S]*?)\\n      \\}'))[1]
  .replace(/var (\w+):(int|uint|Number|Boolean|Player|GameObject|Object|Point|XML)/g,'var $1')
  .replace(/for each\(var effect in xml.Activate\)/,'for(var effect of xml.Activate)')
  .replace(/ as Player/g,'').replace(/catch\(error:Error\)/g,'catch(error)').replace(/int\(/g,'Number(').replace(/new Date\(\).time/g,'Date.now()')
  .replace(/labPortalArrival_/g,'state.arrival').replace(/labPortalSender_/g,'state.sender');
 const fn=new Function(...args,'Parameters','ObjectLibrary','getTimer','AddTextLineVO','state','LocalConnection','StatusEvent','AsyncErrorEvent','labPortalSendStatus','labPortalAsyncError',body);
 return function(...a){return fn.call(this,...a,params,library,()=>now,function(a,b){this.text=b;},state,LocalConnection,{STATUS:'status'},{ASYNC_ERROR:'asyncError'},()=>{},()=>{});};
}
const auto=method('updateLabAutoAbility',['player']);let casts=[];
const player={name_:'FollowerOne',objectId_:2,equipment_:[1,10],nextAltAttack_:0,mp_:100,hp_:100,isPaused:()=>false,isUnstable:()=>false,useAltWeapon(...v){casts.push(v);}};
let target={objectId_:8,x_:5,y_:6,posS_:[0,0,0,100,200]};
const ctx={labAutoAbilityAt_:-1000,labAutoAbilityTarget_:-1,enablePlayerInput_:true,setHotkeysInput_:true,
 labCombatMap:()=>true,labTarget:()=>target,gs_:{map:{pSTopW:()=>({x:5,y:6})},isGroupStunActive:()=>false}};
const tick=()=>{now+=100;auto.call(ctx,player);};
tick();tick();assert.equal(casts.length,0);tick();assert.deepEqual(casts,[[100,200,1]]);
player.nextAltAttack_=now+1000;tick();assert.equal(casts.length,1);player.nextAltAttack_=0;
player.mp_=49;tick();assert.equal(casts.length,1);player.mp_=100;
library.xmlLibrary_[10].EndMpCost=1;tick();assert.equal(casts.length,1);delete library.xmlLibrary_[10].EndMpCost;
library.xmlLibrary_[10].Activate=['Teleport'];tick();assert.equal(casts.length,1);library.xmlLibrary_[10].Activate=['Shoot'];
ctx.mouseDown_=true;tick();assert.equal(casts.length,1);ctx.mouseDown_=false;
params.data_.labAbilityMode=0;tick();assert.equal(casts.length,1);params.data_.labAbilityMode=1;
target=null;tick();assert.equal(casts.length,1);target={objectId_:8,x_:5,y_:6,posS_:[0,0,0,100,200]};
ctx.labCombatMap=()=>false;tick();assert.equal(casts.length,1);ctx.labCombatMap=()=>true;
tick();tick();ctx.gs_.map.pSTopW=()=>({x:NaN,y:6});tick();assert.equal(casts.length,1);
const hotkey=method('labHotkey',['event']),receive=method('labReceiveCommand',['command']);
let toggles=0,tps=0,cooldown=0;const notices=[];
const leader={name_:'LeaderPlayer',objectId_:1};
const c={labKeysDown_:{},labCommandSeen_:0,enablePlayerInput_:true,setHotkeysInput_:true,labToggleFollow(){toggles++;},addTextLine:{dispatch:v=>notices.push(v.text)},labCheckIdentity(){return true;},labIsFollower(p){return p && ['FollowerOne','FollowerTwo'].includes(p.name_);},
 gs_:{stage:{focus:null},map:{player_:leader,name_:'Map',allowPlayerTeleport_:true,goDict_:{1:leader}},gsc_:{gameId_:4,server_:{address:'server',port:2000}},isGroupStunActive:()=>false}};
const event=code=>({keyCode:code,preventDefault(){}});
hotkey.call(c,event(188));hotkey.call(c,event(188));assert.equal(sent.length,2);assert.equal(sent[0][2].action,'toggleFollow');
hotkey.call(c,event(190));assert.equal(sent.length,4);assert.equal(sent[2][2].action,'teleport');
assert.ok(sent[1][0].includes('FollowerTwo'));assert.ok(sent[3][0].includes('FollowerTwo'));
delete c.labKeysDown_[188];c.gs_.stage.focus={};hotkey.call(c,event(188));assert.equal(sent.length,4);c.gs_.stage.focus=null;
c.gs_.map.player_=player;hotkey.call(c,event(188));assert.equal(toggles,1);
player.msUtilTeleport=()=>cooldown;player.isTeleportEligible=()=>true;player.teleportTo=()=>{tps++;return true;};
const request=()=>({...sent[2][2],stamp:Date.now()});
const duplicate=request();receive.call(c,duplicate);assert.equal(tps,1);receive.call(c,duplicate);assert.equal(tps,1);
c.labCommandSeen_=0;cooldown=100;receive.call(c,request());assert.equal(tps,1);cooldown=0;
c.labCommandSeen_=0;state.arrival={};receive.call(c,request());assert.equal(tps,1);state.arrival=null;
c.labCommandSeen_=0;receive.call(c,{...request(),game:99});assert.equal(tps,1);
c.labCommandSeen_=0;receive.call(c,{...request(),stamp:Date.now()-10000});assert.equal(tps,1);
c.labCommandSeen_=0;receive.call(c,{...request(),action:'toggleFollow'});assert.equal(toggles,2);
assert.match(src,/delete this.labKeysDown_\[param1.keyCode\]/);
console.log('Commands/ability passed: punctuation hotkeys, held-key debounce, chat guard, local/remote toggles, teleport checks, auto mode, target settling, mana/cooldown, manual override, safe maps and unsupported abilities.');
