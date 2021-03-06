/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var ProcMsg = require('../lib/procmsg.js');
var conf = require('../config/appconfig.json');

//require('log4js').getLogger('msg').level = 'OFF';

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
      data:Buffer.from([ // in5 , in9 = high , Tin5=0.5s Tin9=1s
        0x0, 0x0, 
        0x0, 0x0, 0x0, 0x0,
        0x80, // byte 6 = Tin2 Tin1 in12 .. in9
        0x8 // byte 7 = in8 .. in1
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
        ])},
      iuOut : {
          id:[
            '0100',       // prio             
            '100',        // txType 
            '10010',      // txId   
            '001',        // rxType 
            '00000',      // rxId   
            '010'         // code
            ],
          data:Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
            0x80, // byte 6 = out12 .. out9 
            0x8 // byte 7 = out8 .. out1
            ])},
      puOut : {
        id:[
          '0100',       // prio             
          '011',        // txType 
          '10011',      // txId   
          '001',        // rxType 
          '00000',      // rxId   
          '010'        // code
          ],
        data:Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
          0x40, // byte 6 = out16 .. out9
          0x4   // byte 7 = out8 .. out1
          ])}
}

var getSamples = {
    iu : function ()  {
      return {
        id:parseInt(sampleMsg.iu.id.slice(0,6).join(''), 2),
        data:sampleMsg.iu.data
      };
    },
    iuOut : function ()  {
      return {
        id:parseInt(sampleMsg.iuOut.id.slice(0,6).join(''), 2),
        data:sampleMsg.iuOut.data
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
    },
    puOut : function ()  {
      return {
        id:parseInt(sampleMsg.puOut.id.slice(0,6).join(''), 2),
        data:sampleMsg.puOut.data
      };
    }
}

suite('PROCMSG', function() {
  var procmsg;
  setup(function() {
    procmsg = new ProcMsg();
    procmsg.setSendFcn(function () {});
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
  test('parse data iu in', function() {
    var iuData = procmsg.parseDataIuIn(getSamples.iu().data);
    assert.deepEqual(iuData.iuIn.states, 
        Buffer.from([0x10,0x1]));
//    assert.deepEqual(iuData.tOn[0], 0);
//    assert.deepEqual(iuData.tOn[4], 0.5); // T5 = 0.5s
//    assert.deepEqual(iuData.tOn[8], 1);   // T9 = 1s
//    assert.deepEqual(iuData.tOn[11], 0);
  });
  test('parse data iu out', function() {
    var iuData = procmsg.parseDataIuOut(getSamples.iuOut().data);
    assert.deepEqual(iuData.iuOut.states, 
        Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x80, 0x8]));
  });
  test('parse data pu out', function() {
    var puData = procmsg.parseDataPuOut(getSamples.puOut().data);
    assert.deepEqual(puData.puOut.states, 
        Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x40, 0x4]));
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
  test('register on msg data client iu in', function() {
    var cnt = 1;
    var gidObj, gdata, guType;
    var testObj = {testFcn : function (idObj, data, uType) {cnt++;gidObj=idObj;gdata=data;guType=uType} };
    procmsg.registerOnMsgDataClient(testObj, testObj.testFcn);
    procmsg.onMsg(getSamples.iu().id, getSamples.iu().data);
    assert.deepEqual(cnt, 2);
    assert.deepEqual(gidObj, {code:1, prio:4, txType:4, txId:18, txStr:'92', rxType:1, rxId:0});
    assert.deepEqual(gdata, {iuIn:{states:Buffer.from([0x10, 0x1]),
      tOn:[0,0,0,0,0,0,0,0,0,0,0,0]}});
  });
  test('register on msg data client iu out', function() {
    var cnt = 1;
    var gidObj, gdata, guType;
    var testObj = {testFcn : function (idObj, data, uType) {cnt++;gidObj=idObj;gdata=data;guType=uType} };
    procmsg.registerOnMsgDataClient(testObj, testObj.testFcn);
    procmsg.onMsg(getSamples.iuOut().id, getSamples.iuOut().data);
    assert.deepEqual(cnt, 2);
    assert.deepEqual(gidObj, {code:2, prio:4, txType:4, txId:18, txStr:'92', rxType:1, rxId:0});
    assert.deepEqual(gdata, {iuOut:{states:Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x80, 0x8])}});
  });
  test('register on msg data client pu out', function() {
    var cnt = 1;
    var gidObj, gdata, guType;
    var testObj = {testFcn : function (idObj, data, uType) {cnt++;gidObj=idObj;gdata=data;guType=uType} };
    procmsg.registerOnMsgDataClient(testObj, testObj.testFcn);
    procmsg.onMsg(getSamples.puOut().id, getSamples.puOut().data);
    assert.deepEqual(cnt, 2);
    assert.deepEqual(gidObj, {code:2, prio:4, txType:3, txId:19, txStr:'73', rxType:1, rxId:0});
    assert.deepEqual(gdata, {puOut:{states:Buffer.from([0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x40, 0x4])}});
  });
  test('register on msg data client doesnt call on alive', function() {
    var cnt = 1;
    var testObj = {testFcn : function () {cnt++;} };
    procmsg.registerOnMsgDataClient(testObj, testObj.testFcn);
    procmsg.onMsg(getSamples.iuAlive().id, getSamples.iuAlive().data)
    assert.deepEqual(cnt, 1);
  });
  test('register on msg alive client doesnt call on data', function() {
    var cnt = 1;
    var testObj = {testFcn : function () {cnt++;} };
    procmsg.registerOnMsgAliveClient(testObj, testObj.testFcn);
    procmsg.onMsg(getSamples.iu().id, getSamples.iu().data);
    assert.deepEqual(cnt, 1);
  });
});

