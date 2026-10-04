<#
.SYNOPSIS
  VERSION(yyyy.MM.dd.N)을 오늘 날짜 기준으로 올리고 VERSION 파일만 커밋한다.

.DESCRIPTION
  - VERSION의 날짜가 오늘이면 순서 +1, 아니면 '오늘날짜.1'
  - 다른 변경 파일은 커밋에 포함하지 않는다
  - main에 push되면 GitHub Actions가 Docker 이미지를 빌드해 GHCR에 올린다

.PARAMETER Push
  커밋 후 현재 브랜치를 바로 push한다.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/bump-version.ps1
  powershell -ExecutionPolicy Bypass -File scripts/bump-version.ps1 -Push
#>
param([switch]$Push)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$file = Join-Path $root 'VERSION'
$today = Get-Date -Format 'yyyy.MM.dd'

$seq = 1
if (Test-Path $file) {
    $current = (Get-Content $file -Raw).Trim()
    if ($current -match '^(\d{4}\.\d{2}\.\d{2})\.(\d+)$' -and $Matches[1] -eq $today) {
        $seq = [int]$Matches[2] + 1
    }
}
$next = "$today.$seq"

# BOM 없는 UTF-8, LF
[IO.File]::WriteAllText($file, "$next`n")

git -C $root add -- VERSION
if ($LASTEXITCODE -ne 0) { throw 'git add 실패' }
git -C $root commit -m "버전 $next" -- VERSION
if ($LASTEXITCODE -ne 0) { throw 'git commit 실패' }
Write-Host "VERSION -> $next" -ForegroundColor Green

if ($Push) {
    git -C $root push
    if ($LASTEXITCODE -ne 0) { throw 'git push 실패' }
}
else {
    Write-Host 'push하면 이미지 빌드가 시작됩니다: git push'
}
