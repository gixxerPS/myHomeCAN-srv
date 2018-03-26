/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var ProcImg = require('../lib/processimage.js');
var conf = require('../config/appconfig.json');

suite('PROC IMG', function() {
  setup(function() {
    ProcImg.clearIoMap();
  });
  teardown(function() {
  });
  test('register output units', function() {
    assert.ok(!ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu}));
    assert.deepEqual(ProcImg.getIoMap()['81.1'].out.length, 8);
    assert.deepEqual(ProcImg.getIoMap()['81.1'].in, undefined);
  });
  test('register same output unit twice', function() {
    assert.ok(!ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu}));
    assert.ok(!ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu}));
    assert.deepEqual(Object.keys(ProcImg.getIoMap()).length, 1);
  });
  test('register iu', function() {
    assert.ok(!ProcImg.registerUnit({txStr:'61', txType:msghlp.uTypes.iu}));
    assert.deepEqual(ProcImg.getIoMap()['61.1'].in.length, 8);
    assert.deepEqual(ProcImg.getIoMap()['61.1'].out.length, 8);
  });
  test('convert offset', function() {
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
  test('switch output known pu', function() {
    ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu});
    var outArr = ProcImg.setOutput('81.1', 10, 1);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x0]));
  });
  test('switch output doesnt affect other states', function() {
    ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu});
    ProcImg.setOutput('81.1', 10, 1);
    var outArr = ProcImg.setOutput('81.1', 1, 1);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x40]));
    assert.deepEqual(Object.keys(ProcImg.getIoMap()).length, 1);
  });
  test('switch off', function() {
    ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu});
    ProcImg.setOutput('81.1', 1, 1);
    ProcImg.setOutput('81.1', 10, 1);
    ProcImg.setOutput('81.1', 11, 1);
    var outArr = ProcImg.setOutput('81.1', 10, 0);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x10,0x40]));
    assert.deepEqual(Object.keys(ProcImg.getIoMap()).length, 1);
  });
  test('update alive map with new sender', function() {
    ProcImg.updateAliveMap({txStr:'92'}, {sw:'0.0.1', cnt:3});
    assert.deepEqual(Object.keys(ProcImg.getAliveMap()).length, 1);
  });
  test('onmsg alive updates map', function() {
    ProcImg.onMsgAlive({txStr:'92',txType:msghlp.uTypes.pu},
        {sw:'0.0.1', cnt:3});
    var map = ProcImg.getAliveMap();
    assert.deepEqual(map['92'].sw, '0.0.1');
    assert.deepEqual(map['92'].cnt, 3);
    assert.ok(map['92'].last_rx_time);
    assert.deepEqual(map['92'].state, 1);
  });
  test('update alive state not yet warn', function() {
    ProcImg.onMsgAlive({txStr:'92',txType:msghlp.uTypes.pu},
        {sw:'0.0.1', cnt:3});
    ProcImg.checkAliveStates();
    assert.deepEqual(ProcImg.getAliveMap()['92'].state, 1);
  });
  test('update alive state warn', function(done) {
    var orig = conf.COMM.TIMING.WARN;
    conf.COMM.TIMING.WARN = 1;
    ProcImg.onMsgAlive({txStr:'92', txType:msghlp.uTypes.pu},
        {sw:'0.0.1', cnt:3});
    setTimeout(function () {
      ProcImg.checkAliveStates();
      assert.deepEqual(ProcImg.getAliveMap()['92'].state, 2);
      conf.COMM.TIMING.WARN = orig;
      done();
    }, 2); // wait 2 ms
  });
  test('update alive state err', function(done) {
    var orig = conf.COMM.TIMING.ERR;
    conf.COMM.TIMING.ERR = 1;
    ProcImg.onMsgAlive({txStr:'92',txType:msghlp.uTypes.pu},
        {sw:'0.0.1', cnt:3});
    setTimeout(function () {
      ProcImg.checkAliveStates();
      assert.deepEqual(ProcImg.getAliveMap()['92'].state, 0);
      conf.COMM.TIMING.ERR = orig;
      done();
    }, 2); // wait 2 ms
  });
  test('register iu', function() {
    ProcImg.onMsgAlive({txStr:'83',txType:msghlp.uTypes.iu},
        {sw:'0.0.1', cnt:3});
    assert.deepEqual(ProcImg.getIoMap()['83.1'].in.length, 8);
    assert.deepEqual(ProcImg.getIoMap()['83.1'].out.length, 8);
  });
});

