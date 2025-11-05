#!/bin/bash

echo "🚀 Setting up Zero2oneZ..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install renderer dependencies
echo "📦 Installing renderer dependencies..."
cd renderer && npm install && cd ..

# Setup Python environment
echo "🐍 Setting up Python environment..."
cd python
python -m venv venv

# Activate venv and install requirements
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

pip install --upgrade pip
pip install -r requirements.txt

cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the project:"
echo "  npm run dev"
echo ""
echo "Or start components separately:"
echo "  npm run dev:renderer  # Next.js UI"
echo "  npm run dev:electron  # Electron window"
echo "  npm run dev:python    # FastAPI sidecar"
