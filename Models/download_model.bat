@echo off
REM Simple wrapper for Hugging Face model downloader on Windows

if "%~1"=="" (
    echo Usage: download_model.bat ^<model_id^> [^<model_id^> ...]
    echo Example: download_model.bat facebook/metaclip-h14-fullcc2.5b
    echo.
    echo Use --help for full options
    py hf_downloader.py --help
    exit /b 1
)

py hf_downloader.py %*




