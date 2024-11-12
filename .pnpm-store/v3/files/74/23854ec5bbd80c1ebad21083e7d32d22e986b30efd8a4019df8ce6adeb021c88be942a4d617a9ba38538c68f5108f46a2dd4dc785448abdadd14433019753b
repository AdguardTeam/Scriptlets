module.exports = function (pid) {
  if (module.exports.stub !== module.exports) {
      return module.exports.stub.apply(this, arguments);
  }
  try {
    return process.kill(pid,0)
  }
  catch (e) {
    return e.code === 'EPERM'
  }
}
module.exports.stub = module.exports;
