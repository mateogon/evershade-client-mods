const {execFileSync}=require('node:child_process');
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
if(!files.length)throw Error('Stage the reviewed public files first.');
const issues=[];
for(const file of files){
 if(!/^(?:[^/]+\.(?:js|ps1|md)|\.gitignore|\.gitattributes|patches\/(?:client\.patch|baseline\.json)|profiles\/(?:LeaderPlayer|FollowerOne|FollowerTwo)\.xml|drops\/(?:app\.js|index\.html)|build\/network-probe\/(?:NetworkProbe\.as|probe\.xml))$/.test(file))issues.push(file+': unexpected tracked path');
 const content=execFileSync('git',['show',':'+file],{encoding:'utf8',maxBuffer:10e6});
 const checks=[['private key',/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/],['access token',/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/],['personal Windows path',/C:[\\/]Users[\\/](?!Public\b)[^\\/\s]+/i],['email address',/[\w.+-]+@(?:[\w-]+\.)+[A-Za-z]{2,}/],['literal credential',/(?:password|passwd|api[_-]?key|secret)\s*[:=]\s*["'][^"'\r\n]{4,}["']/i]];
 for(const [label,pattern] of checks)if(pattern.test(content))issues.push(file+': '+label);
}
if(issues.length){console.error(issues.join('\n'));process.exit(1);}
console.log(`Checked ${files.length} staged files: allowed text paths, no matched credential patterns. Manual review is still required.`);
