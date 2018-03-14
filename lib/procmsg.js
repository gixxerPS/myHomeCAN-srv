/**
 * Process incoming and outgoing messages.
 * Keeps track of alive state of all nodes in mapAlive.
 */
var util = require('util');
require('sprintf.js');

var mu = require('./myutil.js');
var msghlp = require('./msghlp.js');
var log = require('log4js').getLogger('can');
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
 * @param data {object} - {t:'bin', rxid:rxid, outArr:[0,...,63]} */
ProcMsg.prototype.send = function (data) {
  if (data.outArr.length !== 64) {
    log.warn('sending unarranged num of bytes: ' + data.outArr.length/8);
  }
  var outStream = data.outArr.join(''); // should always be 8 byte long
  this.sendFcn(msghlp.header + msghlp.defaultPrio + msghlp.ids.myTxTypeId + data.rxid.replace('.', ''), outStream);
}

/**
 * @param id {string} - incoming id string */
ProcMsg.prototype.parseId = function parseId(id) {
  var bin = parseInt(id, 2);
  //mu.cl((bin >> 19).toString(2));
  return {
    prio   : parseInt((bin >> 19) & 0xF, 16),
    txType : parseInt((bin >> 16) & 0x7, 16),
    txId   : parseInt((bin >> 11) & 0x1F, 16),
    txStr  : id.substr(4+lHeader, 8),
    rxType : parseInt((bin >> 8) & 0x7, 16),
    rxId   : parseInt((bin >> 3) & 0x1F, 16),
    rxStr  : id.substr(12+lHeader, 8),
    code   : parseInt((bin) & 0x7, 16)
  }
}

/**
 * TODO: this is probably not necessary
 * @param msg {string} - incoming msg */
ProcMsg.prototype.seperateMsg = function seperateMsg(msg) {
  return {
    id    : msg.substr(0, 29),
    data  : msg.substr(29)
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

ProcMsg.prototype.parseDataAlive = function parseDataAlive(dataStr) {
  var high = parseInt(dataStr.substr(0, 7), 2);
  var middle = parseInt(dataStr.substr(8, 8), 2);
  var low = parseInt(dataStr.substr(16, 8), 2);
  return {
    sw  : high.toString() + '.' + middle.toString() + '.' + low.toString(),
    cnt : parseInt(dataStr.substr(24, 8), 2)
  }
}

ProcMsg.prototype.parseDataSu = function parseDataSu(dataStr) {
  return [
    (parseInt(dataStr.substr( 0, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(10, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(20, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(30, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(40, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(50, 10), 2) - tempOffs)*tempGain
    ]
}

ProcMsg.prototype.parseDataIu = function parseDataIu(dataStr) {
  var stateStr = dataStr.substr(0, 12);
  return {
    states : [
      parseInt(stateStr[0], 2),
      parseInt(stateStr[1], 2),
      parseInt(stateStr[2], 2),
      parseInt(stateStr[3], 2),
      parseInt(stateStr[4], 2),
      parseInt(stateStr[5], 2),
      parseInt(stateStr[6], 2),
      parseInt(stateStr[7], 2),
      parseInt(stateStr[8], 2),
      parseInt(stateStr[9], 2),
      parseInt(stateStr[10], 2),
      parseInt(stateStr[11], 2)
      ],
      tOn : [
        parseInt(dataStr.substr(12, 3), 2)*0.5,
        parseInt(dataStr.substr(15, 3), 2)*0.5,
        parseInt(dataStr.substr(18, 3), 2)*0.5,
        parseInt(dataStr.substr(21, 3), 2)*0.5,
        parseInt(dataStr.substr(24, 3), 2)*0.5,
        parseInt(dataStr.substr(27, 3), 2)*0.5,
        parseInt(dataStr.substr(30, 3), 2)*0.5,
        parseInt(dataStr.substr(33, 3), 2)*0.5,
        parseInt(dataStr.substr(36, 3), 2)*0.5,
        parseInt(dataStr.substr(39, 3), 2)*0.5,
        parseInt(dataStr.substr(42, 3), 2)*0.5,
        parseInt(dataStr.substr(45, 3), 2)*0.5
        ]
  }
}

ProcMsg.prototype.onMsg = function onMsg(id, msg) {
  log.debug('onMsg: ' + id + '. data: ' + msg);
  var idObj = this.parseId(id);
  if (idObj.code === 0) { // alive ?
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
  var msg = msghlp.msgs.aliveHeader + sprintf('%08b', this.aliveCnt[0] )
  + msghlp.msgs.aliveFooter;
  //log.debug('send alive msg...' + this.aliveCnt[0]);
  this.sendFcn(msghlp.ids.alive, msg);
}

module.exports = ProcMsg;