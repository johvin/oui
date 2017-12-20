const fs = require('fs');
const path = require('path');
const db = require('./db');
const { promisify } = require('./utils');
const downloadOui = require('./downloadOui');
const readOui = require('./readOui');

// read oui update info from db
const getOuiInfo = () => new Promise((resolve, reject) => {
  const conn = db.getConnection();

  conn.query('select id, etag, last_modified, content_length from update_time', (err, ret) => {
    conn.end();
    if (err) {
      reject(err);
    } else {
      const ouiInfo = {
        url: 'http://standards-oui.ieee.org/oui.txt',
        ouiFile: path.resolve(__dirname, `../download/oui_${Date.now()}.txt`)
      };

      if (ret.length > 0) {
        ouiInfo.id = ret[0].id;
        ouiInfo.etag = ret[0].etag;
        ouiInfo.lastModified = ret[0].last_modified;
        ouiInfo.contentLength = ret[0].content_length;
      }
      resolve(ouiInfo);
    }
  });
});

// save oui's info and data into db
const updateOuiInfo = ({ etag, lastModified, contentLength, recordList}) => {
  if (recordList.length === 0) {
    // 模拟 mysql 的执行返回结果
    return Promise.resolve({
      totalRows: 0,
      affectedRows: 0,
      changedRows: 0
    });
  }

  const sqlValues = recordList.map((record) => {
    const { mac, org: { name, addr } } = record;
    return `('${mac}', '${name}', '${addr.street}', '${addr.provinceCity}', '${addr.country}')`;
  }).join(', ');
  const dataSql = `insert into oui.oui_org (oui, org_name, org_addr_street, org_addr_province_or_city, org_addr_country) values ${sqlValues} on duplicate key update org_name = values(org_name), org_addr_street =values(org_addr_street), org_addr_province_or_city=values(org_addr_province_or_city), org_addr_country=values(org_addr_country)`;
  const infoSql = `update oui.update_time set etag = '${etag}', last_modified = '${lastModified}', content_length = '${contentLength}', update_count = update_count + 1 where id = 1;`;

  const conn = db.getConnection();
  const beginTransactionPromise = promisify(conn.beginTransaction, { context: conn });
  const queryPromise = promisify(conn.query, { context: conn });
  const commitPromise = promisify(conn.commit, { context: conn });

  return beginTransactionPromise()
    .then(() => queryPromise(dataSql))
    .then((ret) => {
      return queryPromise(infoSql)
        .then(() => commitPromise())
        .then(() => {
          conn.end();
          return {
            totalRows: recordList.length,
            affectedRows: ret.affectedRows,
            changedRows: ret.changedRows
          };
        })
    });

  // conn.beginTransaction((err1) =>{
  //   if (err1) {
  //     return Promise.reject(err1);
  //   }

  //   conn.query(dataSql, (err2, ret2) => {
  //     if (err2) {
  //       return conn.rollback(() => {
  //         Promise.reject(err2);
  //       })
  //     }

  //     conn.query(infoSql, (err3) => {
  //       if (err3) {
  //         return conn.rollback(() => {
  //           Promise.reject(err3);
  //         })
  //       }
  //       conn.commit((err4) => {
  //         if (err4) {
  //           return conn.rollback(() => {
  //             Promise.reject(err4);
  //           })
  //         }
  //         Promise.resolve({
  //           totalRows: recordList.length,
  //           affectedRows: ret2.affectedRows,
  //           changedRows: ret2.changedRows
  //         });
  //       });
  //     });
  //   });
  // });
};

const logger = (msg) => (arg) => {
  console.log(msg);
  return arg;
}

const start = process.hrtime();

getOuiInfo()
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
    .then(() => readOui(ouiInfo.ouiFile))
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
  .then(updateOuiInfo)
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
    console.log('error occurs', err.message);
    console.log(err.stack);
  });
