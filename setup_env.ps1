# setup_env.ps1
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Automated Setup: Python & Nightshade/Glaze Venv" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$env:Path += ";$env:LOCALAPPDATA\Microsoft\WindowsApps"

# 1. Check if Python is installed; if not, install latest Python 3 using winget
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python not found. Installing Python via winget..." -ForegroundColor Yellow
    
    # Installs the latest stable Python 3 release system/user-wide
    winget install --id Python.Python.3 --exact --source winget --accept-package-agreements --accept-source-agreements
    
    # Refresh PATH in current session to pick up newly installed python.exe
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "Python installation detected:" -ForegroundColor Green
    python --version
}

# 2. Upgrade Python via winget to ensure latest version
Write-Host "Ensuring Python package is up-to-date..." -ForegroundColor Yellow
winget upgrade --id Python.Python.3 --exact --accept-package-agreements --accept-source-agreements --silent

# 3. Create virtual environment (.venv-art)
if (-not (Test-Path ".venv-art")) {
    Write-Host "Creating Python virtual environment (.venv-art)..." -ForegroundColor Yellow
    python -m venv .venv-art
} else {
    Write-Host "Virtual environment '.venv-art' already exists." -ForegroundColor Green
}

# 4. Activate virtual environment and install dependencies
Write-Host "Installing Python dependencies into virtual environment..." -ForegroundColor Yellow
& .\.venv-art\Scripts\python.exe -m pip install --upgrade pip setuptools wheel

Write-Host ""
Write-Host "Setup complete! Virtual environment '.venv-art' is configured." -ForegroundColor Green