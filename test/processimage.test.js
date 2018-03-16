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
  test('register output units', function() {
    assert.ok(!ProcImg.registerOutUnit('81.1'));
    assert.deepEqual(ProcImg.getOutMap()['81.1'].out.length, 8);
  });
  test('register same output unit twice', function() {
    assert.ok(!ProcImg.registerOutUnit('81.1'));
    assert.ok(!ProcImg.registerOutUnit('81.1'));
    assert.deepEqual(Object.keys(ProcImg.getOutMap()).length, 1);
  });
  test('register same output unit twice', function() {
    var convOffs = ProcImg.convertOffs(0);
    assert.deepEqual(convOffs, {idx:7, mask:0x80});
    convOffs = ProcImg.convertOffs(1);
    assert.deepEqual(convOffs, {idx:7, mask:0x40});
    convOffs = ProcImg.convertOffs(2);
    assert.deepEqual(convOffs, {idx:7, mask:0x20});
    convOffs = ProcImg.convertOffs(3);
    assert.deepEqual(convOffs, {idx:7, mask:0x10});
    convOffs = ProcImg.convertOffs(4);
    assert.deepEqual(convOffs, {idx:7, mask:0x8});
    convOffs = ProcImg.convertOffs(5);
    assert.deepEqual(convOffs, {idx:7, mask:0x4});
    convOffs = ProcImg.convertOffs(6);
    assert.deepEqual(convOffs, {idx:7, mask:0x2});
    convOffs = ProcImg.convertOffs(7);
    assert.deepEqual(convOffs, {idx:7, mask:0x1});
    convOffs = ProcImg.convertOffs(8);
    assert.deepEqual(convOffs, {idx:6, mask:0x80});
    convOffs = ProcImg.convertOffs(9);
    assert.deepEqual(convOffs, {idx:6, mask:0x40});
    convOffs = ProcImg.convertOffs(10);
    assert.deepEqual(convOffs, {idx:6, mask:0x20});
    convOffs = ProcImg.convertOffs(11);
    assert.deepEqual(convOffs, {idx:6, mask:0x10});
    convOffs = ProcImg.convertOffs(12);
    assert.deepEqual(convOffs, {idx:6, mask:0x8});
    convOffs = ProcImg.convertOffs(13);
    assert.deepEqual(convOffs, {idx:6, mask:0x4});
    convOffs = ProcImg.convertOffs(14);
    assert.deepEqual(convOffs, {idx:6, mask:0x2});
    convOffs = ProcImg.convertOffs(15);
    assert.deepEqual(convOffs, {idx:6, mask:0x1});
  });
  test('switch output unknown pu registers unit', function() {
    var outArr = ProcImg.setOutput('81.1', 10, 1);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x0]));
    assert.deepEqual(Object.keys(ProcImg.getOutMap()).length, 1);
  });
  test('switch output known pu', function() {
    var outArr = ProcImg.setOutput('81.1', 10, 1);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x0]));
    assert.deepEqual(Object.keys(ProcImg.getOutMap()).length, 1);
  });
  test('switch output doesnt affect other states', function() {
    ProcImg.setOutput('81.1', 10, 1);
    var outArr = ProcImg.setOutput('81.1', 1, 1);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x40]));
    assert.deepEqual(Object.keys(ProcImg.getOutMap()).length, 1);
  });
  test('switch off', function() {
    ProcImg.setOutput('81.1', 1, 1);
    ProcImg.setOutput('81.1', 10, 1);
    ProcImg.setOutput('81.1', 11, 1);
    var outArr = ProcImg.setOutput('81.1', 10, 0);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x10,0x40]));
    assert.deepEqual(Object.keys(ProcImg.getOutMap()).length, 1);
  });
});

