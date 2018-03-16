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
  /**
   * contains nodes that ever sent one alive msg to us.
   * {
   *   "10011001":{
   *     "sw": "0.1.0",
   *     "cnt": 123,
   *     "last_rx_time": 12345678, // ms since 1.1.1970
   *     "state": 1
   *   }
   * state : 0=ERR, 1=OK, 2=WARN
   */
  this.mapAlive = {};
  
  if (process.env.MYHOMECANTESTENV) {
    log.warn('TEST ENVIRONMENT ACTIVE!!!');
    this.mapAlive = {
        '10011001':{
           "sw": "0.1.0",
           "cnt": 111,
           "last_rx_time": new Date(), // ms since 1.1.1970
           "state": 1
         },
         '10011010':{
           "sw": "0.1.0",
           "cnt": 222,
           "last_rx_time": new Date(), // ms since 1.1.1970
           "state": 1
         },
         '10011011':{
           "sw": "0.1.0",
           "cnt": 123,
           "last_rx_time": new Date(), // ms since 1.1.1970
           "state": 1
         }
    };
  }
  
  this.aliveCnt = new Uint8Array(1); // handle as byte variable
  
  if (typeof(sendFcn) === 'function') {
    this.sendFcn = sendFcn;
  } else {
    throw new Error('invalid type of callback: ' + typeof(sendFcn));
  }
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
    txStr  : '0x' + (txShr & 0xFF).toString(16),
    rxType : (id >> 8) & 0x7,
    rxId   : (id >> 3) & 0x1F,
    code   : (id) & 0x7
  }
}

ProcMsg.prototype.getAliveMap = function getAliveMap() {
  return this.mapAlive;
}

/**
 * @param idStr {string} - e.g. '10000001' */
ProcMsg.prototype.updateAliveMap = function updateAliveMap(idStr, dataObj) {
  this.mapAlive[idStr] = {
      sw            : dataObj.sw,
      cnt           : dataObj.cnt,
      last_rx_time  : new Date(),
      state         : 1
  }
}

/**
 * Call cyclically */
ProcMsg.prototype.checkAliveStates = function checkAliveStates() {
  var now = Date.now();
  for(var id in this.mapAlive) {
    if (now - this.mapAlive[id].last_rx_time > conf.COMM.TIMING.ERR) {
      this.mapAlive[id].state = 0;
    } else if (now - this.mapAlive[id].last_rx_time > conf.COMM.TIMING.WARN) {
      this.mapAlive[id].state = 2;
    }
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

/**
 * @param id {number} - can id */
ProcMsg.prototype.onMsg = function onMsg(id, msg) {
  //log.debug('onMsg: ' + id + '. data: ' + msg);
  var idObj = this.parseId(id);
  if (idObj.code === 0) { // alive ?
    log.debug('node is alive:' + idObj.txStr);
    this.updateAliveMap(idObj.txStr, this.parseDataAlive(msg));
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