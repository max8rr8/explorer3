let file;
let fs = require('fs');
let path = require('path');

function chunks(buffer, chunkSize) {
  /** @type {Buffer[]} */
  var result = [];
  var len = buffer.length;
  var i = 0;

  while (i < len) {
    result.push(buffer.slice(i, (i += chunkSize)));
  }

  return result;
}

addButton(
  'Choose file and load',
  async () => {
    file = await askForFile();
    showLoading('Loading')
    let uf2 = fs.readFileSync(file);
    let packets = chunks(uf2, 512);
    let files = {};
    for (let chunk of packets) {
      let name = chunk
        .slice(288, 500)
        .filter(e => e !== 0)
        .toString();
      if (files[name]) {
        files[name].push(chunk.slice(32, 288));
      } else {
        files[name] = [chunk.slice(32, 288)];
      }
    }
    let toRun = ''
    for (let file in files) {
      if(file.slice(-3) === 'rbf')
        toRun = '../prjs/BrkProg_SAVE/' + file.split('/').slice(-1)[0]
      let f = Buffer.concat(files[file]);
      file = path.join('/home/root/lms2012/prjs/BrkProg_SAVE/', file.split('/').slice(-1)[0]);
      console.log(f);
      await EV3.upload(file, f);
      await EV3.tone(2, 2000, 1000);
    }
    await EV3.startProgram(toRun)
    Swal.close();
    Swal.fire({
      type: 'success',
      title: 'Loaded'
    })
  },
  360
);
