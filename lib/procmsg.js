/**
 * Process incoming and outgoing messages.
 */
var util = require('util');
require('sprintf.js');

var mu = require('./myutil.js');
var msghlp = require('./msghlp.js');
var log = require('log4js').getLogger('can');
/**
 * see CAN Konzept myHomeCan.docx */
var tempOffs = 384;
var tempGain = 80/1024;

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
   */
  this.mapAlive = {};
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
ProcMsg.prototype.parseId = function (id) {
  var bin = parseInt(id, 2);
  //mu.cl((bin >> 19).toString(2));
  return {
    prio   : parseInt((bin >> 19) & 0xF, 16),
    txType : parseInt((bin >> 16) & 0x7, 16),
    txId   : parseInt((bin >> 11) & 0x1F, 16),
    txStr  : id.substr(4, 8),
    rxType : parseInt((bin >> 8) & 0x7, 16),
    rxId   : parseInt((bin >> 3) & 0x1F, 16),
    rxStr  : id.substr(12, 8),
    code   : parseInt((bin) & 0x7, 16)
  }
}

ProcMsg.prototype.parseAlive = function (msg) {
  var bin = parseInt(id, 2);
  //mu.cl((bin >> 19).toString(2));
  return {
    prio   : parseInt((bin >> 19) & 0xF, 16),
    txType : parseInt((bin >> 16) & 0x7, 16),
    txId   : parseInt((bin >> 11) & 0x1F, 16),
    rxType : parseInt((bin >> 8) & 0x7, 16),
    rxId   : parseInt((bin >> 3) & 0x1F, 16),
    code   : parseInt((bin) & 0x7, 16)
  }
}

/**
 * TODO: this is probably not necessary
 * @param msg {string} - incoming msg */
ProcMsg.prototype.seperateMsg = function (msg) {
  return {
    id    : msg.substr(0, 29),
    data  : msg.substr(29)
  }
}

/**
 * only export for testing */
ProcMsg.prototype.getAliveMap = function () {
  return this.mapAlive;
}

ProcMsg.prototype.updateAliveMap = function (idStr, dataObj, cb) {
  this.mapAlive[idStr] = {
      sw            : dataObj.sw,
      cnt           : dataObj.cnt,
      last_rx_time  : new Date(),
      state         : 1
  }
  cb();
}

ProcMsg.prototype.parseDataAlive = function (dataStr) {
  var high = parseInt(dataStr.substr(0, 7), 2);
  var middle = parseInt(dataStr.substr(8, 8), 2);
  var low = parseInt(dataStr.substr(16, 8), 2);
  return {
    sw  : high.toString() + '.' + middle.toString() + '.' + low.toString(),
    cnt : parseInt(dataStr.substr(24, 8), 2)
  }
}

ProcMsg.prototype.parseDataSu = function (dataStr) {
  return [
    (parseInt(dataStr.substr( 0, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(10, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(20, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(30, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(40, 10), 2) - tempOffs)*tempGain,
    (parseInt(dataStr.substr(50, 10), 2) - tempOffs)*tempGain
    ]
}

ProcMsg.prototype.parseDataIu = function (dataStr) {
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

ProcMsg.prototype.onMsg = function (id, msg) {

}

ProcMsg.prototype.sendAlive = function () {
  log.debug('send alive msg...');
  this.sendFcn(msghlp.ids.alive, 
      msghlp.msgs.aliveHeader + sprintf('%08b', ++this.aliveCnt[0] )
      + msghlp.msgs.aliveFooter);
}

module.exports = ProcMsg;