const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, 'src-mod/com/company/assembleegameclient');
const src = fs.readFileSync(path.join(root, 'game/MapUserInput.as'), 'utf8');
const body = src.match(/private function labTarget\(player:Player, ability:Boolean = false\) : GameObject\s*\{([\s\S]*?)\n      \}/)[1]
  .replace(/var (\w+):(XML|Number|Boolean|GameObject)/g, 'var $1')
  .replace(/for each\(var target in this.gs_\.map.goDict_\)/, 'for (var target of Object.values(this.gs_.map.goDict_))')
  .replace(/int\(/g, 'Number(');
const target = new Function('player', 'Parameters', 'ObjectLibrary', 'ability', body);
const player = {equipment_:[1], x_:0, y_:0};
const parameters = {data_:{labAutoAim:true, labPreShoot:true, labAimMode:0, cameraAngle:0}};
const library = {xmlLibrary_:{1:{Projectile:[{Speed:100,LifetimeMS:1000}]},2:{Enemy:true}}};
const enemy = (id,x,y,hp,inv=false) => ({objectId_:id, objectType_:2,x_:x,y_:y,hp_:hp,maxHP_:hp,isInvulnerable:()=>inv,isInvincible:()=>false});
const map = {goDict_:{a:enemy(1,0,5,100),b:enemy(2,5,0,1000)},cursorX_:1,cursorY_:0,quest_:{objectIds_:[1]}};
const context = {gs_:{map},labCombatMap:()=>true,labClearShot:()=>true};
assert.equal(target.call(context,player,parameters,library).objectId_,1);
parameters.data_.labAimMode=1;
assert.equal(target.call(context,player,parameters,library).objectId_,2);
parameters.data_.labAimMode=0;
map.goDict_.a=enemy(1,0,5,100,true);
parameters.data_.labPreShoot=false;
assert.equal(target.call(context,player,parameters,library).objectId_,2);
context.labCombatMap=()=>false;
assert.equal(target.call(context,player,parameters,library),null);
context.labCombatMap=()=>true;
map.goDict_={a:enemy(1,12,0,100)};
assert.equal(target.call(context,player,parameters,library).objectId_,1);
map.goDict_.a.x_=12.01;assert.equal(target.call(context,player,parameters,library),null);
map.goDict_.a.x_=13;assert.equal(target.call(context,player,parameters,library,true),null);
map.goDict_={a:enemy(1,11,0,10000),b:enemy(2,9,0,10)};
assert.equal(target.call(context,player,parameters,library).objectId_,2);
map.goDict_.a.x_=10;assert.equal(target.call(context,player,parameters,library).objectId_,1);
context.labClearShot=(_,t)=>t.objectId_!==1;
assert.equal(target.call(context,player,parameters,library).objectId_,2);
context.labClearShot=()=>false;assert.equal(target.call(context,player,parameters,library),null);
assert.equal(target.call(context,player,parameters,library,true).objectId_,1);
context.labClearShot=()=>true;
map.goDict_={a:enemy(1,30,0,100)};
assert.equal(target.call(context,player,parameters,library),null);
const defaults=fs.readFileSync(path.join(root,'parameters/Parameters.as'),'utf8');
assert.match(defaults,/setDefault\("labAutoAim",false\)/);
assert.match(defaults,/setDefault\("labAutoNexus",false\)/);
console.log('Port checks passed: quest priority, cone, invulnerability filter, safe-map exclusion, range and disabled defaults.');
const lootBody = src.match(/private function labLootBag\(player:Player\) : Container\s*\{([\s\S]*?)\n      \}/)[1]
  .replace(/var (\w+):(Container|Number|GameObject|int)/g,'var $1')
  .replace(/for each\(var object in this.gs_\.map.goDict_\)/,'for (var object of Object.values(this.gs_.map.goDict_))')
  .replace(/object as Container/,'(object instanceof Container ? object : null)');
const selectBag = new Function('player','Container',lootBody);
class Container {
  constructor(x, loot=true, owner=-1, items=[42]) { this.x_=x; this.y_=0; this.isLoot_=loot; this.ownerId_=owner; this.equipment_=items; }
  isBoundToCurrentAccount(){ return this.ownerId_===7; }
}
const chest=new Container(0,false), foreign=new Container(0,true,8), far=new Container(2), empty=new Container(0,true,-1,[-1]), own=new Container(0.8,true,7), shared=new Container(0.5);
const lootMap={goDict_:{chest,foreign,far,empty,own,shared}};
const lootContext={gs_:{map:lootMap},labLootDestination:(_,type)=>type>=0?4:-1};
assert.equal(selectBag.call(lootContext,player,Container),shared);
delete lootMap.goDict_.shared;
assert.equal(selectBag.call(lootContext,player,Container),own);
delete lootMap.goDict_.own;
assert.equal(selectBag.call(lootContext,player,Container),null);
assert.match(defaults,/setDefault\("labAutoLoot",false\)/);
const updateBody=src.match(/private function updateLabLoot\(player:Player\) : void\s*\{([\s\S]*?)\n      \}/)[1]
  .replace(/var (\w+):(int|Container)/g,'var $1');
const updateLoot=new Function('player','Parameters','getTimer','AddTextLineVO','trace = () => {}',updateBody);
let requests=0;
const lootParams={data_:{labAutoLoot:true},save(){}};
const gsc={labInvResultSequence:0,labInvResultCode:-1,invSwap(){ requests++;return true; }};
const controller={gs_:{gsc_:gsc,isGroupStunActive:()=>false},labLootPending_:false,labLootAt_:-1000,enablePlayerInput_:true,labCombatMap:()=>true,labLootBag:()=>shared,labLootDestination:p=>p.nextAvailableInventorySlot(),addTextLine:{dispatch(){}}};
const looter={equipment_:Array(28).fill(-1),hasBackpack_:false,nextAvailableInventorySlot:()=>4,isPaused:()=>false};
const run=t=>updateLoot.call(controller,looter,lootParams,()=>t,function(){});
run(1000);assert.equal(requests,1);
run(1200);assert.equal(requests,1);
run(4001);assert.equal(lootParams.data_.labAutoLoot,true);assert.equal(requests,1);
run(6500);assert.equal(requests,1);
run(7001);assert.equal(requests,2);
gsc.labInvResultSequence++;gsc.labInvResultCode=1;run(7100);assert.equal(lootParams.data_.labAutoLoot,true);
looter.nextAvailableInventorySlot=()=>-1;run(11000);assert.equal(requests,2);
const destinationBody=src.match(/private function labLootDestination\(player:Player, type:int\) : int\s*\{([\s\S]*?)\n      \}/)[1].replace(/var (\w+):(Object|int)/g,'var $1');
const destination=new Function('player','type','PotionInventoryModel',destinationBody);
const potionContext={potionInventoryModel:{getPotionModel:()=>({maxPotionCount:6})},labLootAllowed:t=>t>=0,labStatPotion:()=>null};
const potionModel={getPotionSlot:t=>t===2594?254:255};
looter.getPotionCount=()=>0;
assert.equal(destination.call(potionContext,looter,2594,potionModel),254);
assert.equal(destination.call(potionContext,looter,2595,potionModel),255);
assert.equal(destination.call(potionContext,looter,42,potionModel),-1);
looter.getPotionCount=()=>6;
assert.equal(destination.call(potionContext,looter,2594,potionModel),-1);
console.log('Loot checks passed: ownership, distance, full inventory, potion stacks, capacity and persistent retry/backoff.');
const abilityBody=src.match(/private function labUseAbility\(player:Player, x:Number, y:Number, phase:int\) : Boolean\s*\{([\s\S]*?)\n      \}/)[1].replace(/var (\w+):(GameObject|Point)/g,'var $1');
const cast=new Function('player','x','y','phase','Parameters',abilityBody);
let casts=[];
const caster={isUnstable:()=>false,useAltWeapon:(...args)=>{casts.push(args);return true;}};
const abilityParams={data_:{labAimAbility:true}};
const abilityContext={labTarget:()=>({x_:5,y_:6,posS_:[0,0,0,100,200]}),gs_:{map:{pSTopW:()=>({x:5,y:6})}}};
cast.call(abilityContext,caster,10,20,1,abilityParams);assert.deepEqual(casts.pop(),[100,200,1]);
abilityContext.labTarget=()=>null;
cast.call(abilityContext,caster,10,20,2,abilityParams);assert.deepEqual(casts.pop(),[10,20,2]);
assert.equal((src.match(/\.useAltWeapon\(/g)||[]).length,2);
parameters.data_.labAutoAim=false;parameters.data_.labPreShoot=true;
map.goDict_={a:enemy(1,3,0,100,true),b:enemy(2,5,0,50)};
assert.equal(target.call(context,player,parameters,library,true).objectId_,2);
console.log('Manual ability checks passed: targeted press, mouse fallback, release phase, independent selection and invulnerable exclusion.');
const projectileSource=fs.readFileSync(path.join(root,'objects/Projectile.as'),'utf8');
const hitBody=projectileSource.match(/private function getLocalPlayerHit\(param1:Number, param2:Number\) : GameObject\s*\{([\s\S]*?)\n      \}/)[1]
  .replace(/var (\w+):(Player|Number)/g,'var $1');
const hit=new Function('param1','param2','Parameters','map_',hitBody);
const hitPlayer={x_:0,y_:0,radius_:0.5,dead_:false,isInvincible:()=>false,isPaused:()=>false,isHidden:()=>false,isStasis:()=>false,isUntargetable:()=>false};
const projectile={shotGroupHitDict_:null,projProps_:{multiHit_:false},collisionRadius_:0};
const hitParams={data_:{labReduceClientHits:false}};
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);
assert.equal(hit.call(projectile,1,0,hitParams,{player_:hitPlayer}),null);
hitParams.data_.labReduceClientHits=true;
hitPlayer.maxHP_=100;hitPlayer.hp_=74;
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),null);
for(const hp of [75,76,100]){hitPlayer.hp_=hp;assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);}
hitPlayer.hp_=74;assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),null);
hitPlayer.hp_=80;assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);
hitPlayer.hp_=10;hitPlayer.maxHP_=0;assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);
assert.equal(hit.call(projectile,0,0,hitParams,null),null);
hitPlayer.maxHP_=100;hitPlayer.hp_=74;
hitParams.data_.labReduceClientHits=false;
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);
assert.match(defaults,/setDefault\("labReduceClientHits",false\)/);
assert.match(defaults,/setDefault\("labReduceHitsPercent",75\)/);
assert.match(defaults,/setDefault\("labReduceHitsAlone",false\)/);
hitParams.data_.labReduceClientHits=true;
for(const [setting,hp,suppressed] of [[90,89,true],[90,90,false],[90,91,false],[0,74,true],[0,75,false],[101,99,true],[101,100,false],[NaN,74,true],[NaN,75,false]]){
 hitParams.data_.labReduceHitsPercent=setting;hitPlayer.hp_=hp;
 assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),suppressed?null:hitPlayer);
}
hitParams.data_.labReduceHitsPercent=75;hitParams.data_.labReduceHitsAlone=true;hitPlayer.hp_=100;
projectile.labHasNearbyPlayers=()=>false;
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),null);
projectile.labHasNearbyPlayers=()=>true;
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);
hitPlayer.hp_=74;assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),null);
hitParams.data_.labReduceClientHits=false;projectile.labHasNearbyPlayers=()=>false;
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);
hitParams.data_.labReduceHitsMode=1;hitPlayer.hp_=100;
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);
hitParams.data_.labReduceClientHits=true;
projectile.labHasNearbyPlayers=()=>{throw new Error('Always must not scan players');};
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),null);
hitPlayer.hp_=50;assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),null);
hitParams.data_.labReduceHitsMode=0;hitParams.data_.labReduceHitsAlone=false;hitPlayer.hp_=100;
assert.equal(hit.call(projectile,0,0,hitParams,{player_:hitPlayer}),hitPlayer);
assert.match(defaults,/setDefault\("labReduceHitsMode",0\)/);
console.log('Reduce hits checks passed: Adaptive thresholds/alone, Always at full HP without player scan, mode switching and master OFF.');
const filterBody=src.match(/private function labLootAllowed\(type:int\) : Boolean\s*\{([\s\S]*?)\n      \}/)[1]
  .replace(/var (\w+):(XML|String|Number|int|Array)/g,'var $1')
  .replace(/for each\(var tag in (\[[^\n]+\])\)/,'for (var tag of $1)')
  .replace(/for each\(var character in ObjectLibrary.playerChars_\)/,'for (var character of ObjectLibrary.playerChars_)')
  .replace(/int\(/g,'Number(');
const filter=new Function('type','ObjectLibrary','Parameters',filterBody);
const filterLibrary={xmlLibrary_:{},propsLibrary_:{},playerChars_:[{SlotTypes:'17,11,14,9'}]};
const filterParams={data_:{labLootGearTier:10,labLootAbilityTier:4,labLootRingTier:4}};
const allowed=xml=>{filterLibrary.xmlLibrary_[1]=xml;return filter(1,filterLibrary,filterParams);};
for(const slot of [17,14]){assert.equal(allowed({SlotType:slot,Tier:9}),false);assert.equal(allowed({SlotType:slot,Tier:10}),true);}
for(const slot of [11,9]){assert.equal(allowed({SlotType:slot,Tier:3}),false);assert.equal(allowed({SlotType:slot,Tier:4}),true);}
for(const tag of ['Consumable','Rare','SetTier','Divine','Godly','Shiny','ReskinTier']) assert.equal(allowed({SlotType:17,Tier:0,[tag]:true}),true);
assert.equal(allowed(null),true);assert.equal(allowed({SlotType:17}),true);assert.equal(allowed({SlotType:26,Tier:0}),true);
assert.equal(filter(-1,filterLibrary,filterParams),false);
filterParams.data_.labLootGearTier=0;assert.equal(allowed({SlotType:17,Tier:0}),true);
const filteredBagContext={gs_:{map:{goDict_:{low:new Container(0,true,-1,[1]),good:new Container(0.5,true,-1,[2])}}},labLootDestination:(_,type)=>type===2?4:-1};
assert.equal(selectBag.call(filteredBagContext,player,Container),filteredBagContext.gs_.map.goDict_.good);
console.log('Loot filter checks passed: category thresholds, boundaries, rare/consumable/unknown retention, All override and mixed-bag selection.');
const canUseBody=src.match(/private function labCanUseStatPotion\(player:Player, potion:Object\) : Boolean\s*\{([\s\S]*?)\n      \}/)[1].replace(/var (\w+):(Array|Number)/g,'var $1');
const potionLogs=[];
const canUse=new Function('trace','player','potion',canUseBody).bind({labPotionStatus_:{}},m=>potionLogs.push(m));
const statPotion={fields:['attack_','attackBoost_','attackMax_','SPS_Attack'],amount:2};
const statPlayer={attack_:80,attackBoost_:10,attackMax_:75,SPS_Attack:100,SPS_Attack_Max:100};
assert.equal(canUse(statPlayer,statPotion),true);
statPlayer.attack_=85;assert.equal(canUse(statPlayer,statPotion),false);
statPlayer.SPS_Attack=98;assert.equal(canUse(statPlayer,statPotion),true);
statPlayer.SPS_Attack=99;assert.equal(canUse(statPlayer,statPotion),true);
assert.equal(canUse(statPlayer,{...statPotion,amount:20}),true);
const logCount=potionLogs.length;canUse(statPlayer,statPotion);assert.equal(potionLogs.length,logCount);
statPlayer.SPS_Attack=101;assert.equal(canUse(statPlayer,statPotion),false);
statPlayer.SPS_Attack=NaN;assert.equal(canUse(statPlayer,statPotion),false);
statPlayer.SPS_Attack=0;
statPlayer.SPS_Attack_Max=0;assert.equal(canUse(statPlayer,statPotion),false);
const statBody=src.match(/private function labStatPotion\(type:int\) : Object\s*\{([\s\S]*?)\n      \}/)[1]
 .replace(/var (\w+):(XML|Array|Number)/g,'var $1').replace(/\.@/g,'.').replace(/xml.Activate.length\(\)/g,'xml.Activate.length').replace(/int\(/g,'Number(');
const statInfo=new Function('type','ObjectLibrary',statBody);
const statXml={id:'Potion of Attack',Consumable:true,Potion:true,Activate:[{stat:20,amount:2,toString:()=> 'IncrementStat'}]};
const statLib={xmlLibrary_:{1:statXml}};
assert.deepEqual(statInfo(1,statLib),statPotion);
statXml.id='Maxy';assert.equal(statInfo(1,statLib),null);
statXml.id='Greater Potion of Attack';statXml.Activate[0].amount=4;assert.equal(statInfo(1,statLib).amount,4);
const useBag=new Container(0,true,-1,[1]);
let uses=0;
const useGsc={labInvResultSequence:0,labInvResultCode:-1,useItem_new:(b,s,mode)=>{assert.equal(mode,2);uses++;return true;}};
const useContext={gs_:{gsc_:useGsc,isGroupStunActive:()=>false},labLootPending_:false,labLootAt_:-1000,labPotionPendingBag_:null,labPotionBlockedUntil_:{},enablePlayerInput_:true,labCombatMap:()=>true,labLootBag:()=>useBag,labLootDestination:()=>256};
const useRun=t=>updateLoot.call(useContext,looter,{data_:{labAutoLoot:true}},()=>t,function(){});
useRun(1000);assert.equal(uses,1);
useRun(1100);assert.equal(uses,1);
useRun(4001);assert.equal(uses,1);assert.equal(useContext.labPotionBlockedUntil_[1],34001);
useContext.labPotionBlockedUntil_={};useContext.labLootAt_=0;
useRun(5000);useBag.equipment_[0]=-1;useRun(5100);assert.equal(useContext.labLootPending_,false);
console.log('Stat potion checks passed: boosted stat caps, full/unknown capacity, remaining storage independent of stat points, deduplicated diagnostics, safe identification, Store mode, confirmation and failure backoff.');
