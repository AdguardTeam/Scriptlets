var inspect = require('eyespect').inspector()
var running = require('../index')
var should = require('should')
var assert = require('assert')
var path = require('path')
var fork = require('child_process').fork
describe('is-running', function () {
  it('should return true when process is running', function () {
    var childScriptPath = path.join(__dirname, 'dummyChild.js')
    var child = fork(childScriptPath)
    var pid = child.pid
    var found = running(pid)
    // cleanup
    child.kill()
    assert.ok(found, 'pid is not running when it should be')
  })

  it('should return false when process is not running', function () {
    // there could be a better way to get a non-running process besides a really big number
    var pid = 20932842309847
    var found = running(pid)
    assert.ok(!found, 'pid is running when it should not be')
  })
})
