const fs=require('node:fs'),assert=require('node:assert/strict');
const mui=fs.readFileSync('src-mod/com/company/assembleegameclient/game/MapUserInput.as','utf8');
const gsc=fs.readFileSync('src-mod/kabam/rotmg/messaging/impl/GameServerConnection.as','utf8');
const probe=fs.readFileSync('build/network-probe/NetworkProbe.as','utf8');
function body(source,name){return source.replace(/\r\n/g,'\n').match(new RegExp('(?:private|public) function '+name+'\\([^\\n]+\\n      \\{([\\s\\S]*?)\\n      \\}'))[1]
 .replace(/var (\w+):(\w+)/g,'var $1').replace(/catch\((\w+):Error\)/g,'catch($1)').replace(/new Date\(\)\.time/g,'Date.now()');}
assert.equal(body(probe,'labNetworkLog'),body(gsc,'labNetworkLog'),'Offline AIR probe must use the current production logger');
const remember=new Function('getTimer','owner','slot','type','mode',body(gsc,'labRememberUse'));
const state={labRecentUses_:[],labInvResultSequence:3,labInvResultCode:2,gameId_:9,gs_:{map:{name_:'Test'}}};
for(let i=0;i<30;i++)remember.call(state,()=>i*10,1,4,100,2);
assert.equal(state.labRecentUses_.length,24);assert.equal(state.labRecentUses_[0].ms,60);
let persisted='',closed=0;
class Stream{open(p,mode){assert.equal(p,'test.jsonl');assert.equal(mode,'append');}writeUTFBytes(s){persisted+=s;}close(){closed++;}}
const log=new Function('getTimer','NativeApplication','trace','FileStream','File','FileMode','labNetworkFile_','eventName','detail',body(gsc,'labNetworkLog'));
const args=[()=>300,{nativeApplication:{applicationID:'test'}},()=>{},Stream,{applicationStorageDirectory:{resolvePath:p=>p}},{APPEND:'append'},'test.jsonl'];
log.call(state,...args,'socket_closed','x'.repeat(1000));
const record=JSON.parse(persisted);assert.equal(record.detail.length,512);assert.equal(record.event,'socket_closed');assert.equal(record.recentUses.length,24);assert.equal(closed,1);
class BrokenStream extends Stream{writeUTFBytes(){throw new Error('disk full');}}
args[3]=BrokenStream;assert.doesNotThrow(()=>log.call(state,...args,'server_failure','failure'));assert.equal(closed,2);
for(const name of ['disconnect','onConnected','onClosed','onError','onFailure','onReconnect'])assert.match(body(gsc,name),/labNetworkLog/);
for(const name of ['useItem','applyUseItem'])assert.match(body(gsc,name),/labRememberUse/);
assert.doesNotMatch(mui,/labRangeLabel_|labShowRange/);
console.log('Network checks passed; aim indicator removed.');
