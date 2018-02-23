const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const {
  calcHumanReadableSpeed,
  calcHumanReadableSize,
  calcProgressStringBar
} = require('./utils');
const execSync = require('child_process').execSync;

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

  const downloadPath = ouiInfo.ouiFile;
  const downloadDir = path.dirname(downloadPath);

  if (!fs.existsSync(downloadDir)) {
    try {
      execSync(`mkdir -p ${downloadDir}`);
    } catch (err) {
      cb(new Error(`can't create oui download directory: ${downloadPath}`));
      return;
    }
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
      cb(null, false, res.headers);
    } else if (res.statusCode === 200) {
      const ws = fs.createWriteStream(downloadPath);

      const totalSize = parseInt(res.headers['content-length'] || 0, 10);
      const hrTotalSize = calcHumanReadableSize(totalSize);
      const totalSizeStr = `${hrTotalSize[0].toFixed(2)}${hrTotalSize[1]}`;
      let currentSize = 0;

      const start = process.hrtime();
      let prevStart = start;

      console.log(''); // 输出空行

      res.setEncoding('utf8')
      .on('data', (chunk) => {
        currentSize += chunk.length;

        const speed = calcHumanReadableSpeed(chunk.length, prevStart, prevStart = process.hrtime());
        const speedStr = `${speed[0].toFixed(2)}${speed[1]}`;
        const hrCurrentSize = calcHumanReadableSize(currentSize);
        const currentSizeStr = `${hrCurrentSize[0].toFixed(2)}${hrCurrentSize[1]}`;
        const percent = (currentSize * 100 / totalSize).toFixed(2);

        process.stdout.cursorTo(0);
        process.stdout.clearLine(0);
        process.stdout.write(`downloading (total: ${totalSizeStr}), ${calcProgressStringBar(percent, 40)} ${percent}% / ${currentSizeStr} / ${speedStr} ...`);
      })
      .on('end', () => {
        const speed = calcHumanReadableSpeed(totalSize, start, process.hrtime());
        const speedStr = `${speed[0].toFixed(2)}${speed[1]}`;
        const percent = (currentSize * 100 / totalSize).toFixed(2);

        process.stdout.cursorTo(0);
        process.stdout.clearLine(0);
        process.stdout.write(`download done! total: ${totalSizeStr}, average speed: ${speedStr}\n\n`);
      })
      .pipe(ws)
      .on('finish', () => {
        process.nextTick(cb, null, true, res.headers);
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
