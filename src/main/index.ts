import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  screen,
  nativeImage,
  globalShortcut,
  shell
} from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as pty from 'node-pty'
// import { server } from './server'
// import { server } from './server-test'

let tray: Tray | null = null

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const activeDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const { width, height } = activeDisplay.workArea

  // Check if mainWindow is destroyed
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = new BrowserWindow({
      width: Math.ceil(width / 2),
      height: height,
      show: false,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      },
      x: activeDisplay.workArea.x + Math.floor(width / 2),
      y: activeDisplay.workArea.y,
      useContentSize: true,
      frame: false
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Load the local URL or the local html file
    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    // Terminal setup
    const shellPath = process.platform === 'win32' ? 'powershell.exe' : 'zsh'
    const tmuxSessionName = 'DROPTERM' // Define the tmux session name
    const shellArgs =
      process.platform === 'win32' ? [] : ['-l', '-c', `tmux new-session -A -s ${tmuxSessionName}`] // '-l' starts zsh as a login shell and attaches or creates a named tmux session

    const terminal = pty.spawn(shellPath, shellArgs, {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: {
        ...process.env,
        TERM: 'xterm-256color', // Ensure TERM is set correctly for xterm compatibility
        LC_ALL: 'en_US.UTF-8' // Ensure locale settings are correct for Unicode support
      }
    })

    const onDataListener = (data): void => {
      mainWindow?.webContents.send('terminal-data', data)
    }

    // @ts-ignore - idk fuck you
    terminal.on('data', onDataListener)

    const onInputListener = (_, data): void => {
      terminal.write(data)
    }
    ipcMain.on('terminal-input', onInputListener)

    const onResizeListener = (_, size): void => {
      terminal.resize(size.cols, size.rows)
    }
    ipcMain.on('terminal-resize', onResizeListener)

    mainWindow.on('closed', () => {
      terminal.kill()
      ipcMain.removeListener('terminal-input', onInputListener)
      ipcMain.removeListener('terminal-resize', onResizeListener)
      mainWindow = null
    })
  } else {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.setBounds({
        width: Math.ceil(width / 2),
        height: height,
        x: activeDisplay.workArea.x + Math.floor(width / 2),
        y: activeDisplay.workArea.y
      })
      mainWindow.setVisibleOnAllWorkspaces(true) // Ensure window appears on the current workspace
      mainWindow.show()
      setTimeout(() => {
        mainWindow?.setVisibleOnAllWorkspaces(false) // Reset the property to avoid side effects
      }, 100) // Delay resetting to ensure it applies after the window is visible
    }
  }
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'More features coming soon?', enabled: false },
    { type: 'separator' },
    { label: 'Exit', click: (): void => app.quit() }
  ])

  tray.setToolTip('My Electron App')
  tray.setContextMenu(contextMenu)
}

let shortcutRegistered = false

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.setLoginItemSettings({ openAtLogin: true })

  createTray()

  shortcutRegistered = globalShortcut.register('CommandOrControl+Shift+/', () => {
    createWindow()
  })

  if (!shortcutRegistered) {
    console.log('Shortcut registration failed')
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  if (shortcutRegistered) {
    globalShortcut.unregister('CommandOrControl+Shift+/')
  }
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    globalShortcut.unregisterAll()
    tray?.destroy()
    mainWindow = null
    app.quit()
  }
})
