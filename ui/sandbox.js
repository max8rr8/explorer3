const { ipcRenderer } = require('electron');

let EV3 = {};
{
  function init() {
    let handles = [];

    let commands = ['tone', 'ls', 'upload', 'download', 'startProgram'];
    for (let el of commands) {
      EV3[el] = function(...args) {
        return new Promise(resolve => {
          ipcRenderer.send('commandEV3', {
            command: el,
            args,
            id: handles.length
          });
          handles.push(({ reply }) => resolve(reply));
        });
      };
    }
    ipcRenderer.on('replyEV3', function(ev, data) {
      handles[data.id](data);
    });
    window.EV3 = EV3;
  }
  init();
}

window.addButton = function(label, click, width = 160, parent = document.body) {
  let el = document.createElement('button');
  el.className = 'flat-button';
  el.onclick = click;
  el.innerText = label;
  el.style.width = width + 'px  '
  parent.appendChild(el);
  return el;
};
