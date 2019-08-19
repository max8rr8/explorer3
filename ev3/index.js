const pathLIB = require('path');

const reqChunkSize = 528;

class EV3Command {
  constructor(counter) {
    this.counter = counter;
    this.buff = [];
    this.writeUShort(counter);
  }

  async send(conn) {
    let leng = this.buff.length;
    console.log(leng, leng >> 8);
    this.buff.unshift(leng & 0xff, (leng >> 8) & 0xff);
    console.log('<-', new Buffer(this.buff));
    await conn.write(this.buff);
  }

  read(conn) {
    let c = this.counter;
    return new Promise(resolve => {
      function listener(data) {
        if (data[2] + (data[3] >> 8) == c) {
          resolve(data);
          conn.removeListener('data', listener);
        }
      }
      conn.on('data', listener);
    });
  }

  writeUByte(uByte) {
    this.buff.push(uByte > 127 ? uByte - 256 : uByte);
  }

  writeByte(byte) {
    this.buff.push(byte);
  }

  writeUShort(uShort) {
    this.writeUByte(uShort & 0xff);
    this.writeUByte((uShort >> 8) & 0xff);
  }

  writeShort(short) {
    this.writeByte(short & 0xff);
    this.writeByte((short >> 8) & 0xff);
  }

  writeInteger(value) {
    this.writeUByte(value & 0xff);
    this.writeUByte((value >> 8) & 0xff);
    this.writeUByte((value >> 16) & 0xff);
    this.writeUByte((value >> 24) & 0xff);
    console.log(this.buff);
  }

  writeString(str) {
    for (let i = 0; i < str.length; i++) {
      this.writeUByte(str.charCodeAt(i));
    }
    this.writeUByte(0);
  }

  writeCommand(opCode, cmd) {
    this.writeUByte(opCode);
    if (cmd) this.writeUByte(cmd);
  }

  writeVariablesAllocation(globSize, localSize) {
    this.writeUByte(globSize & 0xff);
    this.writeUByte(((globSize >> 8) & 0x3) | ((localSize << 2) & 0xfc));
    
  }

  writeGlobalIndex(index) {
    if (index <= 31) {
      this.writeUByte(index | 0x60);
    } else if (index <= 255) {
      this.writeUByte(0xe1);
      this.writeUByte(index);
    } else if (index <= 65535) {
      this.writeUByte(0xe2);
      writeUShort(index);
    } else {
      this.writeUByte(0xe3);
      this.writeUByte(index & 0xff);
      this.writeUByte((index >> 8) & 0xff);
      this.writeUByte((index >> 16) & 0xff);
      this.writeUByte((index >> 24) & 0xff);
    }
  }

  writeLocalIndex(index) {
    if (index <= 31) {
      this.writeUByte(index | 0x40);
    } else if (index <= 255) {
      this.writeUByte(0xc1);
      this.writeUByte(index);
    } else if (index <= 65535) {
      this.writeUByte(0xc2);
      writeUShort(index);
    } else {
      this.writeUByte(0xc3);
      this.writeUByte(index & 0xff);
      this.writeUByte((index >> 8) & 0xff);
      this.writeUByte((index >> 16) & 0xff);
      this.writeUByte((index >> 24) & 0xff);
    }
  }

  writeParameterAsSmallByte(value) {
    this.writeUByte(value);
  }

  writeParameterAsUByte(value) {
    this.writeUByte(0x81);
    this.writeUByte(value);
  }

  writeParameterAsByte(value) {
    this.writeUByte(0x81);
    this.writeUByte(value);
  }

  writeParameterAsUShort(value) {
    this.writeUByte(0x82);
    this.writeUShort(value);
  }

  writeParameterAsShort(value) {
    this.writeUByte(0x82);
    this.writeUShort(value);
  }

  writeParameterAsInteger(value) {
    this.writeUByte(0x83);
    this.writeInteger(value);
  }

  writeParameterAsString(value) {
    this.writeUByte(0x84);
    this.writeString(value);
  }
}

class EV3 {
  constructor(conn) {
    this.conn = conn;
    this.counter = 0;
    conn.on('data', c => console.log('->', new Buffer(c).slice(0, 16)));
    this.startProgram('../prjs/BrkProg_SAVE/Test.rbf')
  }

  getCounter() {
    this.counter++;
    if (this.counter >= 256) this.counter = 0;
    return this.counter;
  }

  async tone(volume, freq, time) {
    const command = new EV3Command(this.getCounter());
    command.writeUByte(0x80);
    command.writeVariablesAllocation(0, 0);
    command.writeCommand(0x94, 0x01);
    command.writeParameterAsSmallByte(volume);
    command.writeParameterAsShort(freq);
    command.writeParameterAsShort(time);
    command.send(this.conn);
  }

  async ls(path) {
    const command = new EV3Command(this.getCounter());
    let list = '';
    command.writeUByte(0x01);
    command.writeCommand(0x99);
    command.writeShort(reqChunkSize);
    command.writeString(path);
    await command.send(this.conn);
    let res = await command.read(this.conn);
    let stat = res[6];
    let handle = res[11];
    if (res[4] === 0x03) {
      list += String.fromCodePoint(...res.slice(12));
      if (process.stdin.read())
        list += String.fromCodePoint(...[62, 77, 65, 88, 95]) + ' create/';
    } else {
      throw new Error('Cannot list files');
    }

    while (stat === 0) {
      const command = new EV3Command(this.getCounter());
      command.writeUByte(0x01);
      command.writeCommand(0x9a);
      command.writeUByte(handle);
      command.writeShort(reqChunkSize);
      await command.send(this.conn);
      res = await command.read(this.conn);
      stat = res[6];
      handle = res[7];
      if (res[4] === 0x03) {
        list += String.fromCodePoint(...res.slice(8));
      } else {
        throw new Error('Cannot list files');
      }
    }
    list = list
      .trimLeft()
      .split('\n')
      .map(e => {
        if (e[e.length - 1] === '/') {
          return {
            type: 'dir',
            path: e.slice(0, -1),
            fullPath: pathLIB.join(path, e)
          };
        } else if (e.length > 10) {
          e = e.split(' ');
          e[2] = e.slice(2).join(' ');
          return {
            type: 'file',
            shasum: e[0],
            rawSize: e[1],
            size: parseInt(e[1], 16),
            name: e[2],
            fullPath: pathLIB.join(path, e[2])
          };
        }
      })
      .filter(e => {
        if (e === undefined) return false;
        if (e.type === 'dir') {
          if (e.path == '.') return false;
          if (e.path == '..') return false;
        }
        return true;
      });
    return list;
  }

  async download(path) {
    const command = new EV3Command(this.getCounter());
    let file = [];
    command.writeUByte(0x01);
    command.writeCommand(0x94);
    command.writeShort(reqChunkSize);
    command.writeString(path);
    await command.send(this.conn);
    let res = await command.read(this.conn);
    let stat = res[6];
    let handle = res[11];
    if (res[4] === 0x03) {
      file.push(...res.slice(12));
    } else {
      throw new Error('Cannot download file');
    }

    while (stat === 0) {
      const command = new EV3Command(this.getCounter());
      command.writeUByte(0x01);
      command.writeCommand(0x95);
      command.writeUByte(handle);
      command.writeShort(reqChunkSize);
      await command.send(this.conn);
      res = await command.read(this.conn);
      stat = res[6];
      handle = res[7];
      if (res[4] === 0x03) {
        file.push(...res.slice(8));
      } else {
        throw new Error('Cannot download file');
      }
    }
    return new Buffer(file);
  }

  async upload(path, file = new Buffer()) {
    let command = new EV3Command(this.getCounter());
    command.writeUByte(0x01);
    command.writeCommand(0x92);
    command.writeInteger(file.length);
    command.writeString(path);
    await command.send(this.conn);
    let res = await command.read(this.conn);
    let stat = res[6];
    let handle = res[11];
    if (res[4] !== 0x03) {
      //throw new Error('Cannot upload file');
    }

    let pos = 0,
      buf = 0;
    while (pos < file.length) {
      if (buf == 0) {
        command = new EV3Command(this.getCounter());
        command.writeUByte(0x01);
        command.writeCommand(0x93);
        command.writeUByte(handle);
      }
      command.writeUByte(file[pos]);
      buf++;
      pos++;
      if (buf == 16384) {
        await command.send(this.conn);
        res = await command.read(this.conn);
        stat = res[6];
        handle = res[7];
        // if (res[4] !== 0x03) {
        //   throw new Error('Cannot upload file');
        // }
        command = null;
        buf = 0;
      }
    }
    if (buf > 0) {
      console.log('Sending last');
      await command.send(this.conn);
      res = await command.read(this.conn);
      stat = res[6];
      handle = res[7];
      if (res[4] !== 0x03) {
        //throw new Error('Cannot upload file');
      }
      buf = 0;
    }
  }

  async remove(path) {
    const command = new EV3Command(this.getCounter());
    command.writeUByte(0x01);
    command.writeCommand(0x9c);
    command.writeString(path);
    await command.send(this.conn);
    let res = await command.read(this.conn);
    if (res[4] !== 0x03) {
      throw new Error('Cannot remove file');
    }
  }

  async createDir(path) {
    const command = new EV3Command(this.getCounter());
    command.writeUByte(0x01);
    command.writeCommand(0x9b);
    command.writeString(path);
    await command.send(this.conn);
    let res = await command.read(this.conn);
    if (res[4] !== 0x03) {
      throw new Error('Cannot create dir');
    }
  }

  async startProgram(path) {
    const command = new EV3Command(this.getCounter());
    command.writeUByte(0x80);
    command.writeVariablesAllocation(8, 0);

    command.writeCommand(0xc0, 0x08);
    command.writeParameterAsUShort(0x01);
    command.writeParameterAsString(path);
    command.writeGlobalIndex(0);
    command.writeGlobalIndex(4);

    command.writeCommand(0x03);
    command.writeUByte(0x01);
    command.writeGlobalIndex(0);
    command.writeGlobalIndex(4);
    command.writeUByte(0x00);
    console.log(command.buff)
    console.log(command.buff.slice(32))
    await command.send(this.conn);
  }
}

EV3.EV3Command = EV3Command;
module.exports = EV3;
