param([Parameter(Mandatory=$true)][string]$Zip)
$ErrorActionPreference = 'Stop'
foreach ($tool in @('git','node')) { Get-Command $tool -ErrorAction Stop | Out-Null }
$ffdec = Join-Path $env:FFDEC_HOME 'ffdec-cli.exe'
if (!(Test-Path -LiteralPath $ffdec)) { throw 'Set FFDEC_HOME to your JPEXS directory.' }
if (!(Test-Path -LiteralPath (Join-Path $env:AIR_HOME 'bin\adl.exe'))) { throw 'Set AIR_HOME to your AIR SDK directory.' }
foreach ($folder in @('app','src-decompiled','src-mod')) {
    if (Test-Path (Join-Path $PSScriptRoot $folder)) { throw 'Already initialized or a previous setup left files. Use a fresh clone for setup; use update-client.ps1 for updates.' }
}
$stage = Join-Path $PSScriptRoot ('build\setup-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
Expand-Archive -LiteralPath $Zip -DestinationPath $stage
$swfs = @(Get-ChildItem -LiteralPath $stage -Recurse -File -Filter Evershade.swf)
if ($swfs.Count -ne 1) { throw 'Expected exactly one Evershade.swf in the ZIP.' }
$manifest = Get-Content -Raw (Join-Path $PSScriptRoot 'patches\baseline.json') | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $swfs[0].FullName).Hash -ne $manifest.sha256) {
    throw 'Wrong initial client version. These patches require the baseline hash in patches/baseline.json. Do not force them onto another SWF.'
}
$original = $swfs[0].FullName
Copy-Item -LiteralPath (Split-Path $original) -Destination (Join-Path $PSScriptRoot 'app') -Recurse
New-Item -ItemType Directory (Join-Path $PSScriptRoot 'backup') -Force | Out-Null
Copy-Item -LiteralPath $original -Destination (Join-Path $PSScriptRoot 'backup\Evershade.original.swf')
& $ffdec -export script (Join-Path $PSScriptRoot 'src-decompiled') $original *> (Join-Path $stage 'decompile.log')
if ($LASTEXITCODE -ne 0) { throw "Decompile failed; see $stage" }
foreach ($relative in $manifest.files) {
    $target = Join-Path $PSScriptRoot "src-mod\$relative"
    New-Item -ItemType Directory (Split-Path $target) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "src-decompiled\scripts\$relative") -Destination $target
}
Push-Location $PSScriptRoot
try {
    & git apply --check --directory=src-mod patches/client.patch
    if ($LASTEXITCODE -ne 0) { throw 'Patch check failed. Check the JPEXS version; no modified SWF installed.' }
    & git apply --directory=src-mod patches/client.patch
    if ($LASTEXITCODE -ne 0) { throw 'Patch application failed.' }
    foreach ($test in Get-ChildItem -Filter 'test-*.js' -File) {
        & node $test.FullName
        if ($LASTEXITCODE -ne 0) { throw "Test failed: $($test.Name)" }
    }
    & ./test-network-air.ps1
    & ./build-mod.ps1
    & $ffdec -export binaryData (Join-Path $PSScriptRoot 'build\catalog') $original *> (Join-Path $stage 'catalog.log')
    if ($LASTEXITCODE -ne 0) { throw 'Catalog export failed.' }
    & ./open-drops.ps1 -BuildOnly
} finally { Pop-Location }
Write-Host 'Setup complete. No clients launched. Run .\launch-mod.ps1 when ready.'
