$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'blockhero-creator.local.json'
$defaultSupabaseUrl = 'https://alhlmdhixmlmsdvgzhdu.supabase.co'
$defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsaGxtZGhpeG1sbXNkdmd6aGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTY4NTQsImV4cCI6MjA4ODYzMjg1NH0.lkTNn1jeXzkQdCRnmtNAjejezJN_RfC1n5HEhCbV_n8'

if (Test-Path -LiteralPath $configPath) {
  [System.Windows.Forms.MessageBox]::Show(
    "Local creator config already exists.`n$configPath",
    'BlockHero Creator',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
  ) | Out-Null
  exit 0
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'BlockHero Creator Setup'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(460, 240)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = 'Set up local auto-login for this PC'
$titleLabel.Location = New-Object System.Drawing.Point(20, 18)
$titleLabel.Size = New-Object System.Drawing.Size(400, 24)
$titleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($titleLabel)

$descLabel = New-Object System.Windows.Forms.Label
$descLabel.Text = 'Enter the admin email and password once. The file stays on this PC and is ignored by git.'
$descLabel.Location = New-Object System.Drawing.Point(20, 48)
$descLabel.Size = New-Object System.Drawing.Size(420, 34)
$form.Controls.Add($descLabel)

$emailLabel = New-Object System.Windows.Forms.Label
$emailLabel.Text = 'Admin email'
$emailLabel.Location = New-Object System.Drawing.Point(20, 95)
$emailLabel.Size = New-Object System.Drawing.Size(100, 20)
$form.Controls.Add($emailLabel)

$emailBox = New-Object System.Windows.Forms.TextBox
$emailBox.Location = New-Object System.Drawing.Point(20, 118)
$emailBox.Size = New-Object System.Drawing.Size(420, 24)
$form.Controls.Add($emailBox)

$passwordLabel = New-Object System.Windows.Forms.Label
$passwordLabel.Text = 'Admin password'
$passwordLabel.Location = New-Object System.Drawing.Point(20, 150)
$passwordLabel.Size = New-Object System.Drawing.Size(120, 20)
$form.Controls.Add($passwordLabel)

$passwordBox = New-Object System.Windows.Forms.TextBox
$passwordBox.Location = New-Object System.Drawing.Point(20, 173)
$passwordBox.Size = New-Object System.Drawing.Size(420, 24)
$passwordBox.UseSystemPasswordChar = $true
$form.Controls.Add($passwordBox)

$okButton = New-Object System.Windows.Forms.Button
$okButton.Text = 'Save and Launch'
$okButton.Location = New-Object System.Drawing.Point(230, 205)
$okButton.Size = New-Object System.Drawing.Size(100, 28)
$okButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.Controls.Add($okButton)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = 'Cancel'
$cancelButton.Location = New-Object System.Drawing.Point(340, 205)
$cancelButton.Size = New-Object System.Drawing.Size(100, 28)
$cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.Controls.Add($cancelButton)

$form.AcceptButton = $okButton
$form.CancelButton = $cancelButton

$dialogResult = $form.ShowDialog()
if ($dialogResult -ne [System.Windows.Forms.DialogResult]::OK) {
  exit 1
}

$email = $emailBox.Text.Trim()
$password = $passwordBox.Text

if ([string]::IsNullOrWhiteSpace($email)) {
  [System.Windows.Forms.MessageBox]::Show(
    'Admin email is required.',
    'BlockHero Creator',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  ) | Out-Null
  exit 1
}

if ([string]::IsNullOrWhiteSpace($password)) {
  [System.Windows.Forms.MessageBox]::Show(
    'Admin password is required.',
    'BlockHero Creator',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  ) | Out-Null
  exit 1
}

$config = [ordered]@{
  supabaseUrl     = $defaultSupabaseUrl
  supabaseAnonKey = $defaultSupabaseAnonKey
  email           = $email
  password        = $password
  autoLogin       = $true
}

$config | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $configPath -Encoding UTF8

[System.Windows.Forms.MessageBox]::Show(
  "Created local config.`n$configPath",
  'BlockHero Creator',
  [System.Windows.Forms.MessageBoxButtons]::OK,
  [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null
