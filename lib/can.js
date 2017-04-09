/**
 * http://usejsdoc.org/
 */
var can = require('socketcan');
var util = require('util');
var log = require('log4js').getLogger('can');

var channel = can.createRawChannel("can0", true);
channel.start();

//see example http://nodecode.de/chat-nodejs-websocket

var receiveCB;

channel.addListener('onMessage', function(msg) {
  if (receiveCB) {
    receiveCB(msg.id, msg.data.toString());
  }
  log.debug('received from: ' msg.id + ' msg: ' + msg.data.toString());
  log.debug('TEST: datatype of msg.data = ' typeof(msg.data) );
  
});

module.exports = {
    setReceiveCB : function (cb) {
      if (typeof(cb) === 'function') {
        receiveCB = cb;
      } else {
        throw new Error('invalid type of callback: ' + typeof(cb));
      }
    }
}
