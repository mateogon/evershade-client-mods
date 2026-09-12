// Decode using this client's native constants, not an assumed standard bit layout.
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'src-decompiled/scripts/com/company/assembleegameclient/util/ConditionEffect.as'),'utf8');
const constants=Object.fromEntries([...source.matchAll(/public static const (\w+):uint = (\d+);/g)].map(m=>[m[1],Number(m[2])]));
function decode(banks){
 if(!Array.isArray(banks)||banks.length!==2) return null;
 return Object.entries(constants).filter(([name,id])=>id>0&&!name.endsWith('_BIT')&&constants[name+'_BIT']!==undefined)
  .filter(([name,id])=>(Number(banks[id<=31?0:1]) & constants[name+'_BIT'])!==0).map(([name])=>name);
}
module.exports=decode;
if(require.main===module){
 const banks=process.argv.slice(2).map(Number);
 if(banks.length!==2||banks.some(n=>!Number.isInteger(n)||n<0||n>0xffffffff)) throw Error('Usage: node decode-conditions.js <bank0 uint> <bank1 uint>');
 console.log(JSON.stringify(decode(banks)));
}
