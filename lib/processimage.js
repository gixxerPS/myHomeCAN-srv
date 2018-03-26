/**
 * Process incoming and outgoing messages.
 */
var util = require('util');
require('sprintf.js');

var mu = require('./myutil.js');
var msghlp = require('./msghlp.js');
var conf = require('../config/appconfig.json');

var NUM_STATIC_OUT = 64;
/**
 * remember output states for all nodes (max = 64).
 * nodes are registered dynamically via registerUnit.
 * Can be optimized because max num of outputs today are 16 and max num
 * inputs is 12. 
 * {
 *   '61.1' : {
 *      out : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0], // = [out0, ... , out63]
 *      in  : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0] 
 *   },
 *   '62.1' : {
 *      out : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0], // = [out0, ... , out63]
 *      in  : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0] 
 *   }
 *  }*/
staticMapIo = {};

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
staticMapAlive = {};

if (process.env.MYHOMECANTESTENV) {
  //log.warn('TEST ENVIRONMENT ACTIVE!!!');
  staticMapAlive = {
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

/**
 * @param idObj {string} - parsed id obj {txType, txStr '61'}
 * @returns {error} - or null if successfully registered */
var registerUnit = function registerUnit(idObj) {
  if (Object.keys(staticMapIo).length > NUM_STATIC_OUT) {
    return new Error('max num units registered');
  }
  var key = idObj.txStr + '.1';
  if (staticMapIo[key]) { // registering twice is ok
    return null;
  }
  staticMapIo[key] = {};
  switch (idObj.txType) {
  case msghlp.uTypes.iu:
    staticMapIo[key].in = Buffer.alloc(8);
    staticMapIo[key].out = Buffer.alloc(8);
    return null;
  case msghlp.uTypes.pu:
    staticMapIo[key].out = Buffer.alloc(8);
    return null;
  default:
    return new Error('unknown uType: ' + idObj.txStr);
  }
}

var convertOffs = function convertOffs(offs) {
  var sub = offs/8; // e.g. 1.125
  var subInt = parseInt(sub); // e.g. 1
  return {
    idx: 7 - subInt, // e.g. 6
    mask: 0x80 >> (sub - subInt)*8 // e.g. 0x40
  }
}

/**
 * @param idStr {string} - e.g. '0x92' */
updateAliveMap = function updateAliveMap(idStr, dataObj) {
  staticMapAlive[idStr] = {
      sw            : dataObj.sw,
      cnt           : dataObj.cnt,
      last_rx_time  : new Date(),
      state         : 1,
      type          : null
  }
}

/**
 * Call cyclically */
checkAliveStates = function checkAliveStates() {
  var now = Date.now();
  for(var id in staticMapAlive) {
    if (now - staticMapAlive[id].last_rx_time > conf.COMM.TIMING.ERR) {
      staticMapAlive[id].state = 0;
    } else if (now - staticMapAlive[id].last_rx_time > conf.COMM.TIMING.WARN) {
      staticMapAlive[id].state = 2;
    }
  }
}

/**
 * Function to send output states to decentral periphery */
var sendIoFcn;
var sendIoObj;

module.exports = {
    setSendIoFcn : function setSendIoFcn(cb, obj) {
      if (typeof(cb) !== 'function') {
        throw new Error('invalid type of callback: ' + typeof(cb));
      }
      if (typeof(obj) !== 'object') {
        throw new Error('invalid type of object: ' + typeof(obj));
      }
      sendIoFcn = cb;
      sendIoObj = obj;
    },
    /**
     * Only test utility */
    getIoMap : function getIoMap() {
      return staticMapIo;
    },
    getAliveMap : function getAliveMap() {
      return staticMapAlive;
    },
    /**
     * Only test utility */
    clearIoMap : function clearIoMap() {
      staticMapIo = {};
    },
    /**
     * Outputs start at msb byte 7.
     * @param offs {number} - zero based offset. pu:0..15; iu:0..11 */
    convertOffs : convertOffs,
    /**
     * @param rxid {string} - unique receiver id + code
     * @param offs {number} - zero based offset. pu:0..15; iu:0..11
     * @param state {number} - 1, 0 */
    setOutput : function setOutput(rxid, offs, state) {
      if (!staticMapIo[rxid]) {
        // TODO wait for one alive cycle until all nodes are registered!
//        if (registerOutUnit(rxid)) {
//          // TODO error occurred...
//        }
        console.error('unknown unit');
      }
      var convIdx = convertOffs(offs);
      // switch on?
      if (state) {
        staticMapIo[rxid].out[convIdx.idx] |= (convIdx.mask);
      } else { // switch off
        staticMapIo[rxid].out[convIdx.idx] &= ~(convIdx.mask);
      }
      //mu.cl('set output: ' + rxid + '.' + offs + ' new state = ' + state)
      //mu.cl('new map = ' + util.inspect(staticMapIo, {depth:null}));
      if (sendIoFcn) {
        sendIoFcn.call(sendIoObj, {rxid:rxid, out:staticMapIo[rxid].out});
      }
      return staticMapIo[rxid].out;
    },
    /**
     * @param rxid {string} - unique receiver id
     * @param offs {number} - zero based offset 
     * @returns {number} - 1, 0 */
    getOutput : function getOutput(rxid, offs) {
      if (!staticMapIo[rxid]) {
          return null;
      }
      return staticMapIo[rxid].out[offs];
    },
    registerUnit : registerUnit,
    /**
     * Only test utility */
    updateAliveMap : updateAliveMap,
    onMsgAlive : function onMsg(idObj, aliveData) {
      if(!registerUnit(idObj)) {
        updateAliveMap(idObj.txStr, aliveData);
      } else { // error...
        console.error('registering failed...');
      }
    },
    checkAliveStates : checkAliveStates
}



