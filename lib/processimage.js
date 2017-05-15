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
 *      out : [out0, ... , out63] 
 *   },
 *   '002' : {
 *      out : [out0, ... , out63] 
 *   }
 *  }*/
staticOutMap = {};

/**
 * @param rxid {string} - unique receiver id
 * @returns {error} - or null if successfully registered */
registerOutUnit = function (rxid) {
  if (Object.keys(staticOutMap).length > NUM_STATIC_OUT) {
    return new Error('max num output units registered');
  }
  if (staticOutMap[rxid]) { // registering twice is ok
    return null;
  }
  staticOutMap[rxid] = {
      out   : new Array(64).fill(0)
  };
  return null;
}

module.exports = {
    /**
     * Only test utility */
    getOutMap : function () {
      return staticOutMap;
    },
    /**
     * Only test utility */
    clearOutMap : function () {
      staticOutMap = {};
    },
    /**
     * @param rxid {string} - unique receiver id
     * @param offs {number} - zero based offset
     * @param state {number} - 1, 0 */
    setOutput : function (rxid, offs, state) {
      if (!staticOutMap[rxid]) {
        if (registerOutUnit(rxid)) {
          // TODO error occurred...
        }
      }
      staticOutMap[rxid].out[offs] = state;
      return staticOutMap[rxid].out;
    },
    /**
     * @param rxid {string} - unique receiver id
     * @param offs {number} - zero based offset 
     * @returns {number} - 1, 0 */
    getOutput : function (rxid, offs) {
      if (!staticOutMap[rxid]) {
          return null;
      }
      return staticOutMap[rxid].out[offs];
    },
    registerOutUnit : registerOutUnit
}



