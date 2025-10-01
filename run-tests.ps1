# Angular Chat Application Test Runner
# Usage: .\run-tests.ps1 [-Install] [-All]

param(
    [switch]$Install,
    [switch]$All
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Angular Chat Application Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[INFO] Checking Node.js..." -ForegroundColor Blue
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed" -ForegroundColor Red
    exit 1
}

# Install dependencies
if ($Install) {
    Write-Host ""
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Blue

    Write-Host "Installing client dependencies..." -ForegroundColor Yellow
    Set-Location -Path "client"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install client dependencies" -ForegroundColor Red
        Set-Location -Path ".."
        exit 1
    }
    Set-Location -Path ".."

    Write-Host "Installing server dependencies..." -ForegroundColor Yellow
    Set-Location -Path "server"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install server dependencies" -ForegroundColor Red
        Set-Location -Path ".."
        exit 1
    }
    Set-Location -Path ".."
}

# Run backend tests
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Backend Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Set-Location -Path "server"
npm test -- --coverage
$backendExit = $LASTEXITCODE
Set-Location -Path ".."

if ($backendExit -eq 0) {
    Write-Host "[SUCCESS] Backend tests passed!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Backend tests had some failures" -ForegroundColor Yellow
}

# Run frontend tests if --All specified
if ($All) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Running Frontend Tests" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Set-Location -Path "client"
    npm test -- --watch=false --browsers=ChromeHeadless
    $frontendExit = $LASTEXITCODE
    Set-Location -Path ".."

    if ($frontendExit -eq 0) {
        Write-Host "[SUCCESS] Frontend tests passed!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Frontend tests had some failures" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($backendExit -eq 0) {
    Write-Host "Backend:  PASSED" -ForegroundColor Green
} else {
    Write-Host "Backend:  FAILED" -ForegroundColor Red
}

if ($All) {
    if ($frontendExit -eq 0) {
        Write-Host "Frontend: PASSED" -ForegroundColor Green
    } else {
        Write-Host "Frontend: FAILED" -ForegroundColor Red
    }
}

Write-Host "========================================" -ForegroundColor Cyan
