const mysql = require('mysql');
const db = require('./db');
const { promisify } = require('./utils');

// save oui's info and data into db
const updateOuiData = ({ etag, lastModified, contentLength, recordList}) => {
  if (recordList.length === 0) {
    // 模拟 mysql 的执行返回结果
    return Promise.resolve({
      totalRows: 0,
      affectedRows: 0,
      changedRows: 0
    });
  }
  
  const sqlValues = recordList.map((record, index) => {
    const { mac, org: { name, addr } } = record;
    const str = '(' + [mac, name, addr.street, addr.provinceCity, addr.country].map(it => mysql.escape(it)).join(', ') + ')';
    if (index > 280 && index < 290) {
      console.log('row', index + 1, str);
    }
    return str;
  }).join(', ');

  const dataSql = `insert into oui.oui_org (oui, org_name, org_addr_street, org_addr_province_or_city, org_addr_country) values ${sqlValues} on duplicate key update org_name = values(org_name), org_addr_street =values(org_addr_street), org_addr_province_or_city=values(org_addr_province_or_city), org_addr_country=values(org_addr_country)`;
  const infoSql = `insert into oui.update_time (id, etag, last_modified, content_length, update_count) values (1, '${etag}', '${lastModified}', ${contentLength}, 1) on duplicate key update etag = values(etag), last_modified = values(last_modified), content_length = values(content_length), update_count = update_count + 1`;
  
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

module.exports = updateOuiData;