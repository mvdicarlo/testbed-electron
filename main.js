const path = require('path');
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  powerSaveBlocker,
} = require('electron');
const template = require('./src/electron-menu');
const autoUpdater = require('./src/auto-updater');

let tray = null;
let win = null; // Primary App BrowserWindow

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
  return;
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) {
      win.restore();
    } else {
      win.show();
    }
    win.focus();
  } else {
    initialize();
  }
});

const blockerId = powerSaveBlocker.start('prevent-app-suspension');
app.commandLine.appendSwitch('disable-background-timer-throttling');

app.on('ready', () => {
  // Set Menu Items
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Set Application Icon
  let image = nativeImage.createFromPath(path.join(__dirname, '/minnowicon.png'));
  if (process.platform === 'darwin') {
    image = image.resize({
      width: 16,
      height: 16,
    });
  }
  image.setTemplateImage(true);

  const trayItems = [{
    label: 'Open',
    click() {
      createOrInitializeWindow();
    },
  }, {
    label: 'Quit',
    click() {
      try { // Potential to throw error if not initialized intervals
        powerSaveBlocker.stop(blockerId);
      } catch (e) {
        // Don't Care
      } finally {
        app.quit();
      }
    },
  }, ];

  tray = new Tray(image);
  const trayMenu = Menu.buildFromTemplate(trayItems);

  tray.setContextMenu(trayMenu);
  tray.setToolTip('Testbed');
  tray.on('click', () => {
    createOrInitializeWindow();
  });

  autoUpdater.autoUpdater.checkForUpdates();
  start();
});

function start() {
  createOrInitializeWindow();
}

function createOrInitializeWindow() {
  if (!hasWindows()) {
    initialize();
  } else {
    if (win.isMinimized()) {
      win.restore();
    } else {
      win.show();
    }
    win.focus();
  }
}

function initialize(show = true) {
  win = new BrowserWindow({
    show,
    width: 800,
    minWidth: 500,
    height: 800,
    minHeight: 500,
    autoHideMenuBar: true,
    title: 'PostyBirb',
    webPreferences: {
      devTools: true,
      allowRunningInsecureContent: false,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      backgroundThrottling: false,
      contextIsolation: false,
      navigateOnDragDrop: true // needed for drop of files
    },
  });

  win.closeAfterPost = !show;

  win.loadURL(`file://${__dirname}/index.html`);

  win.on('page-title-updated', e => e.preventDefault()); // Do not allow title changes

  win.webContents.on('new-window', (event) => {
    log.info('Preventing new window...');
    event.preventDefault();
  });

  win.on('closed', () => {
    win = null;
  });

  win.webContents.once('did-frame-finish-load', () => {

  });
}

app.on('window-all-closed', () => {
  attemptToClose();
});

function hasWindows() {
  return win !== null;
}

function attemptToClose() {
  powerSaveBlocker.stop(blockerId);
  app.quit();
}
