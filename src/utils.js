// simulate bluebird's promisify function
exports.promisify = function (fn, ctx = {}) {
  const innerFn = (...args) => new Promise((resolve, reject) => {
    fn.call(ctx.context || null, ...args, (err, ret) => err ? reject(err) : resolve(ret));
  });
  Object.defineProperty(innerFn, 'name', {
    value: `${fn.name}Promise`,
    writable: false,
    enumerable: false,
    configurable: true
  });

  return innerFn;
};

// calc network download speed (human readable)
exports.calcHumanReadableSpeed = (size, startHrtime, endHrtime) => {
  const duration = endHrtime[0] - startHrtime[0] + (endHrtime[1] - startHrtime[1]) / 1e9;
  let unitArray = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let count = 0;
  let speed = size / duration;

  while (speed > 1024) {
    speed /= 1024;
    count += 1;
  }

  if (count > unitArray.length - 1) {
    count = unitArray.length - 1;
    speed *= Math.pow(1024, count - unitArray.length + 1);
  }

  return [speed, unitArray[count]];
}

// calc file size (human readable)
exports.calcHumanReadableSize = (size) => {
  let unitArray = ['B', 'KB', 'MB', 'GB'];
  let count = 0;

  while (size > 1024) {
    size /= 1024;
    count += 1;
  }

  if (count > unitArray.length - 1) {
    count = unitArray.length - 1;
    size *= Math.pow(1024, count - unitArray.length + 1);
  }

  return [size, unitArray[count]];
}

// calc progress string bar like
// [=========================================]
exports.calcProgressStringBar = (percent, length) => {
  if (percent > 100) {
    percent = 100;
  }

  const cur = Math.round(percent * length / 100);

  return `[${'='.repeat(cur)}${' '.repeat(length - cur)}]`;
}

function longestString(strArr) {
  return Math.max(...strArr.map(str => str.length));
}

// 对齐 object 的 keys，以便于输出
exports.padObjectKeys = (obj) => {
  const keys = Object.keys(obj);
  const maxLength = longestString(keys);

  const arr = [];
  keys.forEach((key) => {
    arr.push(`${key}${' '.repeat(maxLength - key.length)} : ${obj[key]}`);
  });
  return arr;
}
