/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;

var msghlp = require('../lib/msghlp.js');
/*
 * msg = header || prio || sender unit id || sender num || 
 * 		receiver unit id || receiver num || code ||
 *      8 byte data
 */

// spaces will be removed. inserted just for readability
var sampleMsg = {
	ms : '',
	su : '',
	pu : '',
	iu : {
	  prio         : '0000',
	  senderUnitId : '00010',
	  senderNum    : '001',
	  receiverUnitId : '001',
	  receiverNum  : '00000',
	  code         : '000',
	  dataT        : '0000 1000 1000', // in5 , in9 = high
	  dataTon      : '000 000 000 000 001 000 000 000 010 000 000 000', // Tin5=0.5s Tin9=1s
	  footer       : '0000 0000 0000 0000'
	}
	                      
}
var getSamples = {
    iu : function ()  {
      var msg = msghlp.header + sampleMsg.iu.prio + sampleMsg.iu.senderUnitId+ sampleMsg.iu.senderNum
      + sampleMsg.iu.receiverUnitId + sampleMsg.iu.receiverNum + sampleMsg.iu.code
      + sampleMsg.iu.dataT + sampleMsg.iu.dataTon + sampleMsg.iu.footer;
      return msg.replace(/ /g, '');
    }
}


suite('CAN', function() {
	setup(function() {
		// ...
	});
	teardown(function() {
		// ...
	});

	test('dummy', function() {
		assert.deepEqual(-1, getSamples.iu());
	});
});

