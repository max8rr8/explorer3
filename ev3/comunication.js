const bluetooth = require('node-bluetooth');
const notify = require('../notify');

const adapter = new bluetooth.DeviceINQ();

function findDevices(upd) {
  let devices = [];
  adapter
    .on('finished', () => {
      upd(devices);
    })
    .on('found', (address, name) => {
      devices.push({
        address,
        name,
        type: 'bluetooth'
      });
      upd(devices);
    })
    .scan();
}

function connect(device) {
  return new Promise(resolve => {
    let connected = false;
    let ee = new (require('events')).EventEmitter();
    if (device.type == 'bluetooth') {
      console.log('Trying to connect over bluetooth to', device.address);

      adapter.findSerialPortChannel(device.address, function(channel) {
        if (channel < 0) {
          return notify.closing('Cannot connect to device: device is not ev3');
        }
        console.log('Found RFCOMM channel for serial port on %s: ', device.name, channel);

        bluetooth.connect(device.address, channel, function(err, connection) {
          if (err) {
            console.error('Connection error:', err);
            return notify.closing('Cannot connect to device');
          }
          connected = true;
          ee.raw = connection;
          ee.name = device.name;
          ee.write = chunk =>
            new Promise(resolve => {
              connection.write(new Buffer(chunk), resolve);
            });
          connection.on('data', chunk => {
            ee.emit('data', [...chunk]);
          });
          connection.on('error', () => ee.emit('error'));
          resolve(ee);
        });
      });
    }
  });
}

module.exports.findDevices = findDevices;
module.exports.connect = connect;
