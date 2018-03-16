/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var Can = require('../lib/can.js');

require('log4js').getLogger('can').level ='OFF';

suite('CAN', function() {
	setup(function() {
	  this.spysend = sinon.spy(Can.obj, 'canSendFcn');
	});
	teardown(function() {
	  Can.obj.canSendFcn.restore();
	});
	test('send msg fills buffer', function() {
	  var data = Buffer.from([0x1]);
	  var id = 299008;
	  Can.sendMsg(id, data);
	  var expectedBuf = Buffer.alloc(8);
	  expectedBuf[0] = 1;
	  assert.deepEqual(expectedBuf.length, 8);
	  assert.deepEqual(this.spysend.callCount, 1);
	  assert.deepEqual(this.spysend.lastCall.args[0], {id:id, data:expectedBuf, ext:true});
	});
	test('send msg ignore invalid negative id', function() {
	  Can.sendMsg(-1, Buffer.alloc(8));
	  assert.deepEqual(this.spysend.callCount, 0);
	});
	test('send msg ignore invalid id', function() {
      Can.sendMsg(1<<29, Buffer.alloc(8));
      assert.deepEqual(this.spysend.callCount, 0);
    });
   test('send msg does ignore sending more than 8byte', function() {
      Can.sendMsg(299008, Buffer.alloc(9));
      assert.deepEqual(this.spysend.callCount, 0);
    });
});

