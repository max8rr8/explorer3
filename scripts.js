const ui = require('./ui');
const electron = require('electron');
const Store = require('electron-store');
const fs = require('fs');

let store = new Store();
if (!store.has('scripts')) store.set('scripts', []);

async function chooseScript() {
  return ui.openScriptLib().then(
    win =>
      new Promise(resolve => {
        let scripts = store.get('scripts');
        win.webContents.send('updateScripts', scripts.map(e => e.name));

        electron.ipcMain.on('addScript', async (w, s) => {
          if (win) {
            addScript(s.name, fs.readFileSync(s.file).toString());
            scripts = store.get('scripts');
            win.webContents.send('updateScripts', scripts.map(e => e.name));
          }
        });

        electron.ipcMain.on('delScript', async (w, s) => {
          if (win) {
            deleteScript(s.scriptName);
            scripts = store.get('scripts');
            win.webContents.send('updateScripts', scripts.map(e => e.name));
          }
        });

        electron.ipcMain.on('selectScript', (w, s) => {
          if (win) {
            resolve(s);
            win.close();
            win = null;
          }
        });

        win.on('close', () => {
          if (win) resolve();
          win = null;
        });
      })
  );
}

async function deleteScript(name) {
  store.set('scripts', store.get('scripts').filter(e => e.name !== name));
}

function addScript(name, script) {
  console.log('add script', name);
  store.set('scripts', [
    ...store.get('scripts'),
    {
      name,
      script
    }
  ]);
}

function handleSandbox(ev3) {
  electron.ipcMain.on('commandEV3', async (event, data) => {
    console.log('Script cmd', data)
    let res = await ev3[data.command](...data.args);
    console.log('Scr end')

    event.sender.webContents.send('replyEV3', {
      id: data.id,
      reply: res
    });
  });
}

async function runScript(name) {
  let code = store.get('scripts').filter(e => e.name == name);
  if (!code[0]) return;
  code = code[0].script;

  console.log('Running script', name);
  let win = new electron.BrowserWindow({
    width: 480,
    height: 320,
    title: name,
    resizable: false
  });
  //win.toggleDevTools();
  win.loadFile('./ui/sandbox.html');
  win.webContents.executeJavaScript(code)

}

function setTopScripts(n, v) {
  const s = getTopScripts();
  s[n] = v;
  return store.set('scriptTops', s);
}

function getTopScripts() {
  return store.get('scriptTops', ['Choose', 'Choose', 'Choose']);
}

module.exports.getTopScripts = getTopScripts;
module.exports.setTopScripts = setTopScripts;
module.exports.handleSandbox = handleSandbox;
module.exports.chooseScript = chooseScript;
module.exports.deleteScript = deleteScript;
module.exports.addScript = addScript;
module.exports.runScript = runScript;
module.exports.runScript = runScript;
