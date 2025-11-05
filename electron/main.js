const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

let mainWindow;
let pythonProcess;
let wss;

// Start Python FastAPI sidecar
function startPythonSidecar() {
  const pythonPath = path.join(__dirname, '..', 'python', 'main.py');
  pythonProcess = spawn('python', [pythonPath]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python] ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Error] ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

// WebSocket server for real-time state sync
function startWebSocketServer() {
  wss = new WebSocket.Server({ port: 8080 });

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

  console.log('[WS] Server started on port 8080');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow WebRTC/camera access
    },
    frame: true,
    backgroundColor: '#0a0a0a',
  });

  // Load Next.js dev server or production build
  const startUrl = process.env.NODE_ENV === 'production'
    ? `file://${path.join(__dirname, '..', 'renderer', 'out', 'index.html')}`
    : 'http://localhost:3000';

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
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

app.whenReady().then(() => {
  createWindow();
  startPythonSidecar();
  startWebSocketServer();

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
