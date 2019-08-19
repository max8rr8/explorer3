const { dialog, app } = require('electron')

let closed = false;

module.exports = {
  closing: (text = 'Unrecognized error') => {
    if (!closed) {
      closed=true;
      console.log(text)
      dialog.showMessageBox({
        type: 'error',
        title: 'Closing',
        message: text,
        buttons: ['OK']
      })
      app.exit(1)
    }
  },
  quite: ()=>{
    if (!closed) {
      closed=true;
      dialog.showMessageBox({
        type: 'error',
        title: 'Goodbye',
        message: 'Goodbye',
        buttons: ['OK']
      })
      //app.exit()
    }
  }
}
