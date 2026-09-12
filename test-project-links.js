const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('src-mod/com/company/assembleegameclient/ui/options/registry/OptionRegistry.as','utf8');
for(const [method,url] of [['labOpenGitHub','https://github.com/mateogon/evershade-client-mods'],['labOpenReleases','https://github.com/mateogon/evershade-client-mods/releases']]){
 const body=s.match(new RegExp('private function '+method+'\\(\\) : void\\s*\\{([^}]+)\\}'))[1];
 let opened=[];new Function('navigateToURL','URLRequest',body)((req,target)=>opened.push([req.url,target]),function(url){this.url=url;});
 assert.deepEqual(opened,[[url,'_blank']]);assert.ok(s.includes('.withCallback(this.'+method+')'));
}
assert.match(s,/"action","Lab","Project"/);
console.log('Project links: fixed HTTPS destinations, callback wiring and no automatic navigation.');
