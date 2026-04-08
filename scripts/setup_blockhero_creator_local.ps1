$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'blockhero-creator.local.json'
$defaultSupabaseUrl = 'https://alhlmdhixmlmsdvgzhdu.supabase.co'
$defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImFsaGxtZGhpeG1sbXNkdmd6aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY4NTQsImV4cCI6MjA4ODYzMjg1NH0.lkTNn1jeXzkQdCRnmtNAjejezJN_RfC1n5HEhCbV_n8'

if (Test-Path -LiteralPath $configPath) {
  Write-Host "blockhero-creator.local.json already exists."
  exit 0
}

Write-Host ''
Write-Host 'BlockHero Creator 로컬 자동 로그인 설정'
Write-Host '이 설정 파일은 현재 PC에만 저장되며 Git에는 포함되지 않습니다.'
Write-Host ''

$email = Read-Host '관리자 이메일'
if ([string]::IsNullOrWhiteSpace($email)) {
  Write-Host '이메일이 비어 있어 설정을 중단합니다.'
  exit 1
}

$securePassword = Read-Host '관리자 비밀번호' -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
}

if ([string]::IsNullOrWhiteSpace($password)) {
  Write-Host '비밀번호가 비어 있어 설정을 중단합니다.'
  exit 1
}

$config = [ordered]@{
  supabaseUrl = $defaultSupabaseUrl
  supabaseAnonKey = $defaultSupabaseAnonKey
  email = $email
  password = $password
  autoLogin = $true
}

$config | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $configPath -Encoding UTF8

Write-Host ''
Write-Host "생성 완료: $configPath"
Write-Host '이제 run-blockhero-creator-exe.bat 을 실행하면 자동 로그인합니다.'
