$ErrorActionPreference = 'Stop'
$ffdec = Join-Path $env:FFDEC_HOME 'ffdec-cli.exe'
$original = Join-Path $PSScriptRoot 'backup\Evershade.original.swf'
$output = Join-Path $PSScriptRoot 'build\Evershade.mod.swf'
New-Item -ItemType Directory (Split-Path $output) -Force | Out-Null
& $ffdec -onerror abort -air -importScript $original $output (Join-Path $PSScriptRoot 'src-mod')
if ($LASTEXITCODE -ne 0) { throw 'Compilation failed; app left unchanged.' }
Copy-Item -LiteralPath $output -Destination (Join-Path $PSScriptRoot 'app\Evershade.swf') -Force
Get-FileHash -LiteralPath $output
