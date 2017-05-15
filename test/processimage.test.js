/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var ProcImg = require('../lib/processimage.js');

suite('PROC IMG', function() {
	setup(function() {
	  ProcImg.clearOutMap();
	});
	teardown(function() {
	});
	test('switch output unknown pu registers unit', function() {
    var outArr = ProcImg.setOutput('10000001', 10, 1);
    assert.deepEqual(outArr[10], 1);
    assert.deepEqual(Object.keys(ProcImg.getOutMap()).length, 1);
  });
	test('register output units', function() {
    assert.ok(!ProcImg.registerOutUnit('10000001'));
    assert.deepEqual(ProcImg.getOutMap()['10000001'].out.length, 64);
  });
	test('register same output unit twice', function() {
    assert.ok(!ProcImg.registerOutUnit('10000001'));
    assert.ok(!ProcImg.registerOutUnit('10000001'));
    assert.deepEqual(Object.keys(ProcImg.getOutMap()).length, 1);
  });
	test('switch output known pu', function() {
    var outArr = ProcImg.setOutput('10000001', 10, 1);
    assert.deepEqual(outArr.length, 64);
    assert.deepEqual(outArr[10], 1);
  });
});

