const electron = require('electron');
const icon = require('path').join(__dirname, './icon.png');
const notify = require('../notify');

function chooseDevice(finder) {
  return new Promise(resolve => {
    let device = null;
    let win = new electron.BrowserWindow({
      width: 350,
      height: 150,
      icon: icon
    });
    win.on('closed', () => {
      win = null;
      if (device === null) return notify.closing('No device selected');
      resolve(device);
    });
    win.setResizable(false);
    win.setMenu(null);
    win.loadFile('./ui/select.html');

    win.webContents.on('did-finish-load', () => {
      finder(devices => {
        if (!win) return;

        win.webContents.send('update', devices);
      });
    });
    electron.ipcMain.on('connect', (event, arg) => {
      device = arg;
      win.close();
    });
  });
}

function runMainWindow() {
  return new Promise(resolve => {
    const ee = new (require('events')).EventEmitter();

    let win = new electron.BrowserWindow({
      width: 700,
      height: 450,
      icon: icon
    });
    win.on('close', () => {
      electron.app.exit(0);
      notify.quite();
    });
    win.setResizable(false);
    win.setMenu(null);
    win.loadFile('./ui/main.html');

    // win.toggleDevTools();

    win.webContents.on('did-finish-load', () => {
      ee.on('updateState', function(state) {
        win.webContents.send('updateState', state);
      });

      ee.on('updateScripts', function(state) {
        win.webContents.send('updateScripts', state);
      });

      electron.ipcMain.on('goTo', (win, fullPath) => ee.emit('goTo', fullPath));
      electron.ipcMain.on('upload', (win, data) => ee.emit('upload', data));
      electron.ipcMain.on('download', (win, data) => ee.emit('download', data));
      electron.ipcMain.on('remove', (win, data) => ee.emit('remove', data));
      electron.ipcMain.on('createDir', (win, data) => ee.emit('createDir', data));
      electron.ipcMain.on('allScripts', (win, data) => ee.emit('allScripts', data));
      electron.ipcMain.on('setTop', (win, data) => ee.emit('setTop', data));
      electron.ipcMain.on('runTop', (win, data) => ee.emit('runTop', data));
      resolve(ee);
    });

    //win.on('close', () => console.log('closed', electron.app.exit(0)))
    win.on('window-all-closed', () => 0);
  });
}

function openScriptLib(finder) {
  return new Promise(resolve => {
    let win = new electron.BrowserWindow({
      width: 550,
      height: 350,
      icon: icon
    });
    win.setResizable(false);
    win.setMenu(null);
    win.loadFile('./ui/script.html');

    //win.toggleDevTools();

    win.webContents.on('did-finish-load', () => {
      resolve(win);
    });
  });
}

module.exports.openScriptLib = openScriptLib;
module.exports.runMainWindow = runMainWindow;
module.exports.chooseDevice = chooseDevice;
