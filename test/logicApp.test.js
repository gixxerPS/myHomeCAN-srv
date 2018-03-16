/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var LogicApp = require('../lib/logicApp.js');
var procImg = require('../lib/processimage.js');

require('log4js').getLogger('logic').level = 'OFF';

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
        Rollo: {
          type          : 'shutter',
          out_up_addr   : '73.1.1',
          out_down_addr : '73.1.2',
          man_up_addr   : ['93.1.1'],
          man_down_addr : ['93.1.2']
        }
      }
    }
}

suite('LOGIC APP', function() {
  var logicApp;
  setup(function() {
    this.setOutSpy = sinon.spy(procImg, 'setOutput');
    this.getOutStub = sinon.stub(procImg, 'getOutput');
    logicApp = new LogicApp();
  });
  teardown(function() {
    logicApp = undefined;
    procImg.setOutput.restore();
    procImg.getOutput.restore();
  });
//  test('create light map', function() {
//    logicApp.createInternalMaps(testHomeConf);
//    assert.deepEqual(logicApp.lightMap, {
//      '71.1.2':['10000001.1.1', '01100001.1.1', '01100001.1.3'],
//      '71.1.4':['10000001.1.1', '01100001.1.1', '01100001.1.3']
//    });
//  });
  test('create shutter map', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.deepEqual(logicApp.shutterMap, {
      '73.1.1':{kind:'UP', mirrorAdr:'73.1.2'},
      '73.1.2':{kind:'DOWN', mirrorAdr:'73.1.1'}
    });
  });
  //test('create output rm map', function() {
  //  logicApp.createInternalMaps(testHomeConf);
  //  assert.deepEqual(logicApp.outNeighbourMap, {
  //    '10000001.001.1':['01100001.001.1', '01100001.001.3']
  //  });
  //});
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
//    assert.deepEqual( this.setOutSpy.args[1], ['01100001.001', 1, 1] );
//    assert.deepEqual( this.setOutSpy.args[2], ['01100001.001', 3, 1] );
  });
  //test('onInput man light switches rm and output on', function() {
  //  this.getOutStub.returns(0);
  //  logicApp.createInternalMaps(testHomeConf);
  //  logicApp.onInputEvent({
  //    prio: 0, txType: 0x3, txId: 0x1, txStr: '01100001',
  //    rxType: 0x1, rxId: 0x1, rxStr: '00100001', code: 1
  //  },{
  //    states:[0,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  //    tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
  //  });
  //  assert.deepEqual( this.setOutSpy.args[0], ['10000001.001', 1, 1] );
  //  assert.deepEqual( this.setOutSpy.args[1], ['01100001.001', 1, 1] );
  //  assert.deepEqual( this.setOutSpy.args[2], ['01100001.001', 3, 1] );
  //});
  //test('onInput man light switches rm and output off', function() {
  //  this.getOutStub.returns(1);
  //  logicApp.createInternalMaps(testHomeConf);
  //  logicApp.onInputEvent({
  //    prio: 0, txType: 0x3, txId: 0x1, txStr: '01100001',
  //    rxType: 0x1, rxId: 0x1, rxStr: '00100001', code: 1
  //  },{
  //    states:[0,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  //    tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
  //  });
  //  assert.deepEqual( this.setOutSpy.args[3], ['10000001.001', 1, 0] );
  //  assert.deepEqual( this.setOutSpy.args[4], ['01100001.001', 1, 0] );
  //  assert.deepEqual( this.setOutSpy.args[5], ['01100001.001', 3, 0] );
  //});
  test('switch shutter up', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'UP');
    assert.deepEqual( this.setOutSpy.args[0], ['73.1', 1, 0] );
    assert.deepEqual( this.setOutSpy.args[1], ['73.1', 0, 1] );
  });
  test('switch shutter stop', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'STOP');
    assert.deepEqual( this.setOutSpy.args[0], ['73.1', 0, 0] );
    assert.deepEqual( this.setOutSpy.args[1], ['73.1', 1, 0] );
  });
  test('switch shutter down', function() {
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchShutter('73.1.1', 'DOWN');
    assert.deepEqual( this.setOutSpy.args[0], ['73.1', 1, 0] );
    assert.deepEqual( this.setOutSpy.args[1], ['73.1', 0, 1] );
  });
});

