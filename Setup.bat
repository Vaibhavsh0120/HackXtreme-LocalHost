@echo off

:: Relaunch in persistent terminal
if "%1" neq "run" (
    cmd /k "%~f0 run"
    exit /b
)

title React Native Environment Setup

:: Enable ANSI colors
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"

set GREEN=%ESC%[92m
set RED=%ESC%[91m
set YELLOW=%ESC%[93m
set RESET=%ESC%[0m

echo.
echo ==========================================
echo React Native Project Setup
echo ==========================================
echo.

set ERROR_FOUND=0

echo %YELLOW%[1/7] Checking Node.js...%RESET%

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%Node.js not installed%RESET%
    echo Install Node.js 18+ https://nodejs.org
    set ERROR_FOUND=1
) else (
    for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VERSION=%%a
    echo %GREEN%You have correct Node installed:%RESET%
    node -v
)

echo.
echo %YELLOW%[2/7] Checking Java...%RESET%

where java >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%Java not installed%RESET%
    echo Install JDK 17
    set ERROR_FOUND=1
) else (
    echo %GREEN%Java detected%RESET%
    java -version
)

echo.
echo %YELLOW%[3/7] Detecting Android SDK...%RESET%

if defined ANDROID_HOME (
    echo %GREEN%ANDROID_HOME detected:%RESET%
    echo %ANDROID_HOME%
) else (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
        echo %GREEN%Android SDK found automatically%RESET%
    )
)

if not defined ANDROID_HOME (
    echo %RED%Android SDK not found%RESET%
    echo Install Android Studio
    set ERROR_FOUND=1
)

echo.
echo %YELLOW%[4/7] Checking Android tools...%RESET%

set SDKMANAGER=%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat

if not exist "%SDKMANAGER%" (
    echo %RED%sdkmanager not found%RESET%
    echo Install Android Command Line Tools
    set ERROR_FOUND=1
) else (
    echo %GREEN%sdkmanager detected%RESET%
)

echo.
echo %YELLOW%[5/7] Installing Android dependencies...%RESET%
@REM LATEST SUPPORTED NDK: 28.0.13004108
if exist "%ANDROID_HOME%\ndk\27.1.12297006" (
    echo %GREEN%NDK already installed%RESET%
) else (
    echo Installing NDK...
    "%SDKMANAGER%" "ndk;27.1.12297006"
)

if exist "%ANDROID_HOME%\build-tools\36.0.0" (
    echo %GREEN%Build Tools installed%RESET%
) else (
    echo Installing Build Tools...
    "%SDKMANAGER%" "build-tools;36.0.0"
)

if exist "%ANDROID_HOME%\platforms\android-36" (
    echo %GREEN%Android SDK 36 installed%RESET%
) else (
    echo Installing Android Platform...
    "%SDKMANAGER%" "platforms;android-36"
)

echo.
echo %YELLOW%[6/7] Installing npm dependencies...%RESET%
if exist package.json (
    npm install --loglevel=error
    if %ERRORLEVEL%==0 (
        echo %GREEN%npm dependencies installed successfully%RESET%
    ) else (
        echo %RED%npm install failed%RESET%
        set ERROR_FOUND=1
    )
) else (
    echo %RED%package.json not found%RESET%
)
@REM node postinstall-fixes.js

echo.
echo %YELLOW%[7/7] Running React Native Doctor...%RESET%

npx react-native doctor

echo.
echo ==========================================

if %ERROR_FOUND%==1 (
    echo %RED%Setup finished with errors%RESET%
) else (
    echo %GREEN%Setup completed successfully%RESET%
)

echo ==========================================
echo.
echo Press any key to close terminal...
pause >nul