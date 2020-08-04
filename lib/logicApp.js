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
  SHUTTERDELAY = 20;
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
   * 1. find items to switch or update based on input (onInputMap)
   *    for lights: use out_addr to identify item
   *    for shutters: use out_up_addr to identify item
   * 2. find outputs to switch or update based on item (lightMap, shutterMap, tankMap)
   * 
   *  man : {light : {on_addr:[ lights ], off_addr: [ lights ], toggle_addr: [ lights ] } },
   *  shutter : {kind : 'UP|DOWN'} shutter_out_up_addr:[ shutters ]}
   *  tank : {tank : {id:id, val:val}}
   *     input event for tank updates state for val in corresponding tank
   *  pump : {pump : {id:id, sub: {
                    min : {logic:iObj.min.logic},
                    flow : {},
                    pressure : {}
                  }}}
   */
  this.onInputMap = {};

  /* store valves including timer objects
   * out_addr of type valve is used as key.
   * currently only one valve per time.
   * state 0=off, 1=active, 2=pending(remaining time > 0)
   *
   * { out_addr : {state:0|1|2, timeObj:{}, remaining:22000, starttime:'15:49'}, ... }
   */
  this.valveMap = {};

  /* tanks with optional fill valves
   * use other id creation here because a tank
   * not necessarily has a fill valve with addr.
   * Each val in levelstate has corresponding input that is known in onInputMap.
   * This way input event can update the levelstate for tank and the new
   * level can be calculated.
   * {id : {state:0|1, level:x%, levelstates:[val:20, state:0, logic:'NO'], 
   *  empty:false, full:false, cmdLvl:25, fill_addr: '87.1.2'} }
  */
  this.tankMap = {};

  /*
   * {id:id, state:0|1, min:false, pressure:false, flow:false, opts:{autoEnable:true|false}}
   */
  this.pumpMap = {};
  
  if (createMaps) {
    this.createInternalMaps(homeconf);
    log.debug('lightmap: ' + util.inspect(this.lightMap, {depth:null}));
    log.debug('shuttermap: ' + util.inspect(this.shutterMap, {depth:null}));
    log.debug('outRMmap: ' + util.inspect(this.outRmMap, {depth:null}));
    log.debug('onInputmap: ' + util.inspect(this.onInputMap, {depth:null}));
    log.debug('valveMap: ' + util.inspect(this.valveMap, {depth:null}));
    log.debug('tankMap: ' + util.inspect(this.tankMap, {depth:null}));
    log.debug('pumpMap: ' + util.inspect(this.pumpMap, {depth:null}));
    //log.debug('num valves='+Object.keys(this.valveMap).length);
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
  this.valveMap = {};
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
        } else if (iObj.type === 'valve') {
          if (!this.valveMap[iObj.out_addr]) {
            this.valveMap[iObj.out_addr] = {state:0, timeObj: null /* will be created if needed */};
          } else {
            // TODO: Warning for duplicated valves in homeconfig!
          }
        } else if (iObj.type === 'tank') {
          if (!this.tankMap[floor+'_'+room+'_'+item]) {
            this.tankMap[floor+'_'+room+'_'+item] = {
              state:0, level: 0, levelstates: [], 
              empty: false, full: false, fill_addr: iObj.fill_addr
            };
            
            iObj.levels.forEach(element => {
              this.tankMap[floor+'_'+room+'_'+item].levelstates.push({
                val:element.val,
                state:element.logic === 'NC' ? 1 : 0,
                logic : element.logic
              });
              // connect input map with tank map
              // input not yet used ? => very likely
              if (!this.onInputMap[element.addr]) {
                this.onInputMap[element.addr] = {
                  tank:{
                    id : floor+'_'+room+'_'+item,
                    val : element.val
                  }
                }
              }
            });
          }
        } else if (iObj.type === 'pump') {
          if (!this.pumpMap[floor+'_'+room+'_'+item]) {
            this.pumpMap[floor+'_'+room+'_'+item] = {
              flow: false,
              min : false,
              pressure : false,
              state:0, 
              out_addr: iObj.out_addr,
              opts: {
                autoEnable : false
              }};
              // connect input map with pump map
              var pumpobj = {
                  id : floor+'_'+room+'_'+item,
                  sub: {
                    min : {logic:iObj.min.logic},
                    flow : {},
                    pressure : {}
                  }
                };
              if (!this.onInputMap[iObj.min.addr]) {
                this.onInputMap[iObj.min.addr] = {pump:{id:pumpobj.id, sub:{min:pumpobj.sub.min}}};
              } else {
                this.onInputMap[iObj.min.addr].pump = {id:pumpobj.id, sub:{min:pumpobj.sub.min}};
              }
              if (!this.onInputMap[iObj.flow_addr]) {
                this.onInputMap[iObj.flow_addr] = {pump:{id:pumpobj.id, sub:{flow:pumpobj.sub.flow}}};
              } else {
                this.onInputMap[iObj.flow_addr].pump = {id:pumpobj.id, sub:{flow:pumpobj.sub.flow}};
              }
              if (!this.onInputMap[iObj.press_addr]) {
                this.onInputMap[iObj.press_addr] = {pump:{id:pumpobj.id, sub:{pressure:pumpobj.sub.pressure}}};
              } else {
                this.onInputMap[iObj.press_addr].pump = {id:pumpobj.id, sub:{pressure:pumpobj.sub.pressure}};
              }
          } else {
            // TODO: Warning for duplicated valves in homeconfig!
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
LogicApp.prototype.switchShutter = function switchShutter(out_addr, state, cb) {
  log.debug('switch shutter ' + state + ': ' + out_addr);
  if (!this.shutterMap[out_addr]) {
    return mu.callCbIfFunctionWithArg(cb);
  }
  var self = this;
  var adr = msghlp.str2IdOffs(out_addr);
  var mirrAdrStr = this.shutterMap[out_addr].mirrorAdr;
  //clear old timeouts if necessary
  if (this.shutterMap[out_addr].timeoutId) {
    log.debug('clear shutter timeout:' + this.shutterMap[out_addr].timeoutId);
    clearTimeout(this.shutterMap[out_addr].timeoutId);
    this.shutterMap[out_addr].timeoutId = null;
  }
  if (this.shutterMap[mirrAdrStr].timeoutId) {
    log.debug('clear shutter timeout miroor:' + this.shutterMap[mirrAdrStr].timeoutId);
    clearTimeout(this.shutterMap[mirrAdrStr].timeoutId);
    this.shutterMap[mirrAdrStr].timeoutId = null;
  }
  
  if (state === 'STOP') {
    ProcImg.setOutput(adr.id, adr.offs, 0);
    adr = msghlp.str2IdOffs( this.shutterMap[out_addr].mirrorAdr );
    ProcImg.setOutput(adr.id, adr.offs, 0);
    return mu.callCbIfFunctionWithArg(cb);
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
    mu.callCbIfFunctionWithArg(cb);
  }, SHUTTERTIME);
  log.debug('start timeout id=' + this.shutterMap[out_addr].timeoutId);
}

/**
 * out_up_addr as id.
 * Kind down means then up off and down on.
 * Kind up means then up on and down on.
 * If down is switched on, then up is automatically switched off
 * and vice versa.
 * Switch off is performed first.
 * @param out_addr {string} - e.g. '81.1'
 * @param kind {string} - 'DOWN' | 'UP' | 'STOP' */
LogicApp.prototype.switchShutterById = function switchShutterById(out_up_addr, kind) {
  if (!this.shutterMap[out_up_addr]) {
    return;
  }
  log.debug('switch shutter ' + kind + ': ' + out_up_addr);
  var adr = msghlp.str2IdOffs(out_up_addr);
  var mirrAdrStr = this.shutterMap[out_up_addr].mirrorAdr;
  //clear old timeouts if necessary
  if (this.shutterMap[out_up_addr].timeoutId) {
    clearTimeout(this.shutterMap[out_up_addr].timeoutId);
    this.shutterMap[out_up_addr].timeoutId = null;
  }
  if (this.shutterMap[mirrAdrStr].timeoutId) {
    clearTimeout(this.shutterMap[mirrAdrStr].timeoutId);
    this.shutterMap[mirrAdrStr].timeoutId = null;
  }
  
  var mirradr = msghlp.str2IdOffs( mirrAdrStr );
  if (kind === 'STOP') {
    ProcImg.setOutput(adr.id, adr.offs, 0);
    adr = msghlp.str2IdOffs( this.shutterMap[out_up_addr].mirrorAdr );
    ProcImg.setOutput(adr.id, adr.offs, 0);
    return;
  } else if (kind === 'UP') {
    ProcImg.setOutput(mirradr.id, mirradr.offs, 0);
    ProcImg.setOutput(adr.id, adr.offs, 1);
  } else { // 'DOWN'
    ProcImg.setOutput(mirradr.id, mirradr.offs, 1);
    ProcImg.setOutput(adr.id, adr.offs, 0);
  }
  
  this.shutterMap[out_up_addr].timeoutId = setTimeout(function () {
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
LogicApp.prototype.switchMultipleShutterDelayed = function switchMultipleShutterDelayed(out_addrArr, kind, delayMs, cb) {
  var l = out_addrArr.length;
  var self = this;
  var i = 0;
  mu.asyncloop(l, function(loop) {
    log.debug('multi shutter ' + loop.iteration() + ' ' + kind +' : ' + out_addrArr[loop.iteration()]);
    self.switchShutterById( out_addrArr[loop.iteration()], kind );
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
 * @param out_addr {string} - e.g. '81.1'
 * @param state {string} - 'ON' | 'OFF' */
LogicApp.prototype.switchValve = function switchValve(out_addr, state, runtime) {
  var self = this;
  var adr = msghlp.str2IdOffs(out_addr);
  if (state === 'ON') {
    if ( this.okToStartValve(out_addr, state, runtime) ) {
      ProcImg.setOutput(adr.id, adr.offs, 1);
      if (!this.valveMap[out_addr].timeObj) { // no timer from state pending ?
        this.valveMap[out_addr].timeObj = new mu.timer(function(){self.onValveTimeout(out_addr, adr)}, runtime);
      }
      this.valveMap[out_addr].timeObj.start(runtime);
      this.valveMap[out_addr].state = 1;
    } else { // not ok 2 start -> go to state pending
      log.debug('send valve ' + out_addr + ' pending ');
      this.valveMap[out_addr].state = 2;
      this.valveMap[out_addr].timeObj = new mu.timer(function(){self.onValveTimeout(out_addr, adr)}, runtime);
    }
  } else { // OFF cmd
    ProcImg.setOutput(adr.id, adr.offs, 0);
    this.valveMap[out_addr].state = 0;
    if ( this.valveMap[out_addr].timeObj ) {
      this.valveMap[out_addr].timeObj.clear();
    }
    this.startPendingValvesIfNecessary();
  }
  log.debug('switch valve ' + out_addr + ' ' + state + ' for '+runtime + 'ms. state=' + this.valveMap[out_addr].state);
}

LogicApp.prototype.okToStartValve = function okToStartValve(out_addr, state, runtime) {
  var ok = true;
  for (var key in this.valveMap ) {
    if (this.valveMap[key].state == 1) { // only one valve per time
      ok = false;
    }
  }
  return ok;
}

/**
 * switch off valve and start next if more valves are waiting
 */
LogicApp.prototype.onValveTimeout = function onValveTimeout(out_addr, adr) {
  log.debug('timeout valve ' + out_addr);
  this.switchValve(out_addr, 'OFF'); 
}

LogicApp.prototype.startPendingValvesIfNecessary = function startPendingValvesIfNecessary() {
  var nextadr;
  var breakFor = false;
  for (var key in this.valveMap ) {
    if (this.valveMap[key].state == 2 && !breakFor) {
      this.switchValve(key, 'ON'); 
      breakFor = true;
    }
  }
}

LogicApp.prototype.getValveInfo = function getValveInfo(ids) {
  var i, tmpMap = {};
  if (!ids) {
    return this.valveMap;
  }
  for (i=0; i < ids.length; i++) {
     // update actual values
     if (this.valveMap[ ids[i] ] ) {
       tmpMap[ ids[i] ] = {
         state : this.valveMap[ ids[i] ].state,
         remaining : 0,
         starttime : '-'
       };
       if ( this.valveMap[ ids[i] ].timeObj ) {
         tmpMap[ ids[i] ].remaining = this.valveMap[ ids[i] ].timeObj.getRemainingMs();
         tmpMap[ ids[i] ].starttime = this.valveMap[ ids[i] ].timeObj.getStarted() || '-';
       }
     }
  }
  return tmpMap;
}

/**
 * @param id {string} - e.g. 'AUSSEN_Garten_Tank'
 * @param val {number} - e.g. 20
 * @param state {number} - 0 | 1 */
LogicApp.prototype.updateTankLevelState = function updateTankLevelState(id, val, state) {
  if (!this.tankMap[id]) {
    return;
  }
  //levelstates:[val:20, state:0, logic:'NO']
  const idx = this.tankMap[id].levelstates.findIndex(element => element.val === val);
  if (-1 < idx){
    this.tankMap[id].levelstates[idx].state = state;
  }
}

/**
 * update pump state flow, pressure, min level 
 * @param id {string} - e.g. 'AUSSEN_Garten_Tank'
 * @param subObj {object} -  {
                    min : {logic:'NO|NC'},
                    flow : {},
                    pressure : {}
                  }}
 * @param state {number} - 0 | 1 */
LogicApp.prototype.updatePumpState = function updatePumpState(id, subObj, state) {
  if (!this.pumpMap[id]) {
    return;
  }
  if (subObj.min) {
    if (subObj.min.logic === 'NO') {
      this.pumpMap[id].min = state ? true : false;
    } else { // NC
      this.pumpMap[id].min = state ? false : true;
    }
  }
  if (subObj.pressure) {
    this.pumpMap[id].pressure = state ? true : false;
  }
  if (subObj.flow) {
    this.pumpMap[id].flow = state ? true : false;
  }
  this.exePumpLogic(id);
}

LogicApp.prototype.setPumpOpt = function setPumpOpt(id, opts) {
  if(!this.pumpMap[id]) {
    return;
  }
  for (var opt in opts) {
    if (this.pumpMap[id].opts[opt] !== undefined) { // known option ?
      if (opt === 'autoEnable' && opts[opt] === 'toggle') {
        this.pumpMap[id].opts[opt] = !this.pumpMap[id].opts[opt];
      } else {
        this.pumpMap[id].opts[opt] = opts[opt];
      }
    }
  }
}

/**
 * switch pump depending on flow, pressure, min level 
 * @param id {string} - e.g. AUSSEN_Garten_Pumpe2 */
LogicApp.prototype.exePumpLogic = function exePumpLogic(id) {
  // { flow: false,
  //   min: false,
  //   pressure: false,
  //   state: 0,
  //   out_addr: '69.1.16',
  //   opts: { autoEnable: false } }
  var pObj = this.pumpMap[id];
  var adr = msghlp.str2IdOffs(pObj.out_addr);
  var state = 0;
  if (!pObj.min) {
    log.debug('pump: ' + id + ' min level');
    pObj.state = state; // 0
    return ProcImg.setOutput(adr.id, adr.offs, state);
  }
  if (!pObj.opts.autoEnable) {
    log.debug('pump: ' + id + ' automatic is off. do nothing');
    pObj.state = state; // 0
    return ProcImg.setOutput(adr.id, adr.offs, state);
  }
  if (pObj.opts.autoEnable) {
    if (!pObj.pressure && pObj.min) {
      log.debug('pump: ' + id + ' pressure lost => start');
      state = 1;
      pObj.state = state; // 1
      ProcImg.setOutput(adr.id, adr.offs, state);
    } else if (pObj.pressure && !pObj.flow) {
      log.debug('pump: ' + id + ' pressure ok & no flow => stop');
      state = 0;
      pObj.state = state; // 0
      ProcImg.setOutput(adr.id, adr.offs, state);
    }
  }
  // ProcImg.getOutput(targetAdr.id, targetAdr.offs)
}

LogicApp.prototype.getPumpInfo = function getPumpInfo(ids) {
  //log.debug('getPumpInfo: ' + util.inspect(ids));
  var i, tmpMap = {};
  if (!ids) {
    return this.pumpMap;
  }
  for (i=0; i < ids.length; i++) {
    // update actual values
    if (this.pumpMap[ ids[i] ] ) {
      // copy
      tmpMap[ ids[i] ] = Object.assign({}, this.pumpMap[ ids[i] ])
     }
  }
  return tmpMap;
}

/**
 * calc % level from input states (after map update via updateTankLevelState)
 */
LogicApp.prototype.updateTankLevelFromState = function updateTankLevelFromState(id) {
  if (!this.tankMap[id]) {
    return;
  }
  var maxVal = 0;
  // find maximum active state / level that is active (with fixed logic)
  this.tankMap[id].levelstates.forEach(element => {
    if (element.state === 1 && (element.logic === 'NO' || element.logic === 'no') ) {
      if (element.val > maxVal) {
        maxVal = element.val;
      }
    } else if (element.state === 0 && (element.logic === 'NC' || element.logic === 'nc') ) {
      if (element.val > maxVal) {
        maxVal = element.val;
      }
    }
  });
  this.tankMap[id].level = maxVal;

  // check if we need to stop filling
  if (this.tankMap[id].state === 1 &&
    this.tankMap[id].level >= this.tankMap[id].cmdLvl - 1e-3) {
      this.tanklvlCmd(id, 0, 0); 
  }
}

LogicApp.prototype.getTankInfo = function getTankInfo(ids) {
  //log.debug('getTankInfo: ' + util.inspect(ids));
  var i, tmpMap = {};
  if (!ids) {
    return this.tankMap;
  }
  for (i=0; i < ids.length; i++) {
    // update actual values
    if (this.tankMap[ ids[i] ] ) {
       tmpMap[ ids[i] ] = {
         state : this.tankMap[ ids[i] ].state,
         level : this.tankMap[ ids[i] ].level,
         starttime : this.tankMap[ ids[i] ].starttime || '-'
       }
     }
  }
  return tmpMap;
}

/**
 * @param id {string} - 'AUSSEN_Garten_Tank'
 * @param state {string} - 'ON' | 'OFF' 
 * @param level {number} - x %
 */
LogicApp.prototype.tanklvlCmd = function tanklvlCmd(id, state, level) {
  log.debug('tanklvlCmd ' + id + ' ' + state + ' @ ' + level + ' %');
  if (!this.tankMap[id]) {
    return;
  }
  var adr = msghlp.str2IdOffs(this.tankMap[id].fill_addr);
  if (state === 'ON' && this.tankMap[id].level < level) {
    this.tankMap[id].state = 1;
    this.tankMap[id].cmdLvl = level;
    this.tankMap[id].starttime = new Date();
    ProcImg.setOutput(adr.id, adr.offs, 1);
  } else { // 'OFF'
    this.tankMap[id].state = 0;
    this.tankMap[id].cmdLvl = 0;
    this.tankMap[id].starttime = '-';
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
                  log.debug('central '+ this.onInputMap[key].shutter[0].kind + ' from ' + key + ' for ' + util.inspect(tmpArr));
                  this.switchMultipleShutterDelayed(tmpArr, this.onInputMap[key].shutter[0].kind,
                      SHUTTERDELAY);
                } else { // l = 1 = single shutter
                  k = 0;
                  outAdr = this.onInputMap[key].shutter[k].out_up_addr;
                  targetAdr = msghlp.str2IdOffs(outAdr);
                  // shutter running up ?
                  if ( ProcImg.getOutput(targetAdr.id, targetAdr.offs) ) {
                    this.switchShutterById( outAdr, 'STOP');
                  } else {
                    // shutter running down ?
                    outAdr = this.shutterMap[this.onInputMap[key].shutter[k].out_up_addr].mirrorAdr;
                    if (outAdr) {
                      targetAdr = msghlp.str2IdOffs(outAdr);
                      if ( ProcImg.getOutput(targetAdr.id, targetAdr.offs) ) {
                        this.switchShutterById( outAdr, 'STOP');
                      } else { // shutter not running
                        this.switchShutterById( this.onInputMap[key].shutter[k].out_up_addr, 
                            this.onInputMap[key].shutter[k].kind);
                      }   
                    } else {
                      this.switchShutterById( this.onInputMap[key].shutter[k].out_up_addr, 
                          this.onInputMap[key].shutter[k].kind);
                    } 
                  }
                }
              }
              if (this.onInputMap[key].tank) {
                this.updateTankLevelState(this.onInputMap[key].tank.id, 
                  this.onInputMap[key].tank.val, 1);
                this.updateTankLevelFromState(this.onInputMap[key].tank.id);
              }
              if (this.onInputMap[key].pump) {
                log.debug('onInput pump ON: ' + this.onInputMap[key].pump.id + ' sub= ' + util.inspect(this.onInputMap[key].pump.sub));
                this.updatePumpState(this.onInputMap[key].pump.id, this.onInputMap[key].pump.sub, 1);
              }
            }
          }
        // input low and changed?
        } else if (!(inbyte & (1<<i)) && changedByte & (1<<i)) {
          for (var key in this.onInputMap) { // find connected lights
            if(key === (idObj.txStr + '.1.' + (j*8+i+1).toString()) ) {
              // txId matches
              if (this.onInputMap[key].tank) {
                this.updateTankLevelState(this.onInputMap[key].tank.id, 
                  this.onInputMap[key].tank.val, 0);
                this.updateTankLevelFromState(this.onInputMap[key].tank.id);
              }
              if (this.onInputMap[key].pump) {
                log.debug('onInput pump OFF: ' + this.onInputMap[key].pump.id + ' sub= ' + this.onInputMap[key].pump.sub);
                this.updatePumpState(this.onInputMap[key].pump.id, this.onInputMap[key].pump.sub, 0);
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
