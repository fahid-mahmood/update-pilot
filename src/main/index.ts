import { app, shell, BrowserWindow } from 'electron'
import path from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { loadSettings, saveSettings } from './store'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const settings = loadSettings()

  const win = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 860,
    minHeight: 540,
    ...(settings.windowBounds || {}),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  const saveBounds = (): void => {
    if (!win.isMinimized() && !win.isDestroyed()) {
      const s = loadSettings()
      saveSettings({ ...s, windowBounds: win.getBounds() })
    }
  }
  win.on('resized', saveBounds)
  win.on('moved', saveBounds)
  win.on('close', saveBounds)

  win.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow = win
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.fahidmahmood.update-pilot')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers(() => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
