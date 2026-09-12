param([string]$AirSdk = $env:AIR_HOME, [ValidateSet('Default','LeaderPlayer','FollowerOne','FollowerTwo')][string]$Profile = 'Default', [switch]$ArrangeGrid)

$ErrorActionPreference = 'Stop'
$appDirectory = Join-Path $PSScriptRoot 'app'
$descriptor = Join-Path $appDirectory 'META-INF\AIR\application.xml'
if ([string]::IsNullOrWhiteSpace($AirSdk)) {
    throw 'Set AIR_HOME or pass -AirSdk to your installed AIR SDK.'
}
$adl = Join-Path $AirSdk 'bin\adl.exe'
if (-not (Test-Path -LiteralPath $adl -PathType Leaf)) {
    throw "AIR SDK missing: $adl. Download the Windows SDK from https://airsdk.harman.com/download after accepting its terms, extract it to tools\air-sdk, or pass -AirSdk 'C:\path\to\sdk'."
}
if ($Profile -ne 'Default') {
    $descriptor = Join-Path $PSScriptRoot "profiles\$Profile.xml"
}
$running = Get-CimInstance Win32_Process -Filter "Name='adl.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($descriptor) }
if ($running -and -not $ArrangeGrid) { throw 'This development client is already running.' }
$logs = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $logs "adl-$Profile-$stamp.stdout.log"
$stderr = Join-Path $logs "adl-$Profile-$stamp.stderr.log"
$arguments = @('-profile', 'extendedDesktop', ('"' + $descriptor + '"'), ('"' + $appDirectory + '"'))
if ($ArrangeGrid) { $arguments += @('--','--lab-grid') }
$process = Start-Process -FilePath $adl -ArgumentList $arguments -WorkingDirectory $appDirectory -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
if ($process.WaitForExit(3000)) {
    if ($running -and $ArrangeGrid -and $process.ExitCode -in @(0,1)) {
        Write-Host "${Profile}: grid invocation sent to the existing client (requires the grid-enabled SWF)."
        return
    }
    throw "ADL exited with code $($process.ExitCode). See $stdout and $stderr."
}
Write-Host "ADL process started (PID $($process.Id)); verify the game window."
Write-Host "Startup logs: $logs"
