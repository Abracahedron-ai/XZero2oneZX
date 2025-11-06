# Zero2oneZ GUI Startup Script
# This script starts all services with proper port configuration

Write-Host "=== Zero2oneZ GUI Startup ===" -ForegroundColor Cyan
Write-Host ""

# Check dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow

$rootNodeModules = Test-Path "node_modules"
$rendererNodeModules = Test-Path "src\frontend\renderer\node_modules"

if (-not $rootNodeModules) {
    Write-Host "Installing root dependencies..." -ForegroundColor Yellow
    npm install
}

if (-not $rendererNodeModules) {
    Write-Host "Installing renderer dependencies..." -ForegroundColor Yellow
    Push-Location "src\frontend\renderer"
    npm install
    Pop-Location
}

Write-Host "Dependencies OK" -ForegroundColor Green
Write-Host ""

# Check if ports are available
Write-Host "Checking ports..." -ForegroundColor Yellow

$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
$port8001 = Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port8000) {
    Write-Host "WARNING: Port 8000 is occupied. Using port 8001 for Python API." -ForegroundColor Yellow
    $pythonPort = 8001
} else {
    $pythonPort = 8000
}

if ($port3000) {
    Write-Host "WARNING: Port 3000 is occupied. Please stop the process using it." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host "- Next.js Renderer: http://localhost:3000" -ForegroundColor White
Write-Host "- Python API: http://localhost:$pythonPort" -ForegroundColor White
Write-Host "- Electron: Will open automatically" -ForegroundColor White
Write-Host ""

# Check Python dependencies
Write-Host "Checking Python dependencies..." -ForegroundColor Yellow
$pythonRequirements = Test-Path "src\backend\api\requirements.txt"
if ($pythonRequirements) {
    Write-Host "Python requirements found. Ensure dependencies are installed." -ForegroundColor Yellow
    Write-Host "  Run: pip install -r src\backend\api\requirements.txt" -ForegroundColor Gray
}

# Start Python API
Write-Host "[1/3] Starting Python API on port $pythonPort..." -ForegroundColor Cyan
$env:PYTHONPATH = "$PSScriptRoot"
$venvPython = if (Test-Path "$PSScriptRoot\venv\Scripts\python.exe") { "$PSScriptRoot\venv\Scripts\python.exe" } else { "python" }
$pythonCommand = "cd '$PSScriptRoot'; `$env:PYTHONPATH = '$PSScriptRoot'; Write-Host 'Python API starting on port $pythonPort...' -ForegroundColor Green; cd 'src\backend\api'; & '$venvPython' -m uvicorn main:app --reload --host 0.0.0.0 --port $pythonPort"
$pythonProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $pythonCommand -PassThru
Start-Sleep -Seconds 2

# Start Next.js Renderer
Write-Host "[2/3] Starting Next.js Renderer on port 3000..." -ForegroundColor Cyan
$rendererProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\src\frontend\renderer'; Write-Host 'Next.js Renderer starting on port 3000...' -ForegroundColor Green; npm run dev" -PassThru
Start-Sleep -Seconds 2

# Start Electron
Write-Host "[3/3] Starting Electron window..." -ForegroundColor Cyan
$electronProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host 'Electron starting...' -ForegroundColor Green; npx electron ." -PassThru

Write-Host ""
Write-Host "=== Services Started ===" -ForegroundColor Green
Write-Host "All services are starting in separate windows." -ForegroundColor White
Write-Host ""
Write-Host "Access points:" -ForegroundColor Cyan
Write-Host "  - Browser: http://localhost:3000" -ForegroundColor White
Write-Host "  - API Docs: http://localhost:$pythonPort/docs" -ForegroundColor White
Write-Host ""
Write-Host "Process IDs:" -ForegroundColor Cyan
Write-Host "  - Python API: $($pythonProcess.Id)" -ForegroundColor White
Write-Host "  - Renderer: $($rendererProcess.Id)" -ForegroundColor White
Write-Host "  - Electron: $($electronProcess.Id)" -ForegroundColor White
Write-Host ""
Write-Host "Note: First build of Next.js may take a few minutes." -ForegroundColor Yellow
Write-Host ""

# Wait a bit and check status
Start-Sleep -Seconds 5
Write-Host "Checking service status..." -ForegroundColor Yellow

$checkPorts = @{
    "3000" = "Next.js Renderer"
    "$pythonPort" = "Python API"
}

foreach ($port in $checkPorts.Keys) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "  [OK] $($checkPorts[$port]) is listening on port $port" -ForegroundColor Green
    } else {
        Write-Host "  [X] $($checkPorts[$port]) is not ready yet on port $port" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Services are starting. Check the opened windows for detailed logs." -ForegroundColor Cyan

