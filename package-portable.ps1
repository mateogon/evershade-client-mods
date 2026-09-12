param([string]$AirSdk = $env:AIR_HOME)
$ErrorActionPreference = 'Stop'
$adt = Join-Path $AirSdk 'bin\adt.bat'
if (!(Test-Path -LiteralPath $adt)) { throw 'Set AIR_HOME to your licensed/eligible AIR SDK.' }
# Reuse a local self-signed AIR certificate, never included in package inputs.
# DPAPI protects its password for this Windows user. This is not Authenticode.
$signing = Join-Path $PSScriptRoot 'build\portable-signing'
$certificate = Join-Path $signing 'publisher.p12'
$passwordFile = Join-Path $signing 'password.secure'
if (!(Test-Path $certificate)) {
    if (Test-Path $passwordFile) { throw 'Incomplete signing store; recover it before creating another publisher identity.' }
    New-Item -ItemType Directory $signing -Force | Out-Null
    $newPassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $protectedPassword = ConvertTo-SecureString $newPassword -AsPlainText -Force
    $protectedPassword | ConvertFrom-SecureString | Set-Content -LiteralPath $passwordFile
    & $adt -certificate -cn 'Evershade Community' -validityPeriod 10 2048-RSA $certificate $newPassword
    if ($LASTEXITCODE -ne 0) { throw 'Local AIR certificate creation failed.' }
    $newPassword = $null
}
if (!(Test-Path $passwordFile)) { throw 'Missing local signing password; restore the signing store.' }
$securePassword = Get-Content -LiteralPath $passwordFile | ConvertTo-SecureString
$signPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$stage = Join-Path $PSScriptRoot "build\portable-$stamp"
$inputDir = Join-Path $stage 'input'
$bundle = Join-Path $stage 'Evershade-Portable'
New-Item -ItemType Directory $inputDir | Out-Null
# Allowlist inputs: never copy an existing app/runtime, profiles or saved state.
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'build\Evershade.mod.swf') -Destination (Join-Path $inputDir 'Evershade.swf')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'portable.xml') -Destination (Join-Path $inputDir 'application.xml')
New-Item -ItemType Directory (Join-Path $inputDir 'assets') | Out-Null
foreach ($icon in @('soul16.png','soul32.png','soul48.png','soul128.png')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "app\assets\$icon") -Destination (Join-Path $inputDir 'assets')
}
# ADT generates the captive runtime and its integrity metadata for this exact SWF.
& $adt -package -storetype PKCS12 -keystore $certificate -storepass $signPassword -tsa none -target bundle -arch x64 $bundle (Join-Path $inputDir 'application.xml') -C $inputDir Evershade.swf assets
$signPassword = $null
if ($LASTEXITCODE -ne 0) { throw "ADT packaging failed; no release ZIP produced. See $stage" }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'PORTABLE.md') -Destination (Join-Path $bundle 'START-HERE.txt')
$zip = Join-Path $stage 'Evershade-Portable-Windows-x64.zip'
Compress-Archive -LiteralPath $bundle -DestinationPath $zip
Get-FileHash -LiteralPath $zip
Write-Host "Portable folder: $bundle"
Write-Host "Release ZIP: $zip"
Write-Host 'Test a clean extracted copy before publishing. Never overwrite the SWF inside a signed bundle.'
