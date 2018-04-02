/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var conf = require('../config/appconfig.json');
var ProcImg = require('../lib/processimage.js');

var dut = require('../lib/webserver.js');
//require('log4js').getLogger('server').level = 'OFF';

suite('WEBSERVER', function() {
  setup(function() {
    this.stubGetOutput = sinon.stub(ProcImg, 'getOutput');
  });
  teardown(function() {
    ProcImg.getOutput.restore();
  });
  test('getOutputStates', function() {
    this.stubGetOutput.returns(1);
    var ret = dut.getOutputStates(['72.1.6_output_circle']);
    assert.deepEqual(ret, {'72.1.6_output_circle':1});
    assert.ok(this.stubGetOutput.calledWith('72.1', 5));
  });
  test('getOutputStates with unknown unit', function() {
    this.stubGetOutput.returns(null);
    var ret = dut.getOutputStates(['72.1.6_output_circle']);
    assert.deepEqual(ret, {'72.1.6_output_circle':null});
  });
});

