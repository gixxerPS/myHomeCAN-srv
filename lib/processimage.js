/**
 * Process incoming and outgoing messages.
 */
'use strict';
var util = require('util');
require('sprintf.js');

var mu = require('./myutil.js');
var msghlp = require('./msghlp.js');
var conf = require('../config/appconfig.json');

var NUM_STATIC_OUT = 64;
/**
 * remember input old input (for edge evaluation) and output states 
 * for all nodes (max = 64).
 * nodes are registered dynamically via registerUnit.
 * Can be optimized because max num of outputs today are 16 and max num
 * inputs is 12. But this would slow down a quick calculation of a transmit frame.
 * Nodes expect 
 * output 1 to be at position byte 7 bit 7 and
 * output 16 to be at position byte 6 bit 0.
 * They are stored in that order to be able to quickly generate a complete transmit frame.
 * However inputs are stored in normal order i.e. input 1 at byte 0 bit 0
 * and input 16 at byte 1 bit 8.
 * {
 *   '61' : {
 *      out : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0], // = [out63, ... , out0]
 *      in  : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
 *      inOld: [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0] 
 *   },
 *   '62' : {
 *      out : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0], // = [out63, ... , out0]
 *      in  : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
 *      inOld: [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0] 
 *   }
 *  }*/
var staticMapIo = {};

/**
 * contains nodes that ever sent one alive msg to us.
 * {
 *   '92':{
 *     "sw": "0.1.0",
 *     "cnt": 123,
 *     "last_rx_time": 12345678, // ms since 1.1.1970
 *     "state": 1
 *   }
 * state : 0=ERR, 1=OK, 2=WARN
 */
var staticMapAlive = {};

/**
 * @param idObj {object} - parsed id obj {txType, txStr '61'}
 * @returns {error} - or null if successfully registered */
var registerUnit = function registerUnit(idObj) {
  if (Object.keys(staticMapIo).length > NUM_STATIC_OUT) {
    return new Error('max num units registered');
  }
  var key;
  switch (idObj.txType) {
  case msghlp.uTypes.iu:
    key = idObj.txStr;
    if (staticMapIo[key]) { // registering twice is ok
      return null;
    }
    staticMapIo[key] = {};
    staticMapIo[key].out = Buffer.alloc(8);
    staticMapIo[key].in = Buffer.alloc(8);
    staticMapIo[key].inOld = Buffer.alloc(8);
    return null;
  case msghlp.uTypes.pu:
    key = idObj.txStr;
    if (staticMapIo[key]) { // registering twice is ok
      return null;
    }
    staticMapIo[key] = {};
    staticMapIo[key].out = Buffer.alloc(8);
    return null;
  case msghlp.uTypes.master:
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
var updateAliveMap = function updateAliveMap(idObj, dataObj) {
  staticMapAlive[idObj.txStr] = {
      sw            : dataObj.sw,
      cnt           : dataObj.cnt,
      last_rx_time  : new Date(),
      state         : 1,
      type          : idObj.txType
  }
}

/**
 * Call cyclically */
var checkAliveStates = function checkAliveStates() {
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
 * @param rxid {string} - '92.1' OR '92'
 */
var getIoMapKeyFromRxId = function getIoMapKeyFromRxId(rxid) {
  var rxparts = rxid.split('.');
  var key;
  if (rxparts.length > 1) {
    key = rxparts[0];
  } else { // rxid already == key ?
    key = rxid;
  }
  return key;
} 

/**
 * Function to send output states to decentral periphery */
var sendIoFcn;
var sendIoObj;
var onInputEventClients = [];

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
    registerOnInputEventClient : function registerOnInputEventClient(obj, cb) {
      onInputEventClients.push({obj:obj, cb:cb});
    },
    /**
     * Only test utility */
    getIoMap : function getIoMap() {
      return staticMapIo;
    },
    /**
     * Only test utility */
    clearIoMap : function clearIoMap() {
      staticMapIo = {};
    },
    getAliveMap : function getAliveMap() {
      return staticMapAlive;
    },
    /**
     * Only test utility */
    clearAliveMap : function clearAliveMap() {
      staticMapAlive = {};
    },
    /**
     * Outputs start at msb byte 7 and are ordered reverse
     * @param offs {number} - zero based offset. pu:0..15; iu:0..11 */
    convertOffs : convertOffs,
    /**
     * @param rxid {string} - unique receiver id + code optional; e.g. '92.1' OR '92'
     * @param offs {number} - zero based offset. pu:0..15; iu:0..11
     * @param state {number} - 1, 0 */
    setOutput : function setOutput(rxid, offs, state) {
      var key = getIoMapKeyFromRxId(rxid);
      if (!staticMapIo[key]) {
        // TODO wait for one alive cycle until all nodes are registered!
//        if (registerOutUnit(rxid)) {
//          // TODO error occurred...
//        }
        return console.error('unknown unit: ' + rxid);
      }
      var convIdx = convertOffs(offs);
      // switch on?
      if (state) {
        staticMapIo[key].out[convIdx.idx] |= (convIdx.mask);
      } else { // switch off
        staticMapIo[key].out[convIdx.idx] &= ~(convIdx.mask);
      }
      //mu.cl('set output: ' + rxid + '.' + offs + ' new state = ' + state)
      //mu.cl('new map = ' + util.inspect(staticMapIo, {depth:null}));
      if (sendIoFcn) {
        sendIoFcn.call(sendIoObj, {rxid:rxid, out:staticMapIo[key].out});
      }
      return staticMapIo[key].out;
    },
    /**
     * @param rxid {string} - unique receiver id
     * @param offs {number} - zero based offset 
     * @returns {number} - 1, 0 */
    getOutput : function getOutput(rxid, offs) {
      var key = getIoMapKeyFromRxId(rxid);
      if (!staticMapIo[key]) {
          return null;
      }
      var convIdx = convertOffs(offs);
      if (staticMapIo[key].out[convIdx.idx] & convIdx.mask) {
        return 1;
      } else {
        return 0;
      }
    },
    /**
     * @param rxid {string} - unique receiver id
     * @param offs {number} - zero based offset 
     * @returns {number} - 1, 0 */
    getInput : function getInput(rxid, offs) {
      
    },
    registerUnit : registerUnit,
    /**
     * Only test utility */
    updateAliveMap : updateAliveMap,
    onMsgAlive : function onMsgAlive(idObj, aliveData) {
      if(!registerUnit(idObj)) {
        updateAliveMap(idObj, aliveData);
      } else { // error...
        console.error('registering failed...' + util.inspect(idObj));
      }
    },
    /**
     * update io map on incoming data msgs */
    onMsgData : function onMsgData(idObj, data) {
//      mu.cl('id: ' + idObj.txStr + '.' + idObj.code.toString() + ':' + data.iuIn.states.toString())
//      mu.cl('[0]=' + data.iuIn.states[0] + ' [1]=' + data.iuIn.states[1])
      if (!idObj.code) {
        return;
      }
      var key = idObj.txStr;
      var unit = staticMapIo[key];
      if (!staticMapIo[key]) {
        // TODO wait for one alive cycle until all nodes are registered!
//        if (registerOutUnit(rxid)) {
//          // TODO error occurred...
//        }
        return console.error('unknown unit: ' + key);
      }
      switch (idObj.txType) {
        case msghlp.uTypes.iu:
          // update inputs if necessary
          if (data.iuIn) {
            var l = data.iuIn.states.length;
            var i = 0;
            var changed = Buffer.from(data.iuIn.states);
            var signalChanged;
            for (i = 0; i < l; i++) {
              changed[i] = staticMapIo[key].in[i] ^ data.iuIn.states[i];
              if (changed[i] > 0) {
                signalChanged = true;
              }
            }
            if (signalChanged) {
              data.iuIn.changed = changed; // give changed bits also to client
              onInputEventClients.forEach(function (client) {
                // maybe prepare data for clients better...
                client.cb.call(client.obj, idObj, data);
              });
            }
            // COPY data to actual inputs
            staticMapIo[key].inOld = Buffer.from(staticMapIo[key].in);
            // COPY data to actual inputs
            staticMapIo[key].in = Buffer.from(data.iuIn.states);
          }
          // update outputs if necessary
          if (data.iuOut) {
            staticMapIo[key].out = data.iuOut.states;
          }
          break;
        case msghlp.uTypes.pu:
          // update outputs if necessary
          if (data.puOut) {
            staticMapIo[key].out = data.puOut.states;
          }
          break;
        default:
          break;
      }
    },
    checkAliveStates : checkAliveStates
}



