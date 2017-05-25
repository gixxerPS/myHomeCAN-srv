/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var ProcMsg = require('../lib/procmsg.js');
/*
 * msg = header || prio || sender unit id || sender num || 
 * 		receiver unit id || receiver num || code ||
 *      8 byte data
 */

// spaces will be removed. inserted just for readability
var sampleMsg = {
	ms : '',
	su : [
    '0000',       // prio        
    '010',        // txType      
    '00001',      // txId        
    '000',        // rxType      
    '00000',      // rxId        
    '001',        // code        
    '1001100110', // T1 = 18 deg          
    '1001110011', // T2 = 19 deg                  
    '1010000000', // T3 = 20 deg                  
    '1010001101', // T4 = 21 deg                  
    '1010011010', // T5 = 22 deg                  
    '1010100110', // T6 = 23 deg                  
    '0000'        // footer 
      ],
	pu : '',
	iu : [
    '0000',       // prio             
    '100',        // txType 
    '00001',      // txId   
    '001',        // rxType 
    '00000',      // rxId   
    '001',        // code   
    '0000 1000 1000', // in5 , in9 = high  
    '000 000 000 000 001 000 000 000 010 000 000 000', // Tin5=0.5s Tin9=1s
    '0000 0000 0000 0000' // footer 
	    ],
	iuAlive : [
	   '0000',       // prio     
	   '100',        // txType   
     '00001',      // txId     
     '001',        // rxType   
     '00000',      // rxId     
     '000',        // code alive
	   '00000000 00000001 00000000', // high, middle, low // swVersion
	   '00000011',                                        // aliveCnt 
	   '00000000 00000000 00000000 00000000'              // footer   
]
	                      
}
var getSamples = {
    iu : function ()  {
      var msg = msghlp.header + sampleMsg.iu.join('');
      return msg.replace(/ /g, '');
    },
    iuAlive : function ()  {
      var msg = msghlp.header + sampleMsg.iuAlive.join('');
      return msg.replace(/ /g, '');
    },
    su : function ()  {
      var msg = msghlp.header + sampleMsg.su.join('');
      return msg.replace(/ /g, '');
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

	test('parse iu', function() {
	  var id = msghlp.header + '0010' // prio
	    + '100'    // sender type
	    + '00001'  // sender num
      + '001'    // receiver type
      + '00000'  // receiver num 
      + '000'    // code
	  var parsedId = procmsg.parseId(id);
		assert.deepEqual(parsedId.prio, 2);
		assert.deepEqual(parsedId.txType, msghlp.units.itf);
		assert.deepEqual(parsedId.txId, 1);
		assert.deepEqual(parsedId.rxType, msghlp.units.master);
		assert.deepEqual(parsedId.rxId, 0);
		assert.deepEqual(parsedId.code, 0);
	});
	test('seperate msg', function() {
	  var msgobj = procmsg.seperateMsg(getSamples.iu());
	  assert.deepEqual(msgobj.id, '00000000001000000100100000001');
	  assert.deepEqual(msgobj.data, '0000100010000000000000000010000000000100000000000000000000000000');
	});
	test('parse data alive', function() {
	  var msgobj = procmsg.seperateMsg(getSamples.iuAlive());
    var aliveData = procmsg.parseDataAlive(msgobj.data);
    assert.deepEqual(aliveData.sw, '0.1.0');
    assert.deepEqual(aliveData.cnt, 3);
  });
	test('parse data su', function() {
	  var msgobj = procmsg.seperateMsg(getSamples.su());
	  var suDataArr = procmsg.parseDataSu(msgobj.data);
	  assert.deepEqual(suDataArr[0], 17.96875);
    assert.deepEqual(suDataArr[1], 18.984375);
    assert.deepEqual(suDataArr[2], 20.0000);
    assert.deepEqual(suDataArr[3], 21.015625);
    assert.deepEqual(suDataArr[4], 22.03125);
    assert.deepEqual(suDataArr[5], 22.96875);
	});
	test('parse data iu', function() {
    var msgobj = procmsg.seperateMsg(getSamples.iu());
    var iuData = procmsg.parseDataIu(msgobj.data);
    assert.deepEqual(iuData.states[0], 0);
    assert.deepEqual(iuData.states[4], 1); // T5 on
    assert.deepEqual(iuData.states[8], 1); // T9 on
    assert.deepEqual(iuData.states[11], 0);
    assert.deepEqual(iuData.tOn[0], 0);
    assert.deepEqual(iuData.tOn[4], 0.5); // T5 = 0.5s
    assert.deepEqual(iuData.tOn[8], 1);   // T9 = 1s
    assert.deepEqual(iuData.tOn[11], 0);
	});
	test('update alive map with new sender', function(done) {
	  var msgobj = procmsg.seperateMsg(getSamples.iuAlive());
    var aliveDataObj = procmsg.parseDataAlive(msgobj.data);
    procmsg.updateAliveMap(msgobj.id, aliveDataObj, function () {
      assert.deepEqual(Object.keys(procmsg.getAliveMap()).length, 1);
      done();
    });
	});
	test('send alive msg', function() {
	  var spy = sinon.spy(procmsg, 'sendFcn');
    procmsg.sendAlive();
    assert.ok(spy.calledOnce);
    assert.deepEqual(spy.getCall(0).args[0], msghlp.ids.alive);
    assert.deepEqual(spy.getCall(0).args[1].length, 64);
    assert.deepEqual(spy.getCall(0).args[1], 
        msghlp.msgs.aliveHeader + '00000001' + '00000000000000000000000000000000');
  });
	test('send alive msg count alive', function() {
    var spy = sinon.spy(procmsg, 'sendFcn');
    procmsg.sendAlive();
    procmsg.sendAlive();
    assert.deepEqual(spy.callCount, 2);
    assert.deepEqual(spy.getCall(1).args[1].length, 64);
    assert.deepEqual(spy.getCall(1).args[1], 
        msghlp.msgs.aliveHeader + '00000010' + '00000000000000000000000000000000');
  });
	test('send alive msg 8 bit counter overflow', function() {
    var spy = sinon.spy(procmsg, 'sendFcn');
    for (var i = 0; i < 258; i++) {
      procmsg.sendAlive();
    }
    assert.deepEqual(spy.callCount, 258);
    assert.deepEqual(spy.lastCall.args[1], 
        msghlp.msgs.aliveHeader + '00000010' + '00000000000000000000000000000000');
  });
	test('send iu data', function() {
	  var spy = sinon.spy(procmsg, 'sendFcn');
	  procmsg.send({t:'bin', rxid:'10000001.001', outArr:[0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]});
	  assert.deepEqual(spy.callCount, 1);
	  assert.deepEqual(spy.lastCall.args[0], 
	      msghlp.header + msghlp.defaultPrio + msghlp.ids.myTxTypeId + '10000001' + '001'); // code überprüfen!!!
	  assert.deepEqual(spy.lastCall.args[1], '0001000000000000000000000000000000000000000000000000000000000000' );
	});
});

