param([switch]$BuildOnly)
$ErrorActionPreference = 'Stop'
$catalog = @(Get-ChildItem (Join-Path $PSScriptRoot 'build\catalog') -Filter '*EmbeddedData_BossWikiCXML.bin')
if ($catalog.Count -ne 1) { throw 'Expected one BossWiki catalog. Run the client updater first.' }
[xml]$wiki = Get-Content -Raw -LiteralPath $catalog[0].FullName
$bosses = @($wiki.BossWiki.Boss | ForEach-Object {
    $boss = $_
    $row = [ordered]@{}
    foreach ($attr in $boss.Attributes) { $row[$attr.Name] = $attr.Value }
    $row.drops = @($boss.Drop | Where-Object { $_ -is [System.Xml.XmlElement] } | ForEach-Object {
        $drop = [ordered]@{}
        foreach ($attr in $_.Attributes) { $drop[$attr.Name] = $attr.Value }
        $drop
    })
    $row
})
if ($bosses.Count -eq 0) { throw 'Catalog contains no bosses' }
$data = @{generated=(Get-Date).ToString('s'); source=$catalog[0].Name; hash=(Get-FileHash $catalog[0].FullName).Hash; bosses=$bosses}
$json = ConvertTo-Json -InputObject $data -Depth 8 -Compress
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'drops\data.js'), 'window.DROP_DATA=' + $json + ';', (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Drop explorer refreshed: $($bosses.Count) monsters."
if (!$BuildOnly) { Start-Process (Join-Path $PSScriptRoot 'drops\index.html') }
