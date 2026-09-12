const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src-mod/kabam/rotmg/messaging/impl/GameServerConnection.as','utf8');
function body(name){return source.match(new RegExp('private function '+name+'\\([^\\n]+\\n      \\{([\\s\\S]*?)\\n      \\}'))[1]
 .replace(/var (\w+):\w+/g,'var $1').replace(/catch\((\w+):Error\)/g,'catch($1)')
 .replace(/for each\(var object in this.gs_.map.goDict_\)/,'for(var object of Object.values(this.gs_.map.goDict_))')
 .replace(/object as Player/g,'(object.isPlayer ? object : null)');}
const events=[],p={isPlayer:true,hp_:100,maxHP_:100,x_:0,y_:0,condition_:[32768,0]};
const state={labHealthTelemetryEnabled_:true,gs_:{map:{player_:p,goDict_:{self:p}}},labHealthPlayer_:null,labServerHP_:0,
 labNetworkLog:(event,detail)=>{assert.ok(detail.length<=512);events.push({event,...JSON.parse(detail)});}};
const Parameters={data_:{labReduceClientHits:true,labReduceHitsMode:0,labReduceHitsPercent:75,labReduceHitsAlone:true}};
const health=new Function('Parameters','trace','eventName','data',body('labHealthEvent'));
state.labHealthEvent=(event,data)=>health.call(state,Parameters,()=>{},event,data);
state.labHealthEvent('test',{});assert.equal(events.at(-1).policyActive,true);
assert.deepEqual(events.at(-1).conditions,[32768,0]);assert.equal(events.at(-1).v,2);
state.gs_.map.goDict_.other={isPlayer:true,x_:15,y_:0};
state.labHealthEvent('test',{});assert.equal(events.at(-1).nearby,1);assert.equal(events.at(-1).policyActive,false);
Parameters.data_.labReduceHitsMode=1;state.labHealthEvent('test',{});assert.equal(events.at(-1).policyActive,true);
Parameters.data_.labReduceClientHits=false;state.labHealthEvent('test',{});assert.equal(events.at(-1).policyActive,false);
const observe=new Function('object','hp',body('labObserveHealth'));
observe.call(state,p,100);assert.equal(events.at(-1).event,'hp_baseline');assert.equal(events.at(-1).delta,null);
const count=events.length;observe.call(state,p,100);assert.equal(events.length,count);
p.hp_=90;observe.call(state,p,80);assert.equal(events.at(-1).delta,-20);assert.equal(events.at(-1).clientBefore,90);
observe.call(state,p,85);assert.equal(events.at(-1).delta,5);
observe.call(state,{hp_:50},50);assert.equal(events.at(-1).event,'hp_baseline');
const conditions=new Function('object','bank','value',body('labObserveConditions'));
conditions.call(state,p,0,32768);assert.equal(events.at(-1).event,'condition_baseline');
const conditionCount=events.length;conditions.call(state,p,0,32768);assert.equal(events.length,conditionCount);
conditions.call(state,p,0,0);assert.equal(events.at(-1).previous,32768);assert.equal(events.at(-1).next,0);
conditions.call(state,p,1,0);assert.equal(events.at(-1).event,'condition_baseline');
conditions.call(state,{},0,0xffffffff);assert.equal(events.at(-1).previous,null);assert.equal(events.at(-1).next,0xffffffff);
const decode=require('./decode-conditions');
assert.deepEqual(decode([32768,0]),['BLEEDING']);assert.deepEqual(decode([0,1]),['DARKNESS']);
assert.deepEqual(decode([0,8388608]),['POISON']);assert.deepEqual(decode([0,0]),[]);
assert.match(source,/case 29:\s+if\(param1.objectId_ == playerId_\) this.labObserveConditions\(param1,0,uint\(_loc9_\)\)/);
assert.match(source,/case 120:\s+if\(param1.objectId_ == playerId_\) this.labObserveConditions\(param1,1,uint\(_loc9_\)\)/);
state.labNetworkLog=()=>{throw Error('disk failure')};assert.doesNotThrow(()=>state.labHealthEvent('test',{}));
assert.match(source,/labHealthTelemetryEnabled_:Boolean = false/);
const disabled={labHealthTelemetryEnabled_:false,get gs_(){throw Error('Must not scan game state');},labHealthEvent(){throw Error('Must not emit');}};
assert.doesNotThrow(()=>health.call(disabled,null,null,'test',{}));
assert.doesNotThrow(()=>observe.call(disabled,null,0));
assert.doesNotThrow(()=>conditions.call(disabled,null,0,0));
assert.equal(disabled.labHealthPlayer_,undefined);
assert.equal(disabled.labConditionPlayer_,undefined);
for(const event of ['local_hit_report','ground_damage_report','server_damage','aoe_hit']) assert.ok(source.includes('labHealthEvent("'+event+'"'));
console.log('Health telemetry: HP baselines, server deltas, policy snapshots and failure isolation passed.');
