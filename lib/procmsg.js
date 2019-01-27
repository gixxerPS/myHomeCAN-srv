/**
 * Process incoming and outgoing messages.
 * Keeps track of alive state of all nodes in mapAlive.
 */
'use strict';
var util = require('util');
require('sprintf.js');

var mu = require('./myutil.js');
var msghlp = require('./msghlp.js');
var log = require('log4js').getLogger('msg');
var conf = require('../config/appconfig.json');

/**
 * see CAN Konzept myHomeCan.docx */
var tempOffs = 384;
var tempGain = 80/1024;

var lHeader = msghlp.header.length;

/**
 * @constructor
 * @param sendFcn */
function ProcMsg() {
  this.aliveCnt = new Uint8Array(1); // handle as byte variable
  
  this.onMsgClients = [];
  this.onMsgDataClients = [];
}

/**
 * Function to send process image data via can.
 * @param data {object} - {rxid:rxid, outArr:Buffer[0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x1} */
ProcMsg.prototype.send = function send(data) {
  if (data.out.length !== 8) {
    log.warn('sending unarranged num of bytes: ' + data.out.length);
  }
  if (!this.sendFcn) {
    log.error('no send function');
  }
  log.debug('TX => id=' + data.rxid + ' idRaw=' + msghlp.str2IdOffsSend(data.rxid).toString(16)
      + ' outputs: ' + mu.buf2HexStr(data.out));
  this.sendFcn(msghlp.str2IdOffsSend(data.rxid), data.out);
}

/**
 * @param id {string} - incoming id string */
ProcMsg.prototype.parseId = function parseId(id) {
  var txShr = (id >> 11);
  return {
    prio   : (id >> 19) & 0xF,
    txType : (id >> 16) & 0x7,
    txId   : txShr & 0x1F,
    txStr  : (txShr & 0xFF).toString(16),
    rxType : (id >> 8) & 0x7,
    rxId   : (id >> 3) & 0x1F,
    code   : (id) & 0x7
  }
}

/**
 * @param data {object} - <Buffer 00 01 00 03 00 00 00 00> */
ProcMsg.prototype.parseDataAlive = function parseDataAlive(data) {
  if (data[7] === undefined) {
    return {
      sw : 'undef',
      cnt : -1
    }
  }
  return {
    sw  : data[7].toString() + '.' + data[6].toString() + '.' + data[5].toString(),//data.slice(5,8).join('.'),
    cnt : data[4]
  }
}

/**
 * @param data {object} - <Buffer 4e fb 80 cd 82 8e 00> */
ProcMsg.prototype.parseDataSu = function parseDataSu(data) {
  return {
    suIn : [
    ((data.readInt16BE(0) >> 6) & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain
    ]
  }
}

/**
 * incoming:
 * byte 6 = Tin2 Tin1 in12 .. in9
 * byte 7 = in8 .. in1
 * 
 * 
 * @param data {object} - <Buffer 08 80 00 20 04 00 00 00> 
 * @returns {object} - states: byte 0 = in1 .. in8
 *                             byte 1 = in9 .. in16*/
ProcMsg.prototype.parseDataIuIn = function parseDataIuIn(data) {
  return {
    iuIn : {
      states : Buffer.from([
        (data[7] & 0x80)>>7 | 
        (data[7] & 0x40)>>5 | 
        (data[7] & 0x20)>>3 | 
        (data[7] & 0x10)>>1 | 
        (data[7] & 0x8 )<<1 | 
        (data[7] & 0x4 )<<3 | 
        (data[7] & 0x2 )<<5 | 
        (data[7] & 0x1 )<<7, 
        (data[6] & 0x80)>>7 | 
        (data[6] & 0x40)>>5 | 
        (data[6] & 0x20)>>3 | 
        (data[6] & 0x10)>>1,
        //0x0,0x0,0x0,0x0,0x0,0x0
        ]),
        tOn : [ // TODO
          0,0,0,0,0,0,0,0,0,0,0,0
//        ((data[1] & 0xE) >> 1                  )*0.5,
//        (((data[1] & 0x1)<<2) + (data[2] & 0xC0)>>6)*0.5,
//        ((data[2] & 0x38) >> 3                 )*0.5,
//        ((data[2] & 0x7)                       )*0.5,
//        ((data[3] & 0xE0) >> 5                 )*0.5,
//        ((data[3] & 0x1C) >> 2                 )*0.5,
//        (((data[3] & 0x3) << 1) + ((data[4] & 0x80)>>7))*0.5,
//        ((data[4] & 0x70) >> 4                 )*0.5,
//        ((data[4] & 0xE) >> 1                  )*0.5,
//        (((data[4] & 0x1)<<2) + (data[5] & 0xC0)>>6)*0.5,
//        ((data[5] & 0x38) >> 3                 )*0.5,
//        ((data[5] & 0x7)                       )*0.5
          ]
    }
  }
}

ProcMsg.prototype.registerOnMsgAliveClient = function registerOnMsgAliveClient(obj, cb) {
  if (typeof(cb) !== 'function') {
    throw new Error('invalid type of callback: ' + typeof(cb));
  }
  if (typeof(obj) !== 'object') {
    throw new Error('invalid type of object: ' + typeof(obj));
  }  
  this.onMsgClients.push({obj:obj, cb:cb});
}

ProcMsg.prototype.registerOnMsgDataClient = function registerOnMsgDataClient(obj, cb) {
  if (typeof(cb) !== 'function') {
    throw new Error('invalid type of callback: ' + typeof(cb));
  }
  if (typeof(obj) !== 'object') {
    throw new Error('invalid type of object: ' + typeof(obj));
  }  
  this.onMsgDataClients.push({obj:obj, cb:cb});
}

ProcMsg.prototype.setSendFcn = function setSendFcn(sendFcn) {
  if (typeof(sendFcn) === 'function') {
    this.sendFcn = sendFcn;
  } else {
    throw new Error('invalid type of callback: ' + typeof(sendFcn));
  }
}

/**
 * @param id {number} - can id
 * @param data {buffer} - <Buffer 00 00 00 00 d8 01 00 00> */
ProcMsg.prototype.onMsg = function onMsg(id, data) {
  var self = this;
  //log.debug('onMsg: ' + id + '. data: ' + msg);
  var idObj = this.parseId(id);
  if (idObj.code === 0) { // alive code ?
    if (idObj.rxId !== 0) { // wrong alive id ?
      return;
    }
//    log.debug('node is alive:' + idObj.txStr);
    this.onMsgClients.forEach(function (client) {
      client.cb.call(client.obj, idObj, self.parseDataAlive(data));
    });
  } else { // no alive
    log.debug('RX <= id=' + idObj.txStr + ' idRaw=' + id.toString(16)
        + ' outputs: ' + mu.buf2HexStr(data));
//    txType
    this.onMsgDataClients.forEach(function (client) {
      switch (idObj.txType) {
      case msghlp.uTypes.iu:
        client.cb.call(client.obj, idObj, self.parseDataIuIn(data));
        break;
      default:
        log.error('unknown txType: ' + idObj.txType);
      }
    });
  }
  // TODO further processing...
}

ProcMsg.prototype.sendAlive = function sendAlive() {
  if (this.aliveCnt[0] < 255) {
    this.aliveCnt[0]++;
  } else {
    this.aliveCnt[0] = 0;
  }
  var data = Buffer.concat([msghlp.msgs.aliveHeader,
    Buffer.from(this.aliveCnt),
    msghlp.msgs.aliveFooter]);
  //log.debug('send alive msg...' + this.aliveCnt[0]);
  this.sendFcn(msghlp.ids.alive, data);
}

module.exports = ProcMsg;