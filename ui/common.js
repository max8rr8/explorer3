const {dialog} = require('electron').remote

async function askText(q) {
  const { value } = await Swal.fire({
    title: q,
    input: 'text',
    inputValue: '',
    showCancelButton: true,
    inputValidator: value => {
      if (!value) {
        return 'You need to write something!';
      }
    }
  });
  return value;
}

async function askForFile() {
  Swal.fire({
    title: 'Choose file',

    onBeforeOpen: () => {
      Swal.showLoading();
    }
  });
  return new Promise(resolve => {
    const selectedPaths = dialog.showOpenDialog({}, paths => {
      if (!paths) resolve();
      else resolve(paths[0]);
      Swal.close();
    });
  });
}

async function askForPlace() {
  Swal.fire({
    title: 'Choose place to save',

    onBeforeOpen: () => {
      Swal.showLoading();
    }
  });
  return new Promise(resolve => {
    const selectedPaths = dialog.showSaveDialog({}, paths => {
      if (!paths) resolve();
      else resolve(paths);
      Swal.close();
    });
  });
}

function showLoading(text){
  Swal.fire({
    title: text,

    onBeforeOpen: () => {
      Swal.showLoading();
    }
  });
}

async function errorNotify(e){
  await Swal.fire(
    'Error',
    e,
    'error'
  );
}


function setClickableList(listEl, list) {
  while (listEl.firstChild) {
    listEl.removeChild(listEl.firstChild);
  }

  return list.map(e => {
    let el = document.createElement('div');
    el.className = 'listEl';
    el.innerText = e.label;
    el.onclick = () => e.onclick(el);
    listEl.appendChild(el);
    return el;
  });
}