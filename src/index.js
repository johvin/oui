const fs = require('fs');
const path = require('path');
const db = require('./db');
const readOuiMetaFromDB = require('./readOuiMetaFromDB');
const downloadOui = require('./downloadOui');
const readOuiDataFromFile = require('./readOuiDataFromFile');
const updateOuiData = require('./updateOui');
const { padObjectKeys } = require('./utils');

// oui config
const defaultOuiUrl = 'http://standards-oui.ieee.org/oui.txt';
const ouiDownloadPath = path.resolve(__dirname, `../download/oui_${Date.now()}.txt`);

// whether is main entry file
const isMain = require.main === module;
const printLog = isMain;

function log() {
  if (printLog) {
    const args = [].slice.call(arguments);
    console.log.apply(console, args);
  }
}

// print log progress info
const logger = msg => (arg) => {
  log(msg);
  return arg;
}

// sync oui data to database
function syncOui (dbConf, ouiUrl = defaultOuiUrl) {
  return Promise.resolve()
  .then(() => {
    if (dbConf) {
      db.setDBConf(dbConf);
    }
  })
  .then(logger('start reading oui meta from database ...'))
  .then(() => readOuiMetaFromDB(ouiUrl, ouiDownloadPath))
  .then(logger('finished reading!'))
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
  .then(logger('finished update!'));
}

function syncOuiFromFile (dbConf, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('oui File does not exists');
  }

  if (dbConf) {
    db.setDBConf(dbConf);
  }

  return Promise.resolve()
  .then(logger('start reading local oui.txt ...'))
  .then(() => readOuiDataFromFile(filePath))
  .then(logger('finished reading!'))
  .then(recordList => ({
    etag: '',
    lastModified: '',
    contentLength: 0,
    recordList
  }))
  .then(logger('start updating oui info ...'))
  .then(updateOuiData)
  .then(logger('finished update!'));
}

exports.syncOui = syncOui;
exports.syncOuiFromFile = syncOuiFromFile;

if (isMain) {
  const start = process.hrtime();

  syncOui()
  // syncOuiFromFile(null, 'download/oui_1518258603784.txt')
  .then(({ totalRows, affectedRows, changedRows }) => {
    const duration = process.hrtime(start);
    const time = (duration[0] + (duration[1] / 1e9)).toFixed(2);

    if (totalRows === 0) {
      log(`\nFinished updating oui file within ${time} seconds, nothing change!\n`);
      return;
    } else {
      log(`\nFinished updating oui file within ${time} seconds!\n`);

      // insert 语句中包含 on duplicate key update 时：
      // 1）insert 使 affectedRows 增加 1，
      // 2）update with change 使 affectedRows 增加 2
      // 3) update without change 使 affectedRows 增加 1 (CLIENT_FOUND_ROWS)
      // changedRows 包括 update with change 以及 without change 两部分(test.js 实验的结果，与参考资料所说的不同)
      //
      // reference:
      // 1) https://dev.mysql.com/doc/refman/5.5/en/insert-on-duplicate.html
      // 2) https://github.com/mysqljs/mysql#getting-the-number-of-affected-rows
      //
      // 不同的 sql 对应的结果不同，具体情况具体计算
      const padStrArr = padObjectKeys({
        total: totalRows,
        affectedRows: affectedRows,
        changedRows: changedRows,
        inserted: totalRows - changedRows,
        updated: affectedRows - totalRows,
        notChanged: changedRows + totalRows - affectedRows
      });

      log(padStrArr.join('\n'));
    }
  })
  .catch((err) => {
    log('\nerror occurs => ', err.message);
    log(err.stack);
    process.exit(1);
  });
}
