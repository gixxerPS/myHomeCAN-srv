/**
 * Logic module processes rules.
 */
var mu = require('./myutil.js');
var log = require('log4js').getLogger('logic');
var procImg = require('./processimage.js');
var homeconf = require('./conf.js').home;

/**
 * @constructor
 * @param sendFcn */
function LogicApp() {
  /* store assignment inputs to outputs for itemtype 'light'
   * Type = light | receptacle
   * { man_addr     : [ outputs ] }
   * { '01100001.2' : ['10000001.1', '01100001.1' } */
  this.lightMap = {};
  
  /* store neighbour outputs rm_addr for each out_addr.
   * Type = light | receptacle
   * { out_addr     : [ rm_outputs ] }
   * { '10000001.1' : [ '01100001.1', '01100001.1'] }
   */
  this.outNeighbourMap = {};
  
  /* store shutter outputs bidirectional (like a dictionary).
   * { out_up_addr : out_down_addr,
   *   out_down_addr : out_up_addr }
   * { '10000001.4' : '10000001.3',
   *   '10000001.3' : '10000001.4'} */
  this.shutterMap = {};
  
  this.createInternalMaps(homeconf);
  log.debug('lightMap:');
  log.debug(this.lightMap);
  log.debug('outNeighbourMap:');
  log.debug(this.outNeighbourMap);
}

/**
 * avoid searching for output to switch by creating maps
 * light: { '01100001.2' : ['10000001.1', '01100001.1' } */
LogicApp.prototype.createInternalMaps = function (homeconf) {
  this.lightMap = {};
  this.outNeighbourMap = {};
  for (var floor in homeconf) {
    for(var room in homeconf[floor]) {
      for(var item in homeconf[floor][room]) {
        var iObj = homeconf[floor][room][item]; 
        if (iObj.type === 'light' || iObj.type === 'receptacle') {
          var i, l = iObj.man_addr.length
          for (i = 0; i < l; i++) {
            this.lightMap[ iObj.man_addr[i] ] = 
              [iObj.out_addr].concat(iObj.rm_addr) 
          }
          this.outNeighbourMap[ iObj.out_addr ] = iObj.rm_addr
        } else if (iObj.type === 'shutter') {
          this.shutterMap[iObj.out_up_addr] = 
            {mirrorAdr: iObj.out_down_addr, kind: 'UP'};
          this.shutterMap[iObj.out_down_addr] = 
            {mirrorAdr: iObj.out_up_addr, kind: 'DOWN'};
        }
          
      }
    }
  }
}

/**
 * @param addr {string} - e.g. '10000001.1' */
LogicApp.prototype.str2IdOffs = function (addr) {
  return {
    id   : addr.substr(0, 8),
    offs : parseInt( addr.substr(9, 1) )
  }
}

/**
 * Switches configured outputs 'out_addr' and 'rm_addr' for 
 * manual operation. */
LogicApp.prototype.updateLightNeighbours = function (out_addr) {
  var i, l, adr;
  adr = this.str2IdOffs(out_addr);
  var state = procImg.getOutput(adr.id, adr.offs);
  for (i = 0, l = this.outNeighbourMap[ out_addr ].length; i < l; i++) {
    adr = this.str2IdOffs(this.outNeighbourMap[ out_addr ][i]);
    procImg.setOutput(adr.id, adr.offs, state);
  }
}

/**
 * @param out_addr {string} - e.g. '10000001.1'
 * @param state {string} - 'ON' | 'OFF' */
LogicApp.prototype.switchLight = function (out_addr, state) {
  var adr = this.str2IdOffs(out_addr);
  if (state === 'ON') {
    procImg.setOutput(adr.id, adr.offs, 1);
  } else {
    procImg.setOutput(adr.id, adr.offs, 0);
  }
  this.updateLightNeighbours(out_addr);
}

/**
 * If down is switched on, then up is automatically switched off
 * and vice versa.
 * @param out_addr {string} - e.g. '10000001.1'
 * @param state {string} - 'DOWN' | 'UP' */
LogicApp.prototype.switchShutter = function (out_addr, state) {
  var adr = this.str2IdOffs(out_addr);
  this.shutterMap[out_addr].adr
  procImg.setOutput(adr.id, adr.offs, 1);
  adr = this.str2IdOffs( this.shutterMap[out_addr].mirrorAdr );
  procImg.setOutput(adr.id, adr.offs, 0);
}

/**
 * @param idInfo {object} - parsed id data e.g.
 * { prio  
 *   txType
 *   txId
 *   txStr  
 *   rxType
 *   rxId 
 *   rxStr 
 *   code }  
 * @param uData {object} - parsed unit data e.g.
 *   su: [temp sensor 1, ..., temp] sensor 6]
 *   iu: {states:[0, ..., 12], tOn:[0, ..., 12]} */
LogicApp.prototype.onInputEvent = function (idInfo, uData) {
  var i, l, j, ll, outAdr, targetOffs, targetId;
  log.debug(this.lightMap);
  switch(idInfo.txType) {
  case 0x1: // Master
  case 0x2: // Sensor Unit
  case 0x3: // Power Unit
  case 0x4: // Interface Unit
    ll = uData.states.length;
    for (j = 0; j < ll; j++) { // for all inputs
      if( uData.states[j] !== 1 ) {
        continue; // consider only pressed buttons
      }
      for (var key in this.lightMap) { // find connected lights
        // switch corresponding outputs
        if(key.substr(0, 8) === idInfo.txStr) {
          // txId matches
          l = this.lightMap[key].length;
          //mu.po(this.lightMap[key]);
          for (i = 0; i < l; i++) {
            outAdr = this.lightMap[key][i];
            targetId = outAdr.substr(0, 8);
            targetOffs = parseInt( outAdr.substr(9, 1) );
            // toggle output
            if ( procImg.getOutput(targetId, targetOffs) ) {
              procImg.setOutput(targetId, targetOffs, 0);
            } else {
              procImg.setOutput(targetId, targetOffs, 1);
            }
          } 
        }
      }
    }
  default:
    return;
  }
}

module.exports = LogicApp;