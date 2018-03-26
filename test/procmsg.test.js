/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var ProcMsg = require('../lib/procmsg.js');
var conf = require('../config/appconfig.json');

require('log4js').getLogger('msg').level = 'OFF';

/*
 * msg = header || prio || sender unit id || sender num || 
 * 		receiver unit id || receiver num || code ||
 *      8 byte data
 */

// spaces will be removed. inserted just for readability
var sampleMsg = {
    ms : '',
    su : {
      id: [
        '0000',       // prio        
        '010',        // txType      
        '00001',      // txId        
        '000',        // rxType      
        '00000',      // rxId        
        '001'         // code
        ],
      data: Buffer.from([
        '1001100110', // T1 = 18 deg          
        '1001110011', // T2 = 19 deg                  
        '1010000000', // T3 = 20 deg                  
        '1010001101', // T4 = 21 deg                  
        '1010011010', // T5 = 22 deg                  
        '1010100110', // T6 = 23 deg                  
        '0000'        // footer 
        ])
      },
    iu : {
      id:[
        '0100',       // prio             
        '100',        // txType 
        '10010',      // txId   
        '001',        // rxType 
        '00000',      // rxId   
        '001'        // code
        ],
      data:Buffer.from([
        0x8, 0x80, // in5 , in9 = high , Tin5=0.5s Tin9=1s
        0x0, 0x20, 0x4, 0x0,
        0x0, 0x0 // fill
        ])},
    iuAlive : {
      id:[
        '0000',       // prio     
        '100',        // txType   
        '10010',      // txId     
        '000',        // rxType   
        '00000',      // rxId     
        '000'         // code alive
        ], 
      data:Buffer.from([
        0x0,0x0,0x0,0x0, // fill
        0x3,             // aliveCnt
        0x1, 0x0, 0x0   // high, middle, low // swVersion
        ])}
}

var getSamples = {
    iu : function ()  {
      return {
        id:parseInt(sampleMsg.iu.id.slice(0,6).join(''), 2),
        data:sampleMsg.iu.data
      };
    },
    iuAlive : function ()  {
      return {
        id:parseInt(sampleMsg.iuAlive.id.slice(0,6).join(''), 2),
        data:sampleMsg.iuAlive.data
      };
    },
    su : function ()  {
      return {
        id:parseInt(sampleMsg.su.id.slice(0,6).join(''), 2),
        data:sampleMsg.su.data
      };
    }
}

suite('PROCMSG', function() {
  var procmsg;
  setup(function() {
    procmsg = new ProcMsg(function () {});
  });
  teardown(function() {
    procmsg = undefined;
  });

  test('parse id', function() {
    var parsedId = procmsg.parseId(getSamples.iu().id);
    assert.deepEqual(parsedId.prio, 4);
    assert.deepEqual(parsedId.txType, msghlp.uTypes.iu);
    assert.deepEqual(parsedId.txId, 18);
    assert.deepEqual(parsedId.txStr, '92');
    assert.deepEqual(parsedId.rxType, msghlp.uTypes.master);
    assert.deepEqual(parsedId.rxId, 0);
    assert.deepEqual(parsedId.code, 1);
  });
  test('parse data alive', function() {
    var aliveData = procmsg.parseDataAlive(getSamples.iuAlive().data);
    assert.deepEqual(aliveData.sw, '0.0.1');
    assert.deepEqual(aliveData.cnt, 3);
  });
  test('parse data su', function() {
    var suDataArr = procmsg.parseDataSu(getSamples.su().data);
    // TODO: assert.deepEqual(suDataArr[0], 17.96875);
    // TODO: assert.deepEqual(suDataArr[1], 18.984375);
    // TODO: assert.deepEqual(suDataArr[2], 20.0000);
    // TODO: assert.deepEqual(suDataArr[3], 21.015625);
    // TODO: assert.deepEqual(suDataArr[4], 22.03125);
    // TODO: assert.deepEqual(suDataArr[5], 22.96875);
  });
  test('parse data iu', function() {
    var iuData = procmsg.parseDataIu(getSamples.iu().data);
    assert.deepEqual(iuData.states[0], false);
    assert.deepEqual(iuData.states[4], true); // T5 on
    assert.deepEqual(iuData.states[8], true); // T9 on
    assert.deepEqual(iuData.states[11], false);
    assert.deepEqual(iuData.tOn[0], 0);
    assert.deepEqual(iuData.tOn[4], 0.5); // T5 = 0.5s
    assert.deepEqual(iuData.tOn[8], 1);   // T9 = 1s
    assert.deepEqual(iuData.tOn[11], 0);
  });
  test('send alive msg', function() {
    var spy = sinon.spy(procmsg, 'sendFcn');
    procmsg.sendAlive();
    assert.ok(spy.calledOnce);
    assert.deepEqual(spy.getCall(0).args[0], 0x21<<11);
    assert.deepEqual(spy.getCall(0).args[1].length, 8);
    assert.deepEqual(spy.getCall(0).args[1], 
      Buffer.concat([msghlp.msgs.aliveHeader, Buffer.from([0x1]), msghlp.msgs.aliveFooter]));
  });
  test('send alive msg count alive', function() {
    var spy = sinon.spy(procmsg, 'sendFcn');
    procmsg.sendAlive();
    procmsg.sendAlive();
    assert.deepEqual(spy.callCount, 2);
    assert.deepEqual(spy.getCall(1).args[1].length, 8);
    assert.deepEqual(spy.getCall(1).args[1], 
        Buffer.concat([msghlp.msgs.aliveHeader, Buffer.from([0x2]), msghlp.msgs.aliveFooter]));
  });
  test('send alive msg 8 bit counter overflow', function() {
    var spy = sinon.spy(procmsg, 'sendFcn');
    for (var i = 0; i < 258; i++) {
      procmsg.sendAlive();
      assert.deepEqual(spy.getCall(i).args[1].length, 8);
    }
    assert.deepEqual(spy.callCount, 258);
    assert.deepEqual(spy.lastCall.args[1], 
        Buffer.concat([msghlp.msgs.aliveHeader, Buffer.from([0x2]), msghlp.msgs.aliveFooter]));
  });
  test('str2IdOffsSend', function() {
    var ret = msghlp.str2IdOffsSend('61.1.1');
    assert.deepEqual(ret, 0x10B09);
  });
  test('send iu data', function() {
    var spy = sinon.spy(procmsg, 'sendFcn');
    var outs = Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x1]);
    procmsg.send({rxid:'81.1', out:outs});
    assert.deepEqual(spy.callCount, 1);
    assert.deepEqual(spy.lastCall.args[0], 0x10C09);
    assert.deepEqual(spy.lastCall.args[1], outs);
  });
  test('register on msg alive client', function() {
    var cnt = 1;
    var testObj = {testFcn : function () {cnt++;} };
    procmsg.registerOnMsgAliveClient(testObj, testObj.testFcn);
    procmsg.onMsg(getSamples.iuAlive().id, getSamples.iuAlive().data)
    assert.deepEqual(cnt, 2);
  });
});

