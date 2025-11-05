@echo off
echo 🚀 Setting up Zero2oneZ...

echo 📦 Installing root dependencies...
call npm install

echo 📦 Installing renderer dependencies...
cd renderer
call npm install
cd ..

echo 🐍 Setting up Python environment...
cd python
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo ✅ Setup complete!
echo.
echo To start the project:
echo   npm run dev
echo.
echo Or start components separately:
echo   npm run dev:renderer  # Next.js UI
echo   npm run dev:electron  # Electron window
echo   npm run dev:python    # FastAPI sidecar

pause
