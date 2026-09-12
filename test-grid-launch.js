const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src-mod/Evershade.as','utf8');
const gridBody=source.match(/private static function labGridPosition\([^\n]*\) : Point\s*\{([\s\S]*?)\n      \}/)[1].replace(/var (\w+):Number/g,'var $1').replace(/\bint\(/g,'Math.trunc(');
const grid=new Function('slot','area','width','height','Point',gridBody);
const point=function(x,y){this.x=x;this.y=y;};
const area=(x,y,w,h)=>({x,y,width:w,height:h,right:x+w,bottom:y+h});
const screen=area(0,0,2560,1400);
const positions=[0,1,2].map(i=>grid(i,screen,802,632,point));
assert.ok(positions[0].x+802<=positions[1].x);assert.ok(positions[0].y+632<=positions[2].y);
assert.equal(positions[0].y,positions[1].y);assert.equal(positions[0].x,positions[2].x);
for(const display of [screen,area(0,0,1366,728),area(-1920,30,1920,1080)]){
 for(let i=0;i<3;i++){const p=grid(i,display,802,632,point);assert.ok(p.x>=display.x && p.y>=display.y);assert.ok(p.x+802<=display.right && p.y+632<=display.bottom);}
}
const handlerBody=source.match(/private function labAirError\([^\n]*\) : void\s*\{([\s\S]*?)\n      \}/)[1].replace('var error:Error = event.error as Error','var error = event.error instanceof Error ? event.error : null');
const handler=new Function('event','trace',handlerBody);
let suppressed=0;const known=new Error('Error #2000: No active security context.');known.errorID=2000;
handler({error:known,preventDefault(){suppressed++;}},()=>{});assert.equal(suppressed,1);
for(const e of [new Error('Different error'),{errorID:2000,message:'No active security context'},Object.assign(new Error('Other #2000'),{errorID:2000})]){
 handler({error:e,preventDefault(){suppressed++;}},()=>{});assert.equal(suppressed,1);
}
assert.doesNotMatch(source,/window\.(width|height)\s*=/);
assert.match(fs.readFileSync('launch-clients.ps1','utf8'),/-ArrangeGrid/);
assert.match(fs.readFileSync('launch-mod.ps1','utf8'),/'--','--lab-grid'/);
console.log('Grid launch checks passed: 2x2 placement, monitor origins, no resizing, small-screen bounds, exact error suppression and repeatable invocation.');
