const readline = require('readline');
const fs = require('fs');
const path = require('path');
const EE = require('events');

module.exports = function readOuiDataFromFile(ouiStream) {
  if (!(ouiStream instanceof fs.ReadStream) && typeof ouiStream !== 'string') {
    return Promise.reject(new Error('invalid param "ouiStream", a fs.ReadStream instance or a file path is required'));
  }

  const recordList = [];
  let innerLine = 0;
  let record;

  const privateRe = /^private$/i;

  const dealOuiLine = (line) => {
    line = line.trim();

    if (innerLine === 0) {
      if (line.indexOf('(hex)') === 11) {
        innerLine = 1;
        record = {
          mal: line.slice(0, 8).replace(/-/g, ''),
          org: {
            name: line.slice(18),
            addr: {}
          }
        };

        if (privateRe.test(record.org.name)) {
          record.org.addr.street = '';
          record.org.addr.provinceCity = '';
          record.org.addr.country = '';
          recordList.push(record);
          record = null;
          innerLine = 0;
        }
      }
    } else if (innerLine === 1 && line.startsWith(record.mal)) {
      innerLine = 2;
    } else if (innerLine === 2) {
      innerLine = 3;
      record.org.addr.street = line || '';
    } else if (innerLine === 3) {
      innerLine = 4;
      record.org.addr.provinceCity = line || '';
    } else if (innerLine === 4) {
      innerLine = 0;
      record.org.addr.country = line || '';
      recordList.push(record);
      record = null;
    }
  };

  return new Promise((resolve, reject) => {
    const ee = new EE();

    const cb = (event, listener) => {
      if (event === 'line') {
        ee.removeListener('newListener', cb);

        if (typeof ouiStream === 'string') {
          const ouiFilePath = path.resolve(process.cwd(), ouiStream);
          ouiStream = fs.createReadStream(ouiFilePath);
        }

        readline.createInterface({
          input: ouiStream
        })
        .on('line', (line) => {
          ee.emit('line', line);
        })
        .on('close', () => {
          ee.emit('close');
        });
      }
    };

    ee.on('newListener', cb);
    resolve(ee);
  })
  .then(ee => new Promise(resolve => {
    ee.on('line', dealOuiLine)
      .on('close', () => {
        resolve(recordList);
      });
  }));
};
