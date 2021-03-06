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
    ProcImg.clearAliveMap();
  });
  teardown(function() {
  });
  test('register output units', function() {
    assert.ok(!ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu}));
    assert.deepEqual(ProcImg.getIoMap()['81'].out.length, 8);
    assert.deepEqual(ProcImg.getIoMap()['81'].in, undefined);
  });
  test('register same output unit twice', function() {
    assert.ok(!ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu}));
    assert.ok(!ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu}));
    assert.deepEqual(Object.keys(ProcImg.getIoMap()).length, 1);
  });
  test('register iu', function() {
    assert.ok(!ProcImg.registerUnit({txStr:'61', txType:msghlp.uTypes.iu}));
    assert.deepEqual(ProcImg.getIoMap()['61'].in.length, 8);
    assert.deepEqual(ProcImg.getIoMap()['61'].inOld.length, 8);
    assert.deepEqual(ProcImg.getIoMap()['61'].out.length, 8);
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
    var outArr = ProcImg.setOutput('81', 10, 1);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x0]));
  });
  test('switch output known pu fix code', function() {
    ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu});
    var outArr = ProcImg.setOutput('81.1', 10, 1);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x0]));
  });
  test('switch output doesnt affect other states', function() {
    ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu});
    ProcImg.setOutput('81', 10, 1);
    var outArr = ProcImg.setOutput('81', 1, 1);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x20,0x40]));
    assert.deepEqual(Object.keys(ProcImg.getIoMap()).length, 1);
  });
  test('switch off', function() {
    ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu});
    ProcImg.setOutput('81', 1, 1);
    ProcImg.setOutput('81', 10, 1);
    ProcImg.setOutput('81', 11, 1);
    var outArr = ProcImg.setOutput('81', 10, 0);
    assert.deepEqual(outArr, Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x10,0x40]));
    assert.deepEqual(Object.keys(ProcImg.getIoMap()).length, 1);
  });
  test('get output 1 known pu', function() {
    ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu, code:1});
    ProcImg.setOutput('81', 10, 1);
    var ret = ProcImg.getOutput('81', 10);
    assert.deepEqual(ret, 1);
  });
  test('get output 0 known pu', function() {
  ProcImg.registerUnit({txStr:'81', txType:msghlp.uTypes.pu, code:1});
  ProcImg.setOutput('81', 10, 1);
    var ret = ProcImg.getOutput('81', 9);
    assert.deepEqual(ret, 0);
  });
  test('get output unknown pu', function() {
    var ret = ProcImg.getOutput('81', 10);
    assert.deepEqual(ret, null);
  });
  test('update alive map with new sender', function() {
    ProcImg.updateAliveMap({txStr:'92', txType:msghlp.uTypes.pu}, {sw:'0.0.1', cnt:3});
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
    assert.deepEqual(map['92'].type, msghlp.uTypes.pu);
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
  test('register iu on alive', function() {
    ProcImg.onMsgAlive({txStr:'83',txType:msghlp.uTypes.iu},
        {sw:'0.0.1', cnt:3});
    assert.deepEqual(ProcImg.getIoMap()['83'].in.length, 8);
    assert.deepEqual(ProcImg.getIoMap()['83'].out.length, 8);
  });
  test('update input map iu', function() {
    var idObj = {
        prio: 4,
        txType : msghlp.uTypes.iu,
        txId : 18,
        txStr : '61',
        rxType : msghlp.uTypes.master,
        rxId : 0,
        code : 1
    }
    // in5=high, in9=high
    var data = {
        iuIn : { states :
            Buffer.from([0x10, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 ])
        } };
    ProcImg.registerUnit({txStr:'61', txType:msghlp.uTypes.iu});
    ProcImg.onMsgData(idObj, data);
    assert.deepEqual(ProcImg.getIoMap()['61'].in,
        Buffer.from([0x10,0x1,0x0,0x0,0x0,0x0,0x0,0x0]));
    assert.deepEqual(ProcImg.getIoMap()['61'].inOld,
        Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0]));
    assert.deepEqual(ProcImg.getIoMap()['61'].out,
        Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0]));
  });
  test('convert offset input', function() {
    var convOffs = ProcImg.convertOffsIn(0);
    assert.deepEqual(convOffs, {idx:0, mask:0x1});
    convOffs = ProcImg.convertOffsIn(1);
    assert.deepEqual(convOffs, {idx:0, mask:0x2});
    convOffs = ProcImg.convertOffsIn(2);
    assert.deepEqual(convOffs, {idx:0, mask:0x4});
    convOffs = ProcImg.convertOffsIn(3);
    assert.deepEqual(convOffs, {idx:0, mask:0x8});
    convOffs = ProcImg.convertOffsIn(4);
    assert.deepEqual(convOffs, {idx:0, mask:0x10});
    convOffs = ProcImg.convertOffsIn(5);
    assert.deepEqual(convOffs, {idx:0, mask:0x20});
    convOffs = ProcImg.convertOffsIn(6);
    assert.deepEqual(convOffs, {idx:0, mask:0x40});
    convOffs = ProcImg.convertOffsIn(7);
    assert.deepEqual(convOffs, {idx:0, mask:0x80});
    convOffs = ProcImg.convertOffsIn(8);
    assert.deepEqual(convOffs, {idx:1, mask:0x1});
    convOffs = ProcImg.convertOffsIn(9);
    assert.deepEqual(convOffs, {idx:1, mask:0x2});
    convOffs = ProcImg.convertOffsIn(10);
    assert.deepEqual(convOffs, {idx:1, mask:0x4});
    convOffs = ProcImg.convertOffsIn(11);
    assert.deepEqual(convOffs, {idx:1, mask:0x8});
    convOffs = ProcImg.convertOffsIn(12);
    assert.deepEqual(convOffs, {idx:1, mask:0x10});
    convOffs = ProcImg.convertOffsIn(13);
    assert.deepEqual(convOffs, {idx:1, mask:0x20});
    convOffs = ProcImg.convertOffsIn(14);
    assert.deepEqual(convOffs, {idx:1, mask:0x40});
    convOffs = ProcImg.convertOffsIn(15);
    assert.deepEqual(convOffs, {idx:1, mask:0x80});
  });
  test('get input 1 known iu', function() {
    ProcImg.registerUnit({txStr:'89', txType:msghlp.uTypes.iu});
    var idObj = {
      prio: 4,
      txType : msghlp.uTypes.iu,
      txId : 18,
      txStr : '89',
      rxType : msghlp.uTypes.master,
      rxId : 0,
      code : 1
    }
    var data = {
      iuIn : { states : // inputs in normal order !
          Buffer.from([0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 ])
      } };
    ProcImg.onMsgData(idObj, data);
    var ret = ProcImg.getInput('89', 0);
    assert.deepEqual(ret, 1);
  });
  test('get input 0 known iu', function() {
    ProcImg.registerUnit({txStr:'89', txType:msghlp.uTypes.iu, code:1});
    var ret = ProcImg.getInput('89', 0);
    assert.deepEqual(ret, 0);
  });
  test('get input unknown iu', function() {
    var ret = ProcImg.getInput('81', 0);
    assert.deepEqual(ret, null);
  });
  test('update input map iu with old state', function() {
    var idObj = {
        prio: 4,
        txType : msghlp.uTypes.iu,
        txId : 18,
        txStr : '61',
        rxType : msghlp.uTypes.master,
        rxId : 0,
        code : 1
    }
    // in5=high, in9=high
    var data = {
        iuIn : { states :
            Buffer.from([0x10, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 ])
        } };
    ProcImg.registerUnit({txStr:'61', txType:msghlp.uTypes.iu});
    ProcImg.onMsgData(idObj, data);
    data.iuIn.states[0] = 0;
    data.iuIn.states[1] = 0;
    ProcImg.onMsgData(idObj, data);
    assert.deepEqual(ProcImg.getIoMap()['61'].in,
        Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0]));
    assert.deepEqual(ProcImg.getIoMap()['61'].inOld,
        Buffer.from([0x10,0x1,0x0,0x0,0x0,0x0,0x0,0x0]));
  });
  test('update io map iu out', function() {
    var idObj = {
        prio: 4,
        txType : msghlp.uTypes.iu,
        txId : 18,
        txStr : '61',
        rxType : msghlp.uTypes.master,
        rxId : 0,
        code : 2
    }
    var data = {
        iuOut : { states :
            Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
              0x80, // byte 6 = out12 .. out9 
              0x8 // byte 7 = out8 .. out1
              ])
        } };
    ProcImg.registerUnit({txStr:'61', txType:msghlp.uTypes.iu});
    ProcImg.onMsgData(idObj, data);
    assert.deepEqual(ProcImg.getIoMap()['61'].in,
        Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x0]));
    assert.deepEqual(ProcImg.getIoMap()['61'].out,
        Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x80,0x8]));
  });
  test('call clients once for same inputs', function() {
    var cnt=0;
    var gidObj, gdata, guType;
    var testObj = {testFcn : function (idObj, data, uType) {cnt++;gidObj=idObj;gdata=data;guType=uType} };
    ProcImg.registerOnInputEventClient(testObj, testObj.testFcn);
    
    var idObj = {
        prio: 4,
        txType : msghlp.uTypes.iu,
        txId : 18,
        txStr : '61',
        rxType : msghlp.uTypes.master,
        rxId : 0,
        code : 2
    }
    var data = { iuIn : { states :
            Buffer.from([0x10, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 ]) } };
    ProcImg.registerUnit({txStr:'61', txType:msghlp.uTypes.iu});
    ProcImg.onMsgData(idObj, data);
    ProcImg.onMsgData(idObj, data); // call with same data
    assert.deepEqual(cnt, 1);
  });
  test('call clients twice for changed inputs', function() {
    var cnt=0;
    var gidObj, gdata, guType;
    var testObj = {testFcn : function (idObj, data, uType) {cnt++;gidObj=idObj;gdata=data;guType=uType} };
    ProcImg.registerOnInputEventClient(testObj, testObj.testFcn);
    
    var idObj = {
        prio: 4,
        txType : msghlp.uTypes.iu,
        txId : 18,
        txStr : '61',
        rxType : msghlp.uTypes.master,
        rxId : 0,
        code : 2
    }
    var data = { iuIn : { states :
            Buffer.from([0x10, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 ]) } };
    ProcImg.registerUnit({txStr:'61', txType:msghlp.uTypes.iu});
    ProcImg.onMsgData(idObj, data);
    data.iuIn.states[0] = 0;
    data.iuIn.states[1] = 0;
    ProcImg.onMsgData(idObj, data); // call with changed data
    assert.deepEqual(cnt, 2);
    assert.deepEqual(gdata.iuIn.changed, Buffer.from([0x10, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 ]));
  });
  test('update io map pu out', function() {
    var idObj = {
        prio: 4,
        txType : msghlp.uTypes.pu,
        txId : 19,
        txStr : '73',
        rxType : msghlp.uTypes.master,
        rxId : 0,
        code : 2
    }
    var data = {
        puOut : { states :
            Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
              0x80, // byte 6 = out12 .. out9 
              0x8 // byte 7 = out8 .. out1
              ])
        } };
    ProcImg.registerUnit({txStr:'73', txType:msghlp.uTypes.pu});
    ProcImg.onMsgData(idObj, data);
    assert.deepEqual(ProcImg.getIoMap()['73'].out,
        Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x80,0x8]));
  });
  
//  test('update input map iu update oldStates', function() {
//    var idObj = {
//        prio: 4,
//        txType : msghlp.uTypes.iu,
//        txId : 18,
//        txStr : '61',
//        rxType : msghlp.uTypes.master,
//        rxId : 0,
//        code : 1
//    }
//    // in5=high, in9=high
//    var data = {
//        iuIn : { states :
//            Buffer.from([0x10, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0 ])
//        } };
//    ProcImg.registerUnit({txStr:'61', txType:msghlp.uTypes.iu});
//    ProcImg.onMsgData(idObj, data);
//    assert.deepEqual(ProcImg.getIoMap()['61.1'].in,
//        Buffer.from([0x10,0x1,0x0,0x0,0x0,0x0,0x0,0x0]));
//  });
});

