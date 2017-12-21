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
