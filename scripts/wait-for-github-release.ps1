param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [string]$Repository = 'sinnaruggggg/blockhero',
  [int]$TimeoutMinutes = 20,
  [int]$PollSeconds = 20
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Get-GitHubJson {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  $headers = @{
    'User-Agent' = 'BlockHeroReleaseVerifier'
    'Accept' = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
    'Cache-Control' = 'no-cache'
  }

  try {
    return Invoke-RestMethod -UseBasicParsing -Headers $headers -Uri $Url
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 404) {
      return $null
    }
    throw
  }
}

function Get-ReleaseAssetName {
  param(
    [object]$Release
  )

  if (-not $Release -or -not $Release.assets) {
    return $null
  }

  $apkAsset = $Release.assets | Where-Object { $_.name -like '*.apk' } | Select-Object -First 1
  if (-not $apkAsset) {
    return $null
  }

  return $apkAsset.name
}

$tag = if ($Version.StartsWith('v')) { $Version } else { "v$Version" }
$deadline = (Get-Date).AddMinutes($TimeoutMinutes)

Write-Host "Waiting for GitHub release $tag in $Repository"

while ((Get-Date) -lt $deadline) {
  $tagRelease = Get-GitHubJson "https://api.github.com/repos/$Repository/releases/tags/$tag"
  $latestRelease = Get-GitHubJson "https://api.github.com/repos/$Repository/releases/latest"
  $runs = Get-GitHubJson "https://api.github.com/repos/$Repository/actions/runs?per_page=20"

  $apkAssetName = Get-ReleaseAssetName $tagRelease
  $latestTag = if ($latestRelease) { $latestRelease.tag_name } else { '<none>' }

  if ($tagRelease -and $tagRelease.tag_name -eq $tag -and $apkAssetName) {
    Write-Host "Release ready: $($tagRelease.tag_name)"
    Write-Host "Latest release: $latestTag"
    Write-Host "APK asset: $apkAssetName"
    exit 0
  }

  $run = $null
  if ($runs -and $runs.workflow_runs) {
    $run = $runs.workflow_runs |
      Where-Object { $_.name -eq 'Release APK' -and $_.head_branch -eq $tag } |
      Select-Object -First 1
  }

  if ($run -and $run.status -eq 'completed' -and $run.conclusion -ne 'success') {
    Write-Error "Release workflow failed for $tag. Conclusion: $($run.conclusion). Run: $($run.html_url)"
    exit 1
  }

  $runStatus = if ($run) {
    "$($run.status)/$($run.conclusion)"
  } else {
    'no-run-found'
  }

  Write-Host "Not ready yet. latest=$latestTag, workflow=$runStatus"
  Start-Sleep -Seconds $PollSeconds
}

Write-Error "Timed out waiting for $tag release in $Repository."
exit 1
