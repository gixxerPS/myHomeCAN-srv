/**
 * Process incoming and outgoing messages.
 */
var util = require('util');
require('sprintf.js');

var mu = require('./myutil.js');
var msghlp = require('./msghlp.js');

var NUM_STATIC_OUT = 64;
/**
 * remember output states for all nodes (max = 64).
 * output nodes are registered dynamically via registerOutUnit. 
 * {
 *   '001' : {
 *      out : '0101010....010101' // = [out0, ... , out63] 
 *   },
 *   '002' : {
 *      out : '0101010....010101' // = [out0, ... , out63] 
 *   }
 *  }*/
staticOutMap = {};

/**
 * @param rxid {string} - unique receiver id
 * @returns {error} - or null if successfully registered */
var registerOutUnit = function registerOutUnit(rxid) {
  if (Object.keys(staticOutMap).length > NUM_STATIC_OUT) {
    return new Error('max num output units registered');
  }
  if (staticOutMap[rxid]) { // registering twice is ok
    return null;
  }
  staticOutMap[rxid] = {
      out   : Buffer.alloc(8)
  };
  return null;
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
    getOutMap : function getOutMap() {
      return staticOutMap;
    },
    /**
     * Only test utility */
    clearOutMap : function clearOutMap() {
      staticOutMap = {};
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
      if (!staticOutMap[rxid]) {
        if (registerOutUnit(rxid)) {
          // TODO error occurred...
        }
      }
      var convIdx = convertOffs(offs);
      // switch on?
      if (state) {
        staticOutMap[rxid].out[convIdx.idx] |= (convIdx.mask);
      } else { // switch off
        staticOutMap[rxid].out[convIdx.idx] &= ~(convIdx.mask);
      }
      //mu.cl('set output: ' + rxid + '.' + offs + ' new state = ' + state)
      if (sendIoFcn) {
        sendIoFcn.call(sendIoObj, {rxid:rxid, out:staticOutMap[rxid].out});
      }
      return staticOutMap[rxid].out;
    },
    /**
     * @param rxid {string} - unique receiver id
     * @param offs {number} - zero based offset 
     * @returns {number} - 1, 0 */
    getOutput : function getOutput(rxid, offs) {
      if (!staticOutMap[rxid]) {
          return null;
      }
      return staticOutMap[rxid].out[offs];
    },
    registerOutUnit : registerOutUnit
}



