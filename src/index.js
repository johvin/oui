const fs = require('fs');
const path = require('path');
const db = require('./db');
const readOuiMetaFromDB = require('./readOuiMetaFromDB');
const downloadOui = require('./downloadOui');
const readOuiDataFromFile = require('./readOuiDataFromFile');
const updateOuiData = require('./updateOui');

const ouiUrl = 'http://standards-oui.ieee.org/oui.txt';
const ouiDownloadPath = path.resolve(__dirname, `../download/oui_${Date.now()}.txt`);

const logger = (msg) => (arg) => {
  console.log(msg);
  return arg;
}

const start = process.hrtime();

readOuiMetaFromDB(ouiUrl, ouiDownloadPath)
  .then(logger('start downloading oui.txt ...'))
  .then(downloadOui)
  .then(logger('finished download!'))
  .then(({ change, ouiInfo, headers }) => {
    if (!change) {
      return Promise.resolve({
        etag: headers.etag,
        lastModified: headers['last-modified'],
        contentLength: headers['content-length'],
        recordList: []
      });
    };

    return Promise.resolve()
    .then(logger('start reading local oui.txt ...'))
    .then(() => readOuiDataFromFile(ouiInfo.ouiFile))
    .then(logger('finished reading!'))
    .then(recordList => ({
      etag: headers.etag,
      lastModified: headers['last-modified'],
      contentLength: headers['content-length'],
      recordList
    }))
    .then((data) => {
      fs.unlinkSync(ouiInfo.ouiFile);
      return data;
    });
  })
  .then(logger('start updating oui info ...'))
  .then(updateOuiData)
  .then(logger('finished update!'))
  .then(({ totalRows, affectedRows, changedRows }) => {
    const end = process.hrtime();
    const time = end[0] - start[0] + ((end[1] - start[1]) / 1e9).toFixed(2);

    if (totalRows === 0) {
      console.log(`\nFinished updating oui file within ${time} seconds, nothing change!\n`);
      return;
    } else {
      console.log(`\nFinished updating oui file within ${time} seconds!\n`);
      console.log(`total: ${totalRows}, new: ${changedRows * 2 - affectedRows}, update: ${affectedRows - changedRows}`)
    }
  })
  .catch((err) => {
    console.log('\nerror occurs => ', err.message);
    console.log(err.stack);
  });
