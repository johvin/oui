// simulate bluebird's promisify function
exports.promisify = function (fn, ctx = {}) {
  const innerFn = function (...args) {
    fn.call(ctx.context || null, ...args, (err, ret) => err ? Promise.reject(err) : Promise.resolve(ret));
  };
  Object.defineProperty(innerFn, 'name', {
    value: `${fn.name}Promise`,
    writable: false,
    enumerable: false,
    configurable: true
  });

  return innerFn;
};
