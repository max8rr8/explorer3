const electron = require('electron');
const pathLIB = require('path');
const fs = require('fs');

async function main() {
  const ui = require('./ui');
  const comm = require('./ev3/comunication');
  const EV3 = require('./ev3');
  const notify = require('./notify');
  const scripts = require('./scripts');
  let isMain = false;

  electron.app.on('window-all-closed', e =>
    !isMain ? e.preventDefault() : electron.app.exit(0)
  );

  console.log('----MAIN----');

  const device = await ui.chooseDevice(comm.findDevices);
  console.log('Selected', device);

  const connection = await comm.connect(device);
  connection.on('error', function() {
    notify.closing('Comunitcation error');
  });
  const ev3 = new EV3(connection);
  ev3.tone(16, 1000, 100);
  console.log('Connected');
  // await ev3.ls('/etc')
  // await ev3.download('', new Buffer())
  // await ev3.upload('')
  scripts.handleSandbox(ev3);
  const mainWindow = await ui.runMainWindow();
  isMain = true;

  let path = '/home/root/lms2012';

  async function update(base = {}) {
    let filesList;
    try {
      filesList = await ev3.ls(path);
    } catch (e) {
      path = '/home/root/lms2012';
      return await update();
    }
    if (path !== '/')
      filesList.unshift({
        type: 'dir',
        path: '..',
        fullPath: pathLIB.join(path, '..')
      });
    mainWindow.emit(
      'updateState',
      Object.assign(
        {
          path,
          files: filesList
        },
        base
      )
    );
  }
  await update();

  mainWindow.on('goTo', newPath => {
    console.log('Go to', newPath);
    path = newPath;
    update();
  });

  mainWindow.on('upload', async ({ from, to }) => {
    console.log('Upload from', from, 'to', to);
    try {
      await ev3.upload(to, fs.readFileSync(from));
      await update({
        showAlert: ['Uploaded', 'File uploaded with success', 'success']
      });
    } catch (e) {
      console.log(e)
      await update({
        showAlert: ['Error', 'File uploaded with error', 'error']
      });
    }
  });

  mainWindow.on('download', async ({ from, to }) => {
    console.log('Download from', from, 'to', to);
    try {
      await fs.writeFileSync(to, await ev3.download(from));
      await update({
        showAlert: ['Downloaded', 'File downloaded with success', 'success']
      });
    } catch (e) {
      await update({
        showAlert: ['Error', 'File downloaded with error', 'error']
      });
    }
  });

  mainWindow.on('remove', async ({ file }) => {
    console.log('Remove', file);
    try {
      await ev3.remove(file);
      await update({
        showAlert: ['Deleted', 'File deleted with success', 'success']
      });
    } catch (e) {
      await update({
        showAlert: ['Error', 'File deleted with error', 'error']
      });
    }
  });

  mainWindow.on('createDir', async ({ path }) => {
    console.log('Create dir', path);
    try {
      await ev3.createDir(path);
      await update({
        showAlert: ['Created', 'Dir created with success', 'success']
      });
    } catch (e) {
      await update({
        showAlert: ['Error', 'Dir created with error', 'error']
      });
    }
  });

  mainWindow.on('allScripts', async () => {
    let s = await scripts.chooseScript();
    scripts.runScript(s);
  });

  mainWindow.on('setTop', async ({ num }) => {
    let scr = await scripts.chooseScript();
    if (scr) scripts.setTopScripts(num, scr);
    mainWindow.emit('updateScripts', scripts.getTopScripts());
  });

  mainWindow.on('runTop', async ({ num }) => {
    let scr = await scripts.getTopScripts()[num];
    await scripts.runScript(scr);
  });

  mainWindow.emit('updateScripts', scripts.getTopScripts());
}

electron.app.on('ready', main);
