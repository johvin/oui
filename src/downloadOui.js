const http = require('http');
const fs = require('fs');
const url = require('url');

/**
 * 下载 oui 文件内容
 * @param {*} ouiInfo 
 * @param {*} cb (err, change, headers)
 */
const downloadOui = (ouiInfo, cb) => {
  if (!('url' in ouiInfo) || typeof ouiInfo.url !== 'string') {
    cb(new Error('oui url is required!'));
    return;
  }

  const ouiUrl = url.parse(ouiInfo.url);
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36'
  };

  if (ouiInfo.etag) {
    headers['if-none-match'] = ouiInfo.etag;
  }
  if (ouiInfo.lastModified) {
    headers['if-modified-since'] = ouiInfo.lastModified;
  }

  http.request({
    protocol: ouiUrl.protocol,
    host: ouiUrl.host,
    port: ouiUrl.port,
    path: ouiUrl.path,
    method: 'GET',
    headers: headers
  }, (res) => {
    if (res.statusCode === 304) {
      cb(null, false);
    } else if (res.statusCode === 200) {
      const ws = fs.createWriteStream(ouiInfo.ouiFile);
      res.setEncoding('utf8');
      res.pipe(ws)
      .on('finish', () => {
        cb(null, true, res.headers);
      })
      .on('error', cb);
    } else {
      cb(new Error(`unexpected response status code: ${res.statusCode}`));
    }
  })
  .on('error', cb)
  .end();
};

/**
 * 根据 ouiInfo 判断 oui 文件是否改变，如果改变则下载 oui 文件
 * @param {*} ouiInfo 
 */
const downloadOuiPromise = ouiInfo => new Promise((resolve, reject) => {
  downloadOui(ouiInfo, (err, change, headers) => {
    if (err) {
      reject(err);
    } else {
      resolve({
        change,
        ouiInfo,
        headers
      });
    }
  });
});

module.exports = downloadOuiPromise;
