$ErrorActionPreference = 'Stop'
$probeDirectory = Join-Path $PSScriptRoot 'build\network-probe'
$sdkBin = Join-Path $env:AIR_HOME 'bin'
$ffdec = Join-Path $env:FFDEC_HOME 'ffdec-cli.exe'
& (Join-Path $sdkBin 'amxmlc.bat') "-output=$probeDirectory\original.swf" (Join-Path $probeDirectory 'NetworkProbe.as')
if ($LASTEXITCODE -ne 0) { throw 'AIR probe compilation failed' }
& $ffdec -onerror abort -air -importScript (Join-Path $probeDirectory 'original.swf') (Join-Path $probeDirectory 'NetworkProbe.swf') $probeDirectory
if ($LASTEXITCODE -ne 0) { throw 'JPEXS probe import failed' }
# Separate invisible AIR application; never loads game credentials or connects to a server.
& (Join-Path $sdkBin 'adl.exe') -profile extendedDesktop (Join-Path $probeDirectory 'probe.xml') $probeDirectory
if ($LASTEXITCODE -ne 0) { throw 'AIR rejected or failed the imported logger' }
