const db = require('./db');

// read oui update info from db
const getOuiInfo = (ouiUrl, ouiOutputPath) => new Promise((resolve, reject) => {
  const conn = db.getConnection();

  conn.query('select id, etag, last_modified, content_length from update_time limit 1', (err, ret) => {
    conn.end();
    if (err) {
      reject(err);
    } else {
      const ouiInfo = {
        url: ouiUrl,
        ouiFile: ouiOutputPath
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

module.exports = getOuiInfo;
