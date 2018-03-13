/**
 * http://usejsdoc.org/
 */
var can = require('socketcan');
var util = require('util');
var log = require('log4js').getLogger('can');
var channel;
var canOK = null;

try {
  channel = can.createRawChannel("can0", true);
  channel.start();
  channel.addListener('onMessage', function(msg) {
    if (receiveCB) {
      receiveCB.call(receiveObj, msg.id, msg.data.toString());
    }
    log.debug('received from: ' + msg.id + ' msg: ' + msg.data.toString());
  });
  canOK = true;
} catch (e) {
  log.warn('can startup did not ok. no msgs can be sent or received. reason: ' + e.toString());
}

//see example http://nodecode.de/chat-nodejs-websocket

var receiveCB;
var receiveObj;

var privateObj = {
    canSendFcn : function (obj) {
      if (!canOK) {
        return;
      }
      channel.send({
        id    : obj.id,
        ext   : true,
        data  : obj.data
      });
    }
}

module.exports = {
    setReceiveCB : function (cb, obj) {
      if (typeof(cb) !== 'function') {
        throw new Error('invalid type of callback: ' + typeof(cb));
      }
      if (typeof(obj) !== 'object') {
        throw new Error('invalid type of object: ' + typeof(obj));
      }
      receiveCB = cb;
      receiveObj = obj;
    },
    
    /**
     * @param id {string} - id of receiver
     * @param data {string} - will be converted to buffer */
    sendMsg : function (id, data) {
      if (id.length !== 29) {
        return log.error('id length != 29 bit: ' + id);
      }
      if (data.length > 64) {
        return log.error('data length > 64 bit: ' + data);
      }
      //log.debug('send to: ('+id.length+') ' + id + ' ('+data.length+')' + ' data ' + data);
      var arr = new Array(8);
      var tmp;
      var i = 0;
      for (; i < 8; i++) {
        tmp = data.slice(0+i*8 ,8+i*8);
        if (tmp === '') { // reached end of string ?
          break;
        }
        //console.log('tmp = ' + tmp + ' i = ' + i);
        arr[i] = parseInt(tmp, 2);
      }
      arr.length = Math.min(i, 8);
      privateObj.canSendFcn({
        id    : id,
        ext   : true,
        data  : Buffer.from(arr)
      });
    },
    
    /* only for test purposes */
    obj : privateObj
}
