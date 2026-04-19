$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$portablePattern = Join-Path $root 'tools\blockhero-creator-desktop\dist\BlockHero Creator *.exe'
$unpackedExe = Join-Path $root 'tools\blockhero-creator-desktop\dist\win-unpacked\BlockHero Creator.exe'

$portableExe = Get-ChildItem -Path $portablePattern -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (Test-Path -LiteralPath $unpackedExe) {
  $unpackedItem = Get-Item -LiteralPath $unpackedExe
  if (-not $portableExe -or $unpackedItem.LastWriteTime -gt $portableExe.LastWriteTime) {
    Start-Process -FilePath $unpackedExe | Out-Null
    exit 0
  }
}

if ($portableExe) {
  Start-Process -FilePath $portableExe.FullName | Out-Null
  exit 0
}

Write-Host 'BlockHero Creator desktop executable was not found.'
Write-Host 'Run "npm run creator:exe" first.'
exit 1
