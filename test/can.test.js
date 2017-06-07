/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var Can = require('../lib/can.js');

suite('CAN', function() {
	setup(function() {
	  this.spysend = sinon.spy(Can.obj, 'canSendFcn');
	});
	teardown(function() {
	  Can.obj.canSendFcn.restore();
	});
	test('send msg converts string to 1byte buffer', function() {
	  var data = '00001111';
	  var id = '00001111000011110000111100001'
	  Can.sendMsg(id, data);
	  var expectedBuf = Buffer.from([parseInt(data, 2)]);
	  assert.deepEqual(expectedBuf.length, 1);
	  assert.deepEqual(this.spysend.callCount, 1);
	  assert.deepEqual(this.spysend.lastCall.args[0], {id:id, data:expectedBuf, ext:true});
	});
	 test('send msg converts string to 2byte buffer', function() {
	   var id = '00001111000011110000111100001'
	    var data = '0000111111110000';
	    Can.sendMsg(id, data);
	    var expectedBuf = Buffer.from([0xF, 0xF0]);
	    assert.deepEqual(this.spysend.callCount, 1);
	    assert.deepEqual(this.spysend.lastCall.args[0], {id:id, data:expectedBuf, ext:true});
	  });
   test('send msg converts string to 8byte buffer', function() {
     var id = '00001111000011110000111100001'
      var data = '0000111111110000000011111111000000001111111100000000111111110000';
      Can.sendMsg(id, data);
      var expectedBuf = Buffer.from([0xF, 0xF0, 0xF, 0xF0, 0xF, 0xF0, 0xF, 0xF0]);
      assert.deepEqual(this.spysend.callCount, 1);
      assert.deepEqual(this.spysend.lastCall.args[0], {id:id, data:expectedBuf, ext:true});
    });
   test('send msg does ignore sending more than 8byte', function() {
     var id = '00001111000011110000111100001'
      var data = '00000111111110000000011111111000000001111111100000000111111110000';
      Can.sendMsg(id, data);
      assert.deepEqual(this.spysend.callCount, 0);
    });
});

