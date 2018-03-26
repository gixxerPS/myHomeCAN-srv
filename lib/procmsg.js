/**
 * Process incoming and outgoing messages.
 * Keeps track of alive state of all nodes in mapAlive.
 */
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
function ProcMsg(sendFcn) {
  this.aliveCnt = new Uint8Array(1); // handle as byte variable
  if (typeof(sendFcn) === 'function') {
    this.sendFcn = sendFcn;
  } else {
    throw new Error('invalid type of callback: ' + typeof(sendFcn));
  }
  this.onMsgClients = [];
}

/**
 * Function to send process image data via can.
 * @param data {object} - {rxid:rxid, outArr:Buffer[0x0,0x0,0x0,0x0,0x0,0x0,0x0,0x1} */
ProcMsg.prototype.send = function send(data) {
  if (data.out.length !== 8) {
    log.warn('sending unarranged num of bytes: ' + data.out.length);
  }
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
  return {
    sw  : data[7].toString() + '.' + data[6].toString() + '.' + data[5].toString(),//data.slice(5,8).join('.'),
    cnt : data[4]
  }
}

/**
 * @param data {object} - <Buffer 4e fb 80 cd 82 8e 00> */
ProcMsg.prototype.parseDataSu = function parseDataSu(data) {
  return [
    ((data.readInt16BE(0) >> 6) & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain,
    (data[0] & 0x3FF - tempOffs)*tempGain
    ]
}

/**
 * @param data {object} - <Buffer 08 80 00 20 04 00 00 00> */
ProcMsg.prototype.parseDataIu = function parseDataIu(data) {
  return {
    states : [
      (data[0] & 0x80) > 0,
      (data[0] & 0x40) > 0,
      (data[0] & 0x20) > 0,
      (data[0] & 0x10) > 0,
      (data[0] & 0x8 ) > 0,
      (data[0] & 0x4 ) > 0,
      (data[0] & 0x2 ) > 0,
      (data[0] & 0x1 ) > 0,
      (data[1] & 0x80) > 0,
      (data[1] & 0x40) > 0,
      (data[1] & 0x20) > 0,
      (data[1] & 0x10) > 0
    ],
    tOn : [
      ((data[1] & 0xE) >> 1                  )*0.5,
      (((data[1] & 0x1)<<2) + (data[2] & 0xC0)>>6)*0.5,
      ((data[2] & 0x38) >> 3                 )*0.5,
      ((data[2] & 0x7)                       )*0.5,
      ((data[3] & 0xE0) >> 5                 )*0.5,
      ((data[3] & 0x1C) >> 2                 )*0.5,
      (((data[3] & 0x3) << 1) + ((data[4] & 0x80)>>7))*0.5,
      ((data[4] & 0x70) >> 4                 )*0.5,
      ((data[4] & 0xE) >> 1                  )*0.5,
      (((data[4] & 0x1)<<2) + (data[5] & 0xC0)>>6)*0.5,
      ((data[5] & 0x38) >> 3                 )*0.5,
      ((data[5] & 0x7)                       )*0.5
    ]
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

/**
 * @param id {number} - can id */
ProcMsg.prototype.onMsg = function onMsg(id, msg) {
  var self = this;
  //log.debug('onMsg: ' + id + '. data: ' + msg);
  var idObj = this.parseId(id);
  if (idObj.code === 0) { // alive ?
//    log.debug('node is alive:' + idObj.txStr);
//    this.updateAliveMap(idObj.txStr, this.parseDataAlive(msg));
    this.onMsgClients.forEach(function (client) {
      client.cb.call(client.obj, idObj, self.parseDataAlive(msg));
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