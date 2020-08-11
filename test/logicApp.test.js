/**
 * http://usejsdoc.org/
 */
'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var LogicApp = require('../lib/logicApp.js');
var procImg = require('../lib/processimage.js');

// require('log4js').getLogger('logic').level = 'OFF';
require('log4js').getLogger('logic').level = 'DEBUG';

var testHomeConf = {
    EG:{
      Kueche: {
        Kochbereich: {
          type      : 'light',
          out_addr  : '61.1.1',
          rm_addr   : ['71.1.1', '71.1.3'],
          on_addr   : {man: ['71.1.2', '71.1.4'], timed: ['72.1.2', '72.1.4']},
          off_addr  : {man: ['71.1.1', '71.1.3']},
          time      : 10000
        },
        Toggle: {
          type      : 'light',
          out_addr  : '62.1.1',
          rm_addr   : ['74.1.1'],
          on_addr   : {man: ['74.1.2']},
          off_addr  : {man: ['74.1.2']}
        },
        Toggle2: {
          type      : 'light',
          out_addr  : '62.1.2',
          rm_addr   : ['74.1.2'],
          on_addr   : {man: ['74.1.12']},
          off_addr  : {man: ['74.1.12']}
        },
        Rollo: {
          type          : 'shutter',
          out_up_addr   : '73.1.1',
          out_down_addr : '73.1.2',
          up_addr   : {man: ['93.1.1']},
          down_addr : {man: ['93.1.2']}
        }
      }
    },
    AUSSEN:{
      Garten:{
        Rasen:{
          type:'valve',
          out_addr: '89.1.10'
        },
        Rasen2:{
          type:'valve',
          out_addr: '89.1.11'
        },
        Tank : {
          type      : 'tank',
          levels    : [
            {'addr':'89.1.6', 'val':20, 'logic':'NO'},
            {'addr':'89.1.7', 'val':50, 'logic':'NO'},
            {'addr':'89.1.8', 'val':80, 'logic':'NO'}
          ],
          'fill_addr' : '87.1.2'
        },
        Pumpe2: {
          type          : 'pump',
          out_addr      : '69.1.16',
          flow_addr     : '89.1.10',
          press_addr    : '89.1.9',
          min           : {'addr':'89.1.6','logic':'NO'}
        }
      }
      
    }
}

suite('LOGIC APP', function() {
  var logicApp;
  setup(function() {
    this.origHomeConf = JSON.parse(JSON.stringify(testHomeConf));
    this.setOutSpy = sinon.stub(procImg, 'setOutput');
    this.getOutStub = sinon.stub(procImg, 'getOutput');
    logicApp = new LogicApp();
  });
  teardown(function() {
    testHomeConf = JSON.parse(JSON.stringify(this.origHomeConf));
    procImg.setOutput.restore();
    procImg.getOutput.restore();
    logicApp = undefined;
  });
  test('create light map', function() {
    logicApp.createInternalMaps({EG:{
      Kueche: {
        Kochbereich: {
          type      : 'light',
          out_addr  : '61.1.1',
          rm_addr   : ['71.1.1', '71.1.3'],
          on_addr   : {man: ['71.1.2', '71.1.4'], timed: ['72.1.2', '72.1.4']},
          off_addr  : {man: ['71.1.1', '71.1.3']},
          time      : 10000
        },
        Toggle: {
          type      : 'light',
          out_addr  : '62.1.1',
          rm_addr   : ['74.1.1'],
          on_addr   : {man: ['74.1.2']},
          off_addr  : {man: ['74.1.2']}
        },
        Rollo: {
          type          : 'shutter',
          out_up_addr   : '73.1.1',
          out_down_addr : '73.1.2',
          up_addr   : {man:['93.1.1']},
          down_addr : {man:['93.1.2']}
        }
      }
    }});
    assert.deepEqual(logicApp.lightMap, {
      '71.1.1':{on_addr:[], off_addr:['61.1.1', '71.1.1', '71.1.3'], toggle_addr:[]},
      '71.1.2':{on_addr:['61.1.1', '71.1.1', '71.1.3'], off_addr:[], toggle_addr:[]},
      '71.1.3':{on_addr:[], off_addr:['61.1.1', '71.1.1', '71.1.3'], toggle_addr:[]},
      '71.1.4':{on_addr:['61.1.1', '71.1.1', '71.1.3'], off_addr:[], toggle_addr:[]},
      '74.1.2':{on_addr:[], off_addr:[], toggle_addr:['62.1.1', '74.1.1']}
    });
  });
  test('create light map double keys', function() {
    logicApp.createInternalMaps({
      EG:{
        Kueche: {
          Kochbereich: {
            type      : 'light',
            out_addr  : '61.1.1',
            rm_addr   : ['71.1.1'],
            on_addr   : {man: ['71.1.2']},
            off_addr  : {man: ['71.1.1']}
          },
          Kochbereich2: {
            type      : 'light',
            out_addr  : '61.1.2',
            rm_addr   : ['71.1.2'],
            on_addr   : {man: ['71.1.1']},
            off_addr  : {man: ['71.1.2']}
          }
        }
      }});
    assert.deepEqual(logicApp.lightMap, {
      '71.1.1':{on_addr:['61.1.2', '71.1.2'], off_addr:['61.1.1', '71.1.1'], toggle_addr:[]},
      '71.1.2':{on_addr:['61.1.1', '71.1.1'], off_addr:['61.1.2', '71.1.2'], toggle_addr:[]},
    });
  });
  test('create shutter map', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.deepEqual(logicApp.shutterMap, {
      '73.1.1':{kind:'UP', mirrorAdr:'73.1.2'},
      '73.1.2':{kind:'DOWN', mirrorAdr:'73.1.1'}
    });
  });
  test('create pump map', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.deepEqual(logicApp.pumpMap, {
      'AUSSEN_Garten_Pumpe2':{opts:{autoEnable:false}, out_addr:'69.1.16', state:0, min:false, 
      pressure:false, flow:false}
    });
  });
  test('create oninput map', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.deepEqual(logicApp.onInputMap, {
      '71.1.1':{
        light:{
          on_addr:[], // store only 'main' outputs to switch on and not rm outputs
          off_addr:['61.1.1'], 
          toggle_addr:[]}
      },
      '71.1.2':{
        light:{
          on_addr:['61.1.1'], // store only 'main' outputs to switch on and not rm outputs
          off_addr:[], 
          toggle_addr:[]}
      },
      '71.1.3':{
        light:{
          on_addr:[], // store only 'main' outputs to switch on and not rm outputs
          off_addr:['61.1.1'], 
          toggle_addr:[]}
      },
      '71.1.4':{
        light:{
          on_addr:['61.1.1'], // store only 'main' outputs to switch on and not rm outputs
          off_addr:[], 
          toggle_addr:[]}
      },
      '74.1.2':{
        light:{
          on_addr:[], // store only 'main' outputs to switch on and not rm outputs
          off_addr:[], 
          toggle_addr:['62.1.1']}
      },
      '74.1.12':{
        light:{
          on_addr:[], // store only 'main' outputs to switch on and not rm outputs
          off_addr:[], 
          toggle_addr:['62.1.2']}
      },
      '93.1.1':{
        shutter:[{
          kind:'UP', out_up_addr:'73.1.1'}]},
      '93.1.2':{
        shutter:[{
          kind:'DOWN', out_up_addr:'73.1.1'}]},
      '89.1.6':{
        tank:{id:'AUSSEN_Garten_Tank',val:20},
        pump:{id:'AUSSEN_Garten_Pumpe2', sub:{min:{logic:'NO'}}}
      },
      '89.1.7':{
        tank:{id:'AUSSEN_Garten_Tank',val:50} },
      '89.1.8':{
        tank:{id:'AUSSEN_Garten_Tank',val:80} },
      '89.1.9':{
          pump:{id:'AUSSEN_Garten_Pumpe2',sub:{pressure:{}}} },
      '89.1.10':{
        pump:{id:'AUSSEN_Garten_Pumpe2',sub:{flow:{}}} }
    });
  });
  test('create test map check valve', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.deepEqual(logicApp.valveMap['89.1.10'], 
      {state:0, timeObj:null}
    );
  });
  test('create test map check tank', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.property(logicApp.tankMap, 'AUSSEN_Garten_Tank');
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'], 
      {level:0, state:0, empty:false, 
        fill_addr: '87.1.2', full:false,
      levelstates:[{logic:'NO',state:0,val:20},{logic:'NO',state:0,val:50},{logic:'NO',state:0,val:80}]}
    );
  });
  test('create rm map', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.deepEqual(logicApp.outRmMap, {
      '61.1.1':{rm_addr:['71.1.1', '71.1.3']},
      '62.1.1':{rm_addr:['74.1.1']},
      '62.1.2':{rm_addr:['74.1.2']},
    });
  });
  test('str2idOff', function() {
    var ret = msghlp.str2IdOffs('61.1.1');
    assert.deepEqual(ret, {
      id :'61.1',
      offs : 0
    });
  });
  test('switch corresponding light outputs on', function() {
    this.getOutStub.returns(1);
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchLight('61.1.1', 'ON');
    assert.deepEqual( this.setOutSpy.args[0], ['61.1', 0, 1] );
    assert.deepEqual( this.setOutSpy.args[1], ['71.1', 0, 1] );
    assert.deepEqual( this.setOutSpy.args[2], ['71.1', 2, 1] );
  });
  test('switch corresponding light outputs off', function() {
    this.getOutStub.returns(1);
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchLight('61.1.1', 'OFF');
    assert.deepEqual( this.setOutSpy.args[0], ['61.1', 0, 0] );
    assert.deepEqual( this.setOutSpy.args[1], ['71.1', 0, 0] );
    assert.deepEqual( this.setOutSpy.args[2], ['71.1', 2, 0] );
  });
  test('onInput man light switches rm and output on', function() {
    this.getOutStub.returns(0);
    logicApp.createInternalMaps(testHomeConf);
    logicApp.onInputEvent({
      prio: 0, txType: 0x4, txId: 0x1, txStr: '71',
      rxType: 0x1, rxId: 0x1, rxStr: '1', code: 1
    },{
      // 71.1.2
      iuIn:{states:Buffer.from([0x2,0x0]),
      tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
    }});
    assert.deepEqual( this.setOutSpy.args[0], ['61.1', 0, 1] );
    assert.deepEqual( this.setOutSpy.args[1], ['71.1', 0, 1] );
    assert.deepEqual( this.setOutSpy.args[2], ['71.1', 2, 1] );
    assert.deepEqual( this.setOutSpy.callCount, 3 );
  });
  test('onInput man light switches rm and output off', function() {
    this.getOutStub.returns(1);
    logicApp.createInternalMaps(testHomeConf);
    logicApp.onInputEvent({
      prio: 0, txType: 0x4, txId: 0x1, txStr: '71',
      rxType: 0x1, rxId: 0x1, rxStr: '1', code: 1
    },{
      // 71.1.1
      iuIn:{states:Buffer.from([0x1,0x0,0x0,0x0, 0x0,0x0,0x0,0x0]),
      tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
    }});
    assert.deepEqual( this.setOutSpy.args[0], ['61.1', 0, 0] );
    assert.deepEqual( this.setOutSpy.args[1], ['71.1', 0, 0] );
    assert.deepEqual( this.setOutSpy.args[2], ['71.1', 2, 0] );
    assert.deepEqual( this.setOutSpy.callCount, 3 );
  });
  test('onInput man light switches rm and output on toggle', function() {
    this.getOutStub.returns(0);
    logicApp.createInternalMaps(testHomeConf);
    var idObj = {
        prio: 0, txType: 0x4, txId: 0x1, txStr: '74',
        rxType: 0x1, rxId: 0x1, rxStr: '1', code: 1
      };
    var data = {
        // 74.1.2
        iuIn:{states:Buffer.from([0x2,0x0]),
        tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
      }};
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual( this.setOutSpy.args[0], ['62.1', 0, 1] );
    assert.deepEqual( this.setOutSpy.args[1], ['74.1', 0, 1] );
    this.getOutStub.returns(1);
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual( this.setOutSpy.args[2], ['62.1', 0, 0] );
    assert.deepEqual( this.setOutSpy.args[3], ['74.1', 0, 0] );
    assert.deepEqual( this.setOutSpy.callCount, 4 );
  });
  test('onInput man light switches rm and output on toggle with changed flag', function() {
    this.getOutStub.returns(0);
    logicApp.createInternalMaps(testHomeConf);
    var idObj = {
        prio: 0, txType: 0x4, txId: 0x1, txStr: '74',
        rxType: 0x1, rxId: 0x1, rxStr: '1', code: 1
      };
    var data = {
        // 74.1.12
        iuIn:{states:Buffer.from([0x0,0x8]), changed:Buffer.from([0x0,0x8]),
        tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
      }};
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual( this.setOutSpy.args[0], ['62.1', 1, 1] );
    assert.deepEqual( this.setOutSpy.args[1], ['74.1', 1, 1] );
    this.getOutStub.returns(1);
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual( this.setOutSpy.args[2], ['62.1', 1, 0] );
    assert.deepEqual( this.setOutSpy.args[3], ['74.1', 1, 0] );
    assert.deepEqual( this.setOutSpy.callCount, 4 );
  });
  test('switch shutter up', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'UP', function () {
      assert.deepEqual( self.setOutSpy.args[0], ['73.1', 1, 0] );
      assert.deepEqual( self.setOutSpy.args[1], ['73.1', 0, 1] );
      assert.deepEqual( self.setOutSpy.callCount, 4 );
      done();
    });
  });
  test('switch shutter stop', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'STOP', function () {
      assert.deepEqual( self.setOutSpy.args[0], ['73.1', 0, 0] );
      assert.deepEqual( self.setOutSpy.args[1], ['73.1', 1, 0] );
      done();
    });
  });
  test('switch shutter down', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'DOWN', function () {
      assert.deepEqual( self.setOutSpy.args[0], ['73.1', 1, 0] );
      assert.deepEqual( self.setOutSpy.args[1], ['73.1', 0, 1] );
      assert.deepEqual( self.setOutSpy.callCount, 4 );
      done();
    });
  });
  test('switch shutter off after up', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'UP');
    setTimeout(function () {
      assert.deepEqual( self.setOutSpy.callCount, 4 );
      assert.deepEqual(self.setOutSpy.args[0], ['73.1', 1, 0]);
      assert.deepEqual(self.setOutSpy.args[1], ['73.1', 0, 1]);
      assert.deepEqual(self.setOutSpy.args[2], ['73.1', 1, 0]);
      assert.deepEqual(self.setOutSpy.args[3], ['73.1', 0, 0]);
      done();
    }, 35); // wait x ms
  });
  test('switch shutter up inserts timeout id', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'UP');
    assert.ok(logicApp.shutterMap['73.1.1'].timeoutId);
  });
  test('switch shutter down after up deletes old timeout id', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'UP');
    logicApp.switchShutter('73.1.1', 'DOWN');
    assert.ok(logicApp.shutterMap['73.1.1'].timeoutId);
  });
  test('onInput man shutter switches output', function() {
    this.getOutStub.returns(0);
    logicApp.createInternalMaps(testHomeConf);
    var idObj = {
        prio: 0, txType: 0x4, txId: 0x1, txStr: '93',
        rxType: 0x1, rxId: 0x1, rxStr: '1', code: 1
      };
    var data = {
        // 74.1.2
        iuIn:{states:Buffer.from([0x1,0x0]),
        tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
      }};
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual( this.setOutSpy.args[0], ['73.1', 1, 0] );
    assert.deepEqual( this.setOutSpy.args[1], ['73.1', 0, 1] );
    assert.deepEqual( this.setOutSpy.callCount, 2 );
  });
  test('onInput man shutter stops', function() {
    this.getOutStub.returns(1);
    logicApp.createInternalMaps(testHomeConf);
    var idObj = {
        prio: 0, txType: 0x4, txId: 0x1, txStr: '93',
        rxType: 0x1, rxId: 0x1, rxStr: '1', code: 1
      };
    var data = {
        // 74.1.2
        iuIn:{states:Buffer.from([0x1,0x0]),
        tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
      }};
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual( this.setOutSpy.args[0], ['73.1', 0, 0] );
    assert.deepEqual( this.setOutSpy.args[1], ['73.1', 1, 0] );
    assert.deepEqual( this.setOutSpy.callCount, 2 );
  });
  test('switch shutter delayed', function(done) {
    var self = this;
    logicApp.switchMultipleShutterDelayed(['73.1.1','73.1.2','73.1.3','73.1.4'],
        'UP', 10, function (numIts) {
      assert.deepEqual( numIts, 4 );
      done();
    });
  });
  test('switch one valve ON immediately', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchValve('89.1.10', 'ON', 10);
    assert.deepEqual(logicApp.valveMap['89.1.10'].state, 1); 
    assert.deepEqual( this.setOutSpy.args[0], ['89.1', 9, 1] );
    assert.ok(logicApp.valveMap['89.1.10'].timeObj.getRemainingMs() > 0); 
    setTimeout(function (){
      // switched off after timeout ?
      assert.deepEqual(logicApp.valveMap['89.1.10'].state, 0); 
      assert.deepEqual(logicApp.valveMap['89.1.10'].timeObj.getRemainingMs(), 0); 
      assert.deepEqual( self.setOutSpy.args[1], ['89.1', 9, 0] );
      assert.deepEqual( self.setOutSpy.callCount, 2 );
      done();
    }, 14);
  });
  test('switch one valve OFF immediately', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchValve('89.1.10', 'ON', 10);
    assert.deepEqual(logicApp.valveMap['89.1.10'].state, 1); 
    logicApp.switchValve('89.1.10', 'OFF', 10);
    assert.deepEqual(logicApp.valveMap['89.1.10'].state, 0); 
    assert.deepEqual(logicApp.valveMap['89.1.10'].timeObj.getRemainingMs(), 0); 
    done();
  });
  test('send second valve pending', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchValve('89.1.10', 'ON', 10);
    logicApp.switchValve('89.1.11', 'ON', 10);
    assert.deepEqual(logicApp.valveMap['89.1.10'].state, 1); 
    assert.deepEqual(logicApp.valveMap['89.1.11'].state, 2); 
    assert.ok(logicApp.valveMap['89.1.10'].timeObj.getRemainingMs() > 0); 
    assert.ok(logicApp.valveMap['89.1.11'].timeObj.getRemainingMs() > 0); 
    setTimeout(function (){
      assert.deepEqual(logicApp.valveMap['89.1.10'].state, 0); 
      assert.deepEqual(logicApp.valveMap['89.1.11'].state, 0); 
      done();
    }, 34);
  });
  test('update tank level depending on inputs', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.updateTankLevelState('AUSSEN_Garten_Tank', 20, 1);
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'].levelstates[0],
     {val:20, state:1, logic:'NO'}
    );
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'].levelstates[1],
     {val:50, state:0, logic:'NO'}
    );
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'].levelstates[2],
     {val:80, state:0, logic:'NO'}
    );
  });
  test('update tank level from levelstates', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.updateTankLevelState('AUSSEN_Garten_Tank', 20, 1);
    logicApp.updateTankLevelFromState('AUSSEN_Garten_Tank');
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'].level, 20);
  });
  test('update higher tank level from levelstates', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.updateTankLevelState('AUSSEN_Garten_Tank', 20, 1);
    logicApp.updateTankLevelState('AUSSEN_Garten_Tank', 50, 1);
    logicApp.updateTankLevelFromState('AUSSEN_Garten_Tank');
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'].level, 50);
  });
  test('update tank level from levelstates off', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.updateTankLevelState('AUSSEN_Garten_Tank', 20, 1);
    logicApp.updateTankLevelFromState('AUSSEN_Garten_Tank');
    logicApp.updateTankLevelState('AUSSEN_Garten_Tank', 20, 0);
    logicApp.updateTankLevelFromState('AUSSEN_Garten_Tank');
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'].level, 0);
  });
  test('onInput tank level updates level', function() {
    //this.getOutStub.returns(0);
    logicApp.createInternalMaps(testHomeConf);
    var idObj = {
        prio: 0, txType: 0x4, txId: 0x1, txStr: '89',
        rxType: 0x1, rxId: 0x1, rxStr: '1', code: 1
      };
    var data = {
        // 89.1.6 ON
        iuIn:{states:Buffer.from([0x20,0x0]),changed:Buffer.from([0x20,0x0]),
          tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
      }};
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'].level, 20);

    data = {
      // 89.1.6 OFF
      iuIn:{states:Buffer.from([0x00,0x0]),changed:Buffer.from([0x20,0x0]),
        tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
    }};
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual(logicApp.tankMap['AUSSEN_Garten_Tank'].level, 0);
  });
  test('start tank fill', function() {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.tanklvlCmd('AUSSEN_Garten_Tank', 'ON', 20);
    assert.deepEqual( self.setOutSpy.args[0], ['87.1', 1, 1] );

    logicApp.updateTankLevelState('AUSSEN_Garten_Tank', 20, 1);
    logicApp.updateTankLevelFromState('AUSSEN_Garten_Tank');
    assert.deepEqual( self.setOutSpy.args[1], ['87.1', 1, 0] );

    assert.deepEqual( self.setOutSpy.callCount, 2 );
  });
  test('onInput pump states', function() {
    //this.getOutStub.returns(0);
    logicApp.createInternalMaps(testHomeConf);
    var idObj = {
        prio: 0, txType: 0x4, txId: 0x1, txStr: '89',
        rxType: 0x1, rxId: 0x1, rxStr: '1', code: 1
      };
    var data = {
        // 89.1.6 ON min
        // 89.1.9 ON press
        // 89.1.10 ON flow
        iuIn:{states:Buffer.from([0x20,0x3]),changed:Buffer.from([0x20,0x3]),
          tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
      }};
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].min, true);
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure, true);
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].flow, true);
    data = {
      // 89.1.6 OFF
      iuIn:{states:Buffer.from([0x00,0x0]),changed:Buffer.from([0x20,0x3]),
        tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
    }};
    logicApp.onInputEvent(idObj, data);
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].min, false);
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure, false);
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].flow, false);
  });
  test('pump logic min', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].min = false;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure = true;
    
    logicApp.exePumpLogic('AUSSEN_Garten_Pumpe2');
    assert.deepEqual( this.setOutSpy.args[0], ['69.1', 15, 0] );
  });
  test('pump logic auto', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].min = true;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure = true;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].opts.autoEnable = true; 
    logicApp.exePumpLogic('AUSSEN_Garten_Pumpe2');
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].state, 1);
    assert.deepEqual( this.setOutSpy.args[0], ['69.1', 15, 1] );

    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].flow = true;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure = false;
    logicApp.exePumpLogic('AUSSEN_Garten_Pumpe2');
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].state, 1);
    assert.deepEqual( this.setOutSpy.callCount, 1 ); // keep running

    // no pressure request and no flow ?
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].flow = false;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure = false;
    logicApp.exePumpLogic('AUSSEN_Garten_Pumpe2');
    setTimeout(function () {
      assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].state, 0);
      assert.deepEqual( self.setOutSpy.args[1], ['69.1', 15, 0] );
      done();
    }, 40);
    // no immediate switch off but with delay
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].state, 1);
  });
  test('pump logic start t off when pressure drops during timer', function(done) {
    var self = this;
    logicApp.createInternalMaps(testHomeConf);
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].min = true;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure = true;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].opts.autoEnable = true; 
    logicApp.exePumpLogic('AUSSEN_Garten_Pumpe2');
    
    // no pressure request and no flow to start timeout
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].flow = false;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure = false;
    logicApp.exePumpLogic('AUSSEN_Garten_Pumpe2');

    // timeout started. pressure request in between
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].min = true;
    logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].pressure = true;
    logicApp.exePumpLogic('AUSSEN_Garten_Pumpe2');

    setTimeout(function () {
      assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].state, 1);
      assert.deepEqual( self.setOutSpy.callCount, 2 ); 
      assert.deepEqual( self.setOutSpy.args[1], ['69.1', 15, 1] );
      done();
    }, 40);
  });
  test('pump option', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.setPumpOpt('AUSSEN_Garten_Pumpe2', {autoEnable:true});
    assert.deepEqual(logicApp.pumpMap['AUSSEN_Garten_Pumpe2'].opts.autoEnable, true);
  });
});

