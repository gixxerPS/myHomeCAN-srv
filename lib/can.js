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
  /* msg format:
   * { ts_sec: 1521104667,
   *   ts_usec: 841370,
   *   id: 299008,
   *   ext: true,
   *   data: <Buffer 00 00 00 00 d8 01 00 00> }  */
  channel.addListener('onMessage', function(msg) {
    onMsgClients.forEach(function (client) {
      client.cb.call(client.obj, msg.id, msg.data);
    });
    log.debug('<= rx: ' + msg.id.toString(16) + ' msg: ' + msg.data.join(' '));
  });
  canOK = true;
} catch (e) {
  log.warn('can startup did not ok. no msgs can be sent or received. reason: ' + e.toString());
}

//see example http://nodecode.de/chat-nodejs-websocket
var onMsgClients = [];

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
    registerOnMsgClient : function (obj, cb) {
      if (typeof(cb) !== 'function') {
        throw new Error('invalid type of callback: ' + typeof(cb));
      }
      if (typeof(obj) !== 'object') {
        throw new Error('invalid type of object: ' + typeof(obj));
      }  
      onMsgClients.push({obj:obj, cb:cb});
    },
    /**
     * @param id {string} - id of receiver
     * @param data {object} - buffer */
    sendMsg : function (id, data) {
      if (id > 0x1FFFFFFF || id < 0) {
        return log.error('id invalid: ' + id);
      }
      if (data.length > 8) {
        return log.error('data length > 8 byte: ' + data);
      }
      var sendObj = {
          id    : id,
          ext   : true,
          data  : data
      };
      if (data.length < 8) {
        sendObj.data = Buffer.concat([data, Buffer.alloc(8-data.length)]);
      }
      log.debug('=> tx: ' + id.toString(16) + ' data ' + sendObj.data.join(' '));
      privateObj.canSendFcn(sendObj);
    },
    
    /* only for test purposes */
    obj : privateObj
}
