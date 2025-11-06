const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const net = require('net');

let mainWindow;
let pythonProcess;
let wss;
let wsPort = 8080;

// Start Python FastAPI sidecar
async function startPythonSidecar() {
  // Find Python executable - prefer venv, fallback to system python
  const projectRoot = path.join(__dirname, '..', '..', '..');
  const venvPython = process.platform === 'win32'
    ? path.join(projectRoot, 'venv', 'Scripts', 'python.exe')
    : path.join(projectRoot, 'venv', 'bin', 'python');
  
  let pythonExecutable = 'python';
  
  if (fs.existsSync(venvPython)) {
    pythonExecutable = venvPython;
    console.log('[Python] Using venv Python:', pythonExecutable);
  } else {
    // Try python3 as fallback
    pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
    console.log('[Python] Using system Python:', pythonExecutable);
  }

  // Find available port for Python API
  const apiPort = await findAvailablePort(8000, 10);
  console.log(`[Python] Starting FastAPI on port ${apiPort}`);

  const apiPath = path.join(__dirname, '..', '..', 'backend', 'api');
  const cwd = apiPath;
  
  // Use uvicorn to run the FastAPI app
  pythonProcess = spawn(pythonExecutable, [
    '-m', 'uvicorn',
    'main:app',
    '--reload',
    '--host', '0.0.0.0',
    '--port', apiPort.toString()
  ], {
    cwd: cwd,
    env: {
      ...process.env,
      PYTHONPATH: apiPath
    }
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python] ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Error] ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });

  pythonProcess.on('error', (error) => {
    console.error('[Python] Failed to start Python process:', error);
    console.error('[Python] Make sure Python is installed and in PATH, or venv is set up correctly');
  });
}

// Check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Find an available port starting from the given port
async function findAvailablePort(startPort = 8080, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

// Check if a server is listening on a port (opposite of isPortAvailable)
function isPortListening(port) {
  return new Promise((resolve) => {
    const client = net.createConnection({ port, host: 'localhost' }, () => {
      client.end();
      resolve(true);
    });
    client.on('error', () => resolve(false));
    client.setTimeout(1000, () => {
      client.destroy();
      resolve(false);
    });
  });
}

// Wait for Next.js server to be ready
async function waitForNextJsServer(maxWait = 60000, checkInterval = 2000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    const isReady = await isPortListening(3000);
    if (isReady) {
      console.log('[Electron] Next.js server is ready on port 3000');
      return true;
    }
    console.log('[Electron] Waiting for Next.js server to start...');
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  console.warn('[Electron] Next.js server did not start within timeout');
  return false;
}

// WebSocket server for real-time state sync
async function startWebSocketServer() {
  try {
    // Find an available port
    wsPort = await findAvailablePort(8080);
    
    wss = new WebSocket.Server({ port: wsPort });

    wss.on('connection', (ws) => {
      console.log('[WS] Client connected');

      ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        // Broadcast to all clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });

        // Forward to renderer
        if (mainWindow) {
          mainWindow.webContents.send('ws-message', data);
        }
      });

      ws.on('close', () => {
        console.log('[WS] Client disconnected');
      });
    });

    console.log(`[WS] Server started on port ${wsPort}`);
  } catch (error) {
    console.error('[WS] Failed to start WebSocket server:', error);
    // Continue without WebSocket server - app can still function
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true, // Enable security
      allowRunningInsecureContent: false, // Disable insecure content
      // CSP is handled via meta tag in HTML
      sandbox: false, // Disable sandbox to avoid network service issues
    },
    frame: true,
    backgroundColor: '#0a0a0a',
  });

  // Load Next.js dev server or production build
  const startUrl = process.env.NODE_ENV === 'production'
    ? `file://${path.join(__dirname, '..', 'renderer', 'out', 'index.html')}`
    : 'http://localhost:3000';

  // Wait for Next.js to be ready before loading
  const loadWindow = async () => {
    if (process.env.NODE_ENV !== 'production') {
      // Wait for Next.js server to be ready
      await waitForNextJsServer();
    }
    
    mainWindow.loadURL(startUrl).catch((err) => {
      console.error('[Electron] Failed to load URL:', err);
      // Retry after a delay
      setTimeout(loadWindow, 2000);
    });
  };

  // Start loading after a short delay
  setTimeout(loadWindow, 1000);

  // Allow localhost access for development (needed for webSecurity: true)
  // Note: CSP in _document.tsx handles most of this, but this ensures localhost access
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      // Allow camera and microphone for WebRTC
      if (permission === 'camera' || permission === 'microphone') {
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  // Open DevTools in development
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle page load errors
  mainWindow.webContents.on('did-fail-load', async (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -102 || errorCode === -105 || errorCode === -106) {
      // ERR_CONNECTION_REFUSED, ERR_NAME_NOT_RESOLVED, or ERR_INTERNET_DISCONNECTED
      console.log(`[Electron] Connection error (${errorCode}): ${errorDescription}`);
      console.log('[Electron] Waiting for Next.js server to start...');
      
      // Wait for server to be ready
      const isReady = await waitForNextJsServer(30000, 2000);
      if (isReady) {
        setTimeout(() => {
          mainWindow.reload();
        }, 1000);
      } else {
        console.error('[Electron] Next.js server is not responding. Please check if it started correctly.');
      }
    } else {
      console.error(`[Electron] Failed to load: ${errorCode} - ${errorDescription}`);
    }
  });
}

// IPC handlers
ipcMain.handle('get-state', async () => {
  // Fetch state from Python/DB
  return { status: 'ready' };
});

ipcMain.handle('update-layer', async (event, layerId, transform) => {
  console.log(`[IPC] Update layer ${layerId}:`, transform);
  // Persist layer transform to DB or state file
  return { success: true };
});

ipcMain.handle('capture-frame', async () => {
  // Trigger OBS Virtual Camera frame capture
  return { frame: 'base64_image_data' };
});

app.whenReady().then(async () => {
  createWindow();
  startPythonSidecar();
  await startWebSocketServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (pythonProcess) pythonProcess.kill();
    if (wss) wss.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) pythonProcess.kill();
  if (wss) wss.close();
});
