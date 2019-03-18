/**
 * Logic module processes rules.
 */
'use strict';
var mu = require('./myutil.js');
var util = require('util');
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
 * Time [ms] to delay between switching multiple shutters. */
var SHUTTERDELAY = 400;
if (process.env.MYHOMECANTESTENV) {
  SHUTTERDELAY = 30;
} 
/**
 * @constructor
 * @param sendFcn */
function LogicApp(createMaps) {
  /* store assignment inputs to outputs for itemtype 'light'
   * Type = light | receptacle
   * { man : {on_addr:[ outputs ], off_addr: [ outputs ]} }
   * { '81.1.2' : {on_addr:['71.1.3', '91.1.4'], off_addr:[]}} */
  this.lightMap = {};
  
  /* store rm_addr for each out_addr.
   * Type = light | receptacle
   * { out_addr     : [ rm_outputs ] }
   * { '61.1.1' : [ '81.1.1', '82.1.1'] }
   */
  this.outRmMap = {};
  
  /* store shutter outputs bidirectional (like a dictionary).
   * { out_up_addr : out_down_addr,
   *   out_down_addr : out_up_addr }
   * { '81.4' : '81.3',
   *   '81.3' : '81.4'} */
  this.shutterMap = {};
  
  /* outputs that have to be switched on input event independent of item type.
   * Two steps to do on input event:
   * 1. find items to switch based on input (onInputMap)
   *    for lights: use out_addr to identify item
   *    for shutters: use out_up_addr to identify item
   * 2. find outputs to switch based on item (lightMap, shutterMap)
   * 
   *  man : {light : {on_addr:[ lights ], off_addr: [ lights ], toggle_addr: [ lights ] } },
   *     shutter : {kind : 'UP|DOWN'} shutter_out_up_addr:[ shutters ]}
   */
  this.onInputMap = {};
  
  if (createMaps) {
    this.createInternalMaps(homeconf);
    log.debug(util.inspect(this.lightMap, {depth:null}));
  }
}

/**
 * avoid searching for output to switch by creating maps
 * light: 
 *   { man : {on_addr:[ outputs ], off_addr: [ outputs ]} }
 *   { '81.1.2' : {on_addr:['71.1.3', '91.1.4'], off_addr:[]}} */
LogicApp.prototype.createInternalMaps = function (homeconf) {
  this.lightMap = {};
  this.outNeighbourMap = {};
  this.onInputMap = {};
  var i, j, l, m;
  var isToggle;
  for (var floor in homeconf) {
    for(var room in homeconf[floor]) {
      for(var item in homeconf[floor][room]) {
        var iObj = homeconf[floor][room][item]; 
        if (iObj.type === 'light' || iObj.type === 'receptacle') {
          l = iObj.on_addr.man.length;
          m = iObj.off_addr.man.length;
          for (i = 0; i < l; i++) {
            isToggle = false;
            // create if necessary
            if (!this.lightMap[ iObj.on_addr.man[i] ]) {
              this.lightMap[ iObj.on_addr.man[i] ] = {on_addr:[], off_addr:[], toggle_addr:[]};
            } else if (!this.lightMap[ iObj.on_addr.man[i] ].on_addr) {
              this.lightMap[ iObj.on_addr.man[i] ].on_addr = [];
            }
            if (!this.onInputMap[ iObj.on_addr.man[i] ]) {
              this.onInputMap[ iObj.on_addr.man[i] ] = {light:{on_addr:[], off_addr:[], toggle_addr:[]}};
            } else if (!this.onInputMap[ iObj.on_addr.man[i] ].light) {
              this.onInputMap[ iObj.on_addr.man[i] ].light = {on_addr:[], off_addr:[], toggle_addr:[]};
            } else if (!this.onInputMap[ iObj.on_addr.man[i] ].light.on_addr) {
              this.onInputMap[ iObj.on_addr.man[i] ].light.on_addr = [];
            }          
            
            // found in on_addr AND off_addr ? then its a toggle
            for (j = 0; j < m; j++) {
              if (iObj.on_addr.man[i] === iObj.off_addr.man[j]) {
                isToggle = true;
                // create if necessary
                if (!this.lightMap[ iObj.on_addr.man[i] ]) {
                  this.lightMap[ iObj.on_addr.man[i] ] = {on_addr:[], off_addr:[], toggle_addr:[]};
                } else if (!this.lightMap[ iObj.on_addr.man[i] ].toggle_addr) {
                  this.lightMap[ iObj.on_addr.man[i] ].toggle_addr = [];
                }
                this.lightMap[ iObj.on_addr.man[i] ].toggle_addr = 
                  this.lightMap[ iObj.on_addr.man[i] ].toggle_addr.concat(iObj.out_addr).concat(iObj.rm_addr);
                
                if (!this.onInputMap[ iObj.on_addr.man[i] ]) {
                  this.onInputMap[ iObj.on_addr.man[i] ] = {light:{on_addr:[], off_addr:[], toggle_addr:[]}};
                } else if (!this.onInputMap[ iObj.on_addr.man[i] ].light) {
                  this.onInputMap[ iObj.on_addr.man[i] ].light = {on_addr:[], off_addr:[], toggle_addr:[]};
                } else if (!this.onInputMap[ iObj.on_addr.man[i] ].light.toggle_addr) {
                  this.onInputMap[ iObj.on_addr.man[i] ].toggle_addr = [];
                }
                this.onInputMap[ iObj.on_addr.man[i] ].light.toggle_addr = 
                  this.onInputMap[ iObj.on_addr.man[i] ].light.toggle_addr.concat(iObj.out_addr);
                
                // remove from off_addr
                iObj.off_addr.man.splice(j,1);
              }
            }
            if (!isToggle) {
              this.lightMap[ iObj.on_addr.man[i] ].on_addr = 
                this.lightMap[ iObj.on_addr.man[i] ].on_addr.concat(iObj.out_addr).concat(iObj.rm_addr);
              this.onInputMap[ iObj.on_addr.man[i] ].light.on_addr = 
                this.onInputMap[ iObj.on_addr.man[i] ].light.on_addr.concat(iObj.out_addr);
            }
          }
          l = iObj.off_addr.man.length;
          for (i = 0; i < l; i++) {
            // create if necessary
            if (!this.lightMap[ iObj.off_addr.man[i] ]) {
              this.lightMap[ iObj.off_addr.man[i] ] = {on_addr:[], off_addr:[], toggle_addr:[]};
            } else if (!this.lightMap[ iObj.off_addr.man[i] ].off_addr) {
              this.lightMap[ iObj.off_addr.man[i] ].off_addr = [];
            }
            this.lightMap[ iObj.off_addr.man[i] ].off_addr = 
              this.lightMap[ iObj.off_addr.man[i] ].off_addr.concat(iObj.out_addr).concat(iObj.rm_addr);
            
            
            if (!this.onInputMap[ iObj.off_addr.man[i] ]) {
              this.onInputMap[ iObj.off_addr.man[i] ] = {light:{on_addr:[], off_addr:[], toggle_addr:[]}};
            } else if (!this.onInputMap[ iObj.off_addr.man[i] ].light) {
              this.onInputMap[ iObj.off_addr.man[i] ].light = {on_addr:[], off_addr:[], toggle_addr:[]};
            } else if (!this.onInputMap[ iObj.off_addr.man[i] ].light.off_addr) {
              this.onInputMap[ iObj.off_addr.man[i] ].light.off_addr = [];
            } 
            this.onInputMap[ iObj.off_addr.man[i] ].light.off_addr = 
              this.onInputMap[ iObj.off_addr.man[i] ].light.off_addr.concat(iObj.out_addr);
          }
          
          // find rm outputs quickly
          this.outRmMap[ iObj.out_addr ] = {rm_addr:iObj.rm_addr};
          
        } else if (iObj.type === 'shutter') {
          this.shutterMap[iObj.out_up_addr] = 
            {mirrorAdr: iObj.out_down_addr, kind: 'UP'};
          this.shutterMap[iObj.out_down_addr] = 
            {mirrorAdr: iObj.out_up_addr, kind: 'DOWN'};
          
          var refCur; // reference to current map item
          var targetObj;
          l = iObj.up_addr.man.length;
          
          for (i = 0; i < l; i++) {
            refCur = this.onInputMap[ iObj.up_addr.man[i] ];
            targetObj = {out_up_addr:iObj.out_up_addr, kind:'UP'};
            // create if necessary
            if (!refCur) {
              this.onInputMap[ iObj.up_addr.man[i] ] = {shutter:[targetObj]};
            } else if (!refCur.shutter) {
              refCur.shutter = [targetObj];
            } else {
            refCur.shutter = 
              refCur.shutter.concat(targetObj);
            }         
          }
          
          l = iObj.down_addr.man.length;
          
          for (i = 0; i < l; i++) {
            refCur = this.onInputMap[ iObj.down_addr.man[i] ];
            targetObj = {out_up_addr:iObj.out_up_addr, kind:'DOWN'};
            // create if necessary
            if (!refCur) {
              this.onInputMap[ iObj.down_addr.man[i] ] = {shutter:[targetObj]};
            } else if (!refCur.shutter) {
              refCur.shutter = [targetObj];
            } else {
            refCur.shutter = 
              refCur.shutter.concat(targetObj);
            }         
          }
        }
      }
    }
  }
}

/**
 * @param out_addr {string} - e.g. '81.1.1'
 * @param state {string} - 'ON' | 'OFF' */
LogicApp.prototype.switchLight = function switchLight(out_addr, state) {
  log.debug('switch light ' + state + ' : ' + out_addr);
  var adr = msghlp.str2IdOffs(out_addr);
  var i, l, rmAdr;
  if (state === 'ON') {
    ProcImg.setOutput(adr.id, adr.offs, 1);
    
    // switch rm's
    l = this.outRmMap[out_addr].rm_addr.length;
    for (i = 0; i < l; i++) {
      rmAdr = msghlp.str2IdOffs(this.outRmMap[out_addr].rm_addr[ i ]);
      ProcImg.setOutput(rmAdr.id, rmAdr.offs, 1);
    }
  } else {
    ProcImg.setOutput(adr.id, adr.offs, 0);
    
    // switch rm's
    l = this.outRmMap[out_addr].rm_addr.length;
    for (i = 0; i < l; i++) {
      rmAdr = msghlp.str2IdOffs(this.outRmMap[out_addr].rm_addr[ i ]);
      ProcImg.setOutput(rmAdr.id, rmAdr.offs, 0);
    }
  }
}

/**
 * If down is switched on, then up is automatically switched off
 * and vice versa.
 * Switch off is performed first.
 * @param out_addr {string} - e.g. '81.1'
 * @param state {string} - 'DOWN' | 'UP' | 'STOP' */
LogicApp.prototype.switchShutter = function switchShutter(out_addr, state) {
  log.debug('switch shutter ' + state + ': ' + out_addr);
  if (!this.shutterMap[out_addr]) {
    return;
  }
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
 * If more than one shutter is switched use little delay to avoid
 * currend peaks.
 * @param out_addrArr {array} - array of shutter addresses
 * @param kind {string} - 'DOWN' | 'UP' | 'STOP'
 * @param delayMs {number} - delay between each next switch in ms
 */
LogicApp.prototype.switchMultipleShutterDelayed = function switchShutter(out_addrArr, kind, delayMs, cb) {
  var l = out_addrArr.length;
  var self = this;
  var i = 0;
  mu.asyncloop(l, function(loop) {
    log.debug('switch shutter ' + loop.iteration() +':' + out_addrArr[loop.iteration()]);
    self.switchShutter( out_addrArr[loop.iteration()], kind );
    setTimeout(function () {
      loop.next();
    }, delayMs);
    i++;
  }, function() {
    mu.callCbIfFunctionWithArg(cb, i);
  });
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
 *     changed : [0x10, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0],
 *     tOn : [...] } */
LogicApp.prototype.onInputEvent = function onInputEvent(idObj, uData) {
  var i, l, j, k, ll, outAdr, targetAdr;
  var inbyte, changedByte;
  switch(idObj.txType) {
  case msghlp.uTypes.master: // Master
    break;
  case msghlp.uTypes.su: // Sensor Unit
    break;
  case msghlp.uTypes.pu: // Power Unit
    break;
  case msghlp.uTypes.iu: // Interface Unit
    if (!uData.iuIn) {
      return;
    }
    log.debug('onInputEvent: ' + idObj.txStr + ' data: ' + uData.iuIn.states.join(' ').toString(16));
    ll = uData.iuIn.states.length;
    for (j = 0; j < ll; j++) { // for all input bytes
      inbyte = uData.iuIn.states[j];
      if (uData.iuIn.changed) {
        changedByte = uData.iuIn.changed[j];
      } else {
        changedByte = 0xFF;
      }
      // skip if nothing changed on this byte
      if (changedByte === 0) {
        continue;
      }
      for (i = 0; i < 8; i++) { // for all bits
        // input high and changed?
        if (inbyte & (1<<i) && changedByte & (1<<i)) {
          log.debug('input changed: ' + idObj.txStr + '.1.' + (j*8+i+1).toString());
          for (var key in this.onInputMap) { // find connected lights
            // switch corresponding outputs
            if(key === (idObj.txStr + '.1.' + (j*8+i+1).toString()) ) {
              // txId matches

              if (this.onInputMap[key].light) {
                l = this.onInputMap[key].light.on_addr.length;
                for (k = 0; k < l; k++) {
                  this.switchLight( this.onInputMap[key].light.on_addr[k] , 'ON');
                }
                l = this.onInputMap[key].light.off_addr.length;
                for (k = 0; k < l; k++) {
                  this.switchLight( this.onInputMap[key].light.off_addr[k] , 'OFF');
                }
                l = this.onInputMap[key].light.toggle_addr.length;
                for (k = 0; k < l; k++) {
                  outAdr = this.onInputMap[key].light.toggle_addr[k];
                  targetAdr = msghlp.str2IdOffs(outAdr);
                  if ( ProcImg.getOutput(targetAdr.id, targetAdr.offs) ) {
                    this.switchLight( outAdr , 'OFF');
                  } else {
                    this.switchLight( outAdr , 'ON');
                  }
                }
              }
              if (this.onInputMap[key].shutter) {
                l = this.onInputMap[key].shutter.length;
                // assume function like central UP/DOWN
                if (l > 1) {
                  let tmpArr = [];
                  for (k = 0; k < l; k++) {
                    tmpArr = tmpArr.concat(this.onInputMap[key].shutter[k].out_up_addr);
                  }
                  this.switchMultipleShutterDelayed(tmpArr, this.onInputMap[key].shutter[0].kind,
                      SHUTTERDELAY);
                } else { // l = 1
                  k = 0;
                  outAdr = this.onInputMap[key].shutter[k].out_up_addr;
                  targetAdr = msghlp.str2IdOffs(outAdr);
                  // shutter running up ?
                  if ( ProcImg.getOutput(targetAdr.id, targetAdr.offs) ) {
                    this.switchShutter( outAdr, 'STOP');
                  } else {
                    // shutter running down ?
                    outAdr = this.shutterMap[this.onInputMap[key].shutter[k].out_up_addr].mirrorAdr;
                    if (outAdr) {
                      targetAdr = msghlp.str2IdOffs(outAdr);
                      if ( ProcImg.getOutput(targetAdr.id, targetAdr.offs) ) {
                        this.switchShutter( outAdr, 'STOP');
                      } else { // shutter not running
                        this.switchShutter( this.onInputMap[key].shutter[k].out_up_addr, 
                            this.onInputMap[key].shutter[k].kind);
                      }   
                    } else {
                      this.switchShutter( this.onInputMap[key].shutter[k].out_up_addr, 
                          this.onInputMap[key].shutter[k].kind);
                    } 
                  }
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