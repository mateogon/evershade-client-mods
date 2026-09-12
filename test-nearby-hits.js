const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('src-mod/com/company/assembleegameclient/objects/Projectile.as','utf8');
const body=src.match(/private function labHasNearbyPlayers\([^\n]+\n      \{([\s\S]*?)\n      \}/)[1]
 .replace(/var (\w+):(int|Number|GameObject|Player)/g,'var $1')
 .replace('for each(var object in map_.goDict_)','for(var object of Object.values(map_.goDict_))')
 .replace('object as Player','(object instanceof Player ? object : null)');
const near=new Function('Projectile','getTimer','Player','map_','player',body);
class Player{constructor(x=0,y=0){this.x_=x;this.y_=y;}}
const me=new Player(),other=new Player(15,0),map={goDict_:{me,enemy:{x_:0,y_:0}}},cache={};let clock=0;
const run=(m=map)=>near(cache,()=>clock,Player,m,me);
assert.equal(run(),false);map.goDict_.other=other;clock=99;assert.equal(run(),false);
clock=100;assert.equal(run(),true);other.x_=15.01;clock=200;assert.equal(run(),false);
other.x_=0;other.hidden=true;clock=300;assert.equal(run(),true);
other.dead_=true;clock=400;assert.equal(run(),false);
assert.equal(run(null),true);assert.equal(run({goDict_:{other:new Player()}}),true);
clock=0;assert.equal(run(),false);
console.log('Nearby players: radius boundary, self/NPC/dead exclusion, hidden players, cache expiry, map change and unknown state passed.');
