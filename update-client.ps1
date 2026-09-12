param(
    [Parameter(Mandatory=$true)][string]$Zip,
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$ffdec = Join-Path $env:FFDEC_HOME 'ffdec-cli.exe'
foreach ($tool in @('git','node')) { Get-Command $tool -ErrorAction Stop | Out-Null }
if (!(Test-Path -LiteralPath $Zip -PathType Leaf)) { throw 'ZIP not found' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$stage = Join-Path $root "build\update-$stamp"
$backup = Join-Path $root "backup\update-$stamp"
New-Item -ItemType Directory -Path $stage,$backup | Out-Null
Write-Host "Backup: $backup"
foreach ($folder in @('app','src-mod','src-decompiled','profiles')) {
    Copy-Item -LiteralPath (Join-Path $root $folder) -Destination $backup -Recurse
}
Copy-Item -LiteralPath (Join-Path $root 'backup\Evershade.original.swf') -Destination $backup
Get-ChildItem -LiteralPath $root -File | Copy-Item -Destination $backup
# Snapshot native settings + encrypted login stores. Never restore or write AppData automatically.
foreach ($id in @('Evershade','Evershade.Lab.LeaderPlayer','Evershade.Lab.FollowerOne','Evershade.Lab.FollowerTwo')) {
    foreach ($relative in @('Local Store\#SharedObjects','ELS')) {
        $source = Join-Path (Join-Path $env:APPDATA $id) $relative
        if (Test-Path -LiteralPath $source) {
            $destination = Join-Path (Join-Path $backup "AppData\$id") $relative
            New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
            Copy-Item -LiteralPath $source -Destination $destination -Recurse
        }
    }
}
Expand-Archive -LiteralPath $Zip -DestinationPath (Join-Path $stage 'incoming')
$swfs = @(Get-ChildItem (Join-Path $stage 'incoming') -Filter Evershade.swf -Recurse -File)
if ($swfs.Count -ne 1) { throw 'Expected exactly one Evershade.swf in ZIP' }
$original = $swfs[0].FullName
$package = Split-Path $original
if ((Get-FileHash $original).Hash -eq (Get-FileHash (Join-Path $root 'backup\Evershade.original.swf')).Hash) {
    Write-Host 'This original SWF is already installed. No changes.'
    return
}
$descriptor = Join-Path $package 'META-INF\AIR\application.xml'
[xml]$incomingDescriptor = Get-Content -Raw -LiteralPath $descriptor
[xml]$currentDescriptor = Get-Content -Raw -LiteralPath (Join-Path $root 'app\META-INF\AIR\application.xml')
if ($incomingDescriptor.application.id -ne $currentDescriptor.application.id) { throw 'AIR identity changed; manual review required to preserve settings' }
Write-Host 'Decompiling update...'
& $ffdec -export script (Join-Path $stage 'src-decompiled') $original *> (Join-Path $stage 'decompile.log')
if ($LASTEXITCODE -ne 0) { throw "Decompile failed; see $stage" }
Copy-Item -LiteralPath (Join-Path $root 'src-mod') -Destination $stage -Recurse
$utf8 = New-Object System.Text.UTF8Encoding($false)
$modRoot = Join-Path $root 'src-mod'
$conflicts = @()
foreach ($mod in Get-ChildItem $modRoot -Filter *.as -File -Recurse) {
    $relative = $mod.FullName.Substring($modRoot.Length + 1)
    $base = Join-Path $root "src-decompiled\scripts\$relative"
    $fresh = Join-Path $stage "src-decompiled\scripts\$relative"
    $output = Join-Path $stage "src-mod\$relative"
    if (!(Test-Path $base) -or !(Test-Path $fresh)) { throw "Missing original class: $relative. Manual port required." }
    # git's native three-way merge retains both our edits and upstream changes.
    $merged = & git -c core.autocrlf=false merge-file -p -- $mod.FullName $base $fresh
    $mergeExit = $LASTEXITCODE
    if ($mergeExit -gt 127 -or $mergeExit -lt 0) { throw "Merge command failed: $relative" }
    [IO.File]::WriteAllText($output,($merged -join "`n") + "`n",$utf8)
    if ($mergeExit -ne 0) { $conflicts += $relative }
}
if ($conflicts.Count) { throw "Merge conflicts; live client unchanged. Resolve/review staged sources in $stage. Classes: $($conflicts -join ', ')" }
& git diff --no-index --stat -- (Join-Path $root 'src-decompiled\scripts') (Join-Path $stage 'src-decompiled\scripts') *> (Join-Path $stage 'upstream-diff.txt')
Copy-Item -LiteralPath (Join-Path $root 'profiles') -Destination $stage -Recurse
if (Test-Path (Join-Path $root 'drops')) { Copy-Item -LiteralPath (Join-Path $root 'drops') -Destination $stage -Recurse }
Get-ChildItem -LiteralPath $root -File | Where-Object { $_.Extension -in @('.js','.ps1') } | Copy-Item -Destination $stage
Copy-Item -LiteralPath (Join-Path $root 'portable.xml') -Destination $stage
New-Item -ItemType Directory -Path (Join-Path $stage 'build') | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'build\network-probe') -Destination (Join-Path $stage 'build') -Recurse
Push-Location $stage
try {
    foreach ($test in Get-ChildItem -Filter 'test-*.js' -File) {
        & node $test.FullName
        if ($LASTEXITCODE -ne 0) { throw "Regression test failed: $($test.Name). Live client unchanged." }
    }
} finally { Pop-Location }
& (Join-Path $root 'test-network-air.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Offline AIR logger test failed; live client unchanged' }
Write-Host 'Compiling merged client...'
$compiled = Join-Path $stage 'Evershade.mod.swf'
& $ffdec -onerror abort -air -importScript $original $compiled (Join-Path $stage 'src-mod') *> (Join-Path $stage 'compile.log')
if ($LASTEXITCODE -ne 0) { throw "Compile failed; live client unchanged. See $stage\compile.log" }
& $ffdec -export binaryData (Join-Path $stage 'catalog') $original *> (Join-Path $stage 'catalog.log')
if ($LASTEXITCODE -ne 0) { throw 'Catalog export failed; live client unchanged' }
Write-Host "Prepared and checked: $stage"
if (!$Apply) { Write-Host 'Preview only; installation unchanged. Review upstream-diff.txt and rerun with -Apply to install.'; return }
# Keep profile descriptors and launchers exactly as they are, and never touch AppData.
# Copy the SWF last so a failed preparation cannot replace the working client.
Get-ChildItem -LiteralPath $package | Where-Object Name -ne 'Evershade.swf' | Copy-Item -Destination (Join-Path $root 'app') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $stage 'src-mod') -Destination $root -Recurse -Force
Copy-Item -LiteralPath (Join-Path $stage 'src-decompiled') -Destination $root -Recurse -Force
Copy-Item -LiteralPath (Join-Path $stage 'catalog') -Destination (Join-Path $root 'build') -Recurse -Force
Copy-Item -LiteralPath $original -Destination (Join-Path $root 'backup\Evershade.original.swf') -Force
Copy-Item -LiteralPath $compiled -Destination (Join-Path $root 'build\Evershade.mod.swf') -Force
Copy-Item -LiteralPath $compiled -Destination (Join-Path $root 'app\Evershade.swf') -Force
if ((Get-FileHash $compiled).Hash -ne (Get-FileHash (Join-Path $root 'app\Evershade.swf')).Hash) { throw 'Installed hash mismatch; restore from backup' }
foreach ($profile in Get-ChildItem (Join-Path $root 'profiles') -File) {
    if ((Get-FileHash $profile.FullName).Hash -ne (Get-FileHash (Join-Path $backup "profiles\$($profile.Name)")).Hash) { throw 'Profile changed unexpectedly' }
}
Write-Host "Installed successfully. Backup/settings snapshot: $backup"
if (Test-Path (Join-Path $root 'open-drops.ps1')) { & (Join-Path $root 'open-drops.ps1') -BuildOnly }
Write-Host 'No clients restarted. Live server login still requires validation.'
