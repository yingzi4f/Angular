@echo off
echo ========================================
echo Running Angular Chat Application Tests
echo ========================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check Node.js
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)
node --version
echo.

REM Install dependencies if needed
if "%1"=="--install" (
    echo [INFO] Installing client dependencies...
    cd client
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install client dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo.

    echo [INFO] Installing server dependencies...
    cd server
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install server dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo.
)

REM Run backend tests
echo ========================================
echo Running Backend Tests
echo ========================================
cd server
call npm test -- --coverage
set BACKEND_EXIT=%errorlevel%
cd ..
echo.

if %BACKEND_EXIT% equ 0 (
    echo [SUCCESS] Backend tests passed!
) else (
    echo [WARNING] Backend tests had some failures
)
echo.

REM Run frontend tests (if requested)
if "%1"=="--all" (
    echo ========================================
    echo Running Frontend Tests
    echo ========================================
    cd client
    call npm test -- --watch=false --browsers=ChromeHeadless
    set FRONTEND_EXIT=%errorlevel%
    cd ..
    echo.

    if %FRONTEND_EXIT% equ 0 (
        echo [SUCCESS] Frontend tests passed!
    ) else (
        echo [WARNING] Frontend tests had some failures
    )
    echo.
)

REM Summary
echo ========================================
echo Test Summary
echo ========================================
if %BACKEND_EXIT% equ 0 (
    echo Backend:  PASSED
) else (
    echo Backend:  FAILED
)

if "%1"=="--all" (
    if %FRONTEND_EXIT% equ 0 (
        echo Frontend: PASSED
    ) else (
        echo Frontend: FAILED
    )
)
echo ========================================
echo.

echo Press any key to exit...
pause >nul
