/**
 * Logic module processes rules.
 */
var mu = require('./myutil.js');
var log = require('log4js').getLogger('logic');
var ProcImg = require('./processimage.js');
var homeconf = require('./conf.js').home;
var msghlp = require('./msghlp.js');

/**
 * Time [ms] to wait before up/down-outputs are switched off. */
var SHUTTERTIME = 30000;
if (process.env.MYHOMECANTESTENV) {
  SHUTTERTIME = 30;
} 

/**
 * @constructor
 * @param sendFcn */
function LogicApp(createMaps) {
  /* store assignment inputs to outputs for itemtype 'light'
   * Type = light | receptacle
   * { man : {on_addr:[ outputs ], off_addr: [ outputs ]} }
   * { '81.1.2' : ['71.1.3', '91.1.4' } */
  this.lightMap = {};
  
  /* store assignment inputs to outputs for item
   * Type = light | receptacle
   * { input : {on_addr:[ outputs ], off_addr: [ outputs ], timed_addr: [ outputs ] } }
   * { '71.1.2' : {on_addr:['71.1.1', '71.1.3'], off_addr:[], timed_addr:[] } */
  //this.inputMap = {};
  
  /* store neighbour outputs rm_addr for each out_addr.
   * Type = light | receptacle
   * { out_addr     : [ rm_outputs ] }
   * { '10000001.1' : [ '01100001.1', '01100001.1'] }
   */
  this.outNeighbourMap = {};
  
  /* store shutter outputs bidirectional (like a dictionary).
   * { out_up_addr : out_down_addr,
   *   out_down_addr : out_up_addr }
   * { '81.4' : '81.3',
   *   '81.3' : '81.4'} */
  this.shutterMap = {};
  
  if (createMaps) {
    this.createInternalMaps(homeconf);
  }
}

/**
 * avoid searching for output to switch by creating maps
 * light: { '61.2' : ['81.1', '61.2' } */
LogicApp.prototype.createInternalMaps = function (homeconf) {
  this.lightMap = {};
  this.outNeighbourMap = {};
  for (var floor in homeconf) {
    for(var room in homeconf[floor]) {
      for(var item in homeconf[floor][room]) {
        var iObj = homeconf[floor][room][item]; 
        if (iObj.type === 'light' || iObj.type === 'receptacle') {
          var i, l = iObj.on_addr.man.length
          for (i = 0; i < l; i++) {
            this.lightMap[ iObj.on_addr.man[i] ] = 
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
 * Switches configured outputs 'out_addr' and 'rm_addr' for 
 * manual operation. */
LogicApp.prototype.updateLightNeighbours = function updateLightNeighbours(out_addr) {
  var i, l, adr;
  adr = msghlp.str2IdOffs(out_addr);
  var state = ProcImg.getOutput(adr.id, adr.offs);
  for (i = 0, l = this.outNeighbourMap[ out_addr ].length; i < l; i++) {
    adr = msghlp.str2IdOffs(this.outNeighbourMap[ out_addr ][i]);
    ProcImg.setOutput(adr.id, adr.offs, state);
  }
}

/**
 * @param out_addr {string} - e.g. '81.1.1'
 * @param state {string} - 'ON' | 'OFF' */
LogicApp.prototype.switchLight = function switchLight(out_addr, state) {
  var adr = msghlp.str2IdOffs(out_addr);
  if (state === 'ON') {
    ProcImg.setOutput(adr.id, adr.offs, 1);
  } else {
    ProcImg.setOutput(adr.id, adr.offs, 0);
  }
  //TODO this.updateLightNeighbours(out_addr);
}

/**
 * If down is switched on, then up is automatically switched off
 * and vice versa.
 * @param out_addr {string} - e.g. '81.1'
 * @param state {string} - 'DOWN' | 'UP' | 'STOP' */
LogicApp.prototype.switchShutter = function switchShutter(out_addr, state) {
  var adr = msghlp.str2IdOffs(out_addr);
  var mirrAdrStr = this.shutterMap[out_addr].mirrorAdr;
  //clear old timeouts if necessary
  if (this.shutterMap[out_addr].timeoutId) {
    clearTimeout(this.shutterMap[out_addr].timeoutId);
    this.shutterMap[out_addr].timeoutId = null;
  }
  if (this.shutterMap[mirrAdrStr].timeoutId) {
    clearTimeout(this.shutterMap[mirrAdrStr].timeoutId);
    this.shutterMap[mirrAdrStr].timeoutId = null;
  }
  
  //this.shutterMap[out_addr].adr;
  if (state === 'STOP') {
    ProcImg.setOutput(adr.id, adr.offs, 0);
    adr = msghlp.str2IdOffs( this.shutterMap[out_addr].mirrorAdr );
    ProcImg.setOutput(adr.id, adr.offs, 0);
    return;
  } 
  // 'UP' / 'DOWN'
  
  var mirradr = msghlp.str2IdOffs( mirrAdrStr );
  ProcImg.setOutput(mirradr.id, mirradr.offs, 0);
  ProcImg.setOutput(adr.id, adr.offs, 1);
  
  
  this.shutterMap[out_addr].timeoutId = setTimeout(function () {
    log.debug('timeout shutter: ' + adr.id + '.' + adr.offs 
        + ' and ' + mirradr.id + '.' + mirradr.offs)
    ProcImg.setOutput(mirradr.id, mirradr.offs, 0);
    ProcImg.setOutput(adr.id, adr.offs, 0);
  }, SHUTTERTIME);
}

/**
 * @param out_addr {string} - e.g. '81.1'
 * @param state {string} - 'ON' | 'OFF' */
LogicApp.prototype.switchReceptacle = function switchReceptacle(out_addr, state) {
  var adr = msghlp.str2IdOffs(out_addr);
  if (state === 'ON') {
    ProcImg.setOutput(adr.id, adr.offs, 1);
  } else {
    ProcImg.setOutput(adr.id, adr.offs, 0);
  }
}

/**
 * @param idObj {object} - parsed id data e.g.
 * { prio  
 *   txType
 *   txId
 *   txStr  
 *   rxType
 *   rxId 
 *   rxStr 
 *   code }  
 * @param uData {object} - parsed unit data e.g.
 *   su: [temp sensor 1, ..., temp sensor 6]
 *   iu: { iuIn : {
 *     states : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
 *     oldStates : [0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
 *     tOn : [...] } */
LogicApp.prototype.onInputEvent = function onInputEvent(idObj, uData) {
  var i, l, j, ll, outAdr, targetAdr;
  var inbyte;
  switch(idObj.txType) {
  case 0x1: // Master
  case 0x2: // Sensor Unit
  case 0x3: // Power Unit
  case 0x4: // Interface Unit
    ll = uData.iuIn.states.length;
    for (j = 0; j < ll; j++) { // for all input bytes
      inbyte = uData.iuIn.states[j];
      for (i = 0; i < 8; i++) { // for all bits
        // input high ?
        if (inbyte & (1<<i)) {
          for (var key in this.lightMap) { // find connected lights
            // switch corresponding outputs
            if(key === idObj.txStr + '.' + (i+1).toString() ) {
              // txId matches
              l = this.lightMap[key].length;
              //mu.po(this.lightMap[key]);
              for (i = 0; i < l; i++) {
                outAdr = this.lightMap[key][i];
                targetAdr = msghlp.str2IdOffs(outAdr);
                // toggle output
                if ( ProcImg.getOutput(targetAdr.id, targetAdr.offs) ) {
                  ProcImg.setOutput(targetAdr.id, targetAdr.offs, 0);
                } else {
                  ProcImg.setOutput(targetAdr.id, targetAdr.offs, 1);
                }
              } 
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