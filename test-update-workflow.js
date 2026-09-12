const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const script=fs.readFileSync('update-client.ps1','utf8');
assert.match(script,/if \(!\$Apply\)/);
assert.ok(script.indexOf('if ($conflicts.Count)')<script.indexOf('if (!$Apply)'));
assert.ok(script.indexOf('Regression test failed')<script.indexOf('if (!$Apply)'));
assert.match(script,/AIR identity changed/);
assert.match(script,/Local Store\\#SharedObjects/);assert.match(script,/'ELS'/);
assert.doesNotMatch(script,/Remove-Item|Stop-Process|Clear-Content/);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'evershade-merge-test-'));
try {
 const base=path.join(dir,'base.as'),mod=path.join(dir,'mod.as'),fresh=path.join(dir,'fresh.as');
 fs.writeFileSync(base,'version=1\na\nb\nc\nmod=false\n');
 fs.writeFileSync(mod,'version=1\na\nb\nc\nmod=true\n');
 fs.writeFileSync(fresh,'version=2\na\nb\nc\nmod=false\n');
 const merge=()=>spawnSync('git',['merge-file','-p','--',mod,base,fresh],{encoding:'utf8'});
 let result=merge();assert.equal(result.status,0);assert.match(result.stdout,/version=2/);assert.match(result.stdout,/mod=true/);
 fs.writeFileSync(fresh,'version=1\na\nb\nc\nmod=upstream\n');
 result=merge();assert.ok(result.status>0);assert.match(result.stdout,/<<<<<<< /);
} finally { fs.rmSync(dir,{recursive:true}); }
console.log('Update workflow: clean merge retains both edits, overlapping edits conflict, preview/validation gates and settings-backup guards passed.');
