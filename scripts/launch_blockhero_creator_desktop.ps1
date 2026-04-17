$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$portablePattern = Join-Path $root 'tools\blockhero-creator-desktop\dist\BlockHero Creator *.exe'
$unpackedExe = Join-Path $root 'tools\blockhero-creator-desktop\dist\win-unpacked\BlockHero Creator.exe'

$portableExe = Get-ChildItem -Path $portablePattern -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$candidates = @()
if ($portableExe) {
  $candidates += [pscustomobject]@{
    Path = $portableExe.FullName
    LastWriteTime = $portableExe.LastWriteTime
  }
}

if (Test-Path -LiteralPath $unpackedExe) {
  $unpackedItem = Get-Item -LiteralPath $unpackedExe
  $candidates += [pscustomobject]@{
    Path = $unpackedItem.FullName
    LastWriteTime = $unpackedItem.LastWriteTime
  }
}

if ($candidates.Count -gt 0) {
  $latest = $candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  Start-Process -FilePath $latest.Path | Out-Null
  exit 0
}

Write-Host 'BlockHero Creator desktop executable was not found.'
Write-Host 'Run "npm run creator:exe" first.'
exit 1
