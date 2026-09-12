param([string]$AirSdk = $env:AIR_HOME)
$ErrorActionPreference = 'Stop'
foreach ($profileName in @('LeaderPlayer','FollowerOne','FollowerTwo')) {
    & (Join-Path $PSScriptRoot 'launch-mod.ps1') -Profile $profileName -AirSdk $AirSdk -ArrangeGrid
}
