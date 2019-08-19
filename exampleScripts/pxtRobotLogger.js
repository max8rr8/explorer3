let file;
let fs = require('fs');
let path = require('path');

let logEl;
addButton(
  'Load',
  async () => {
    showLoading('Loading')
    let log = await EV3.download('/home/root/lms2012/prjs/log.txt')
    Swal.close();
    Swal.fire({
      type: 'success',
      title: 'Loaded'
    })
    logEl.innerHTML = log.toString().replace(/\n/g, "<br />");  
  },
  360
);

logEl = document.createElement('div')

logEl.style.height = "240px" ;
logEl.style.width = "360px";
logEl.style.overflowY = 'auto'
logEl.style.border = 'black solid 1px'
logEl.style.fontFamily = 'monospace'
logEl.style.whiteSpace = 'pre-wrap'
logEl.style.paddingTop = '5px'  
logEl.style.paddingBottom = '5px'
logEl.style.lineHeight = '50%'

document.body.appendChild(logEl)

