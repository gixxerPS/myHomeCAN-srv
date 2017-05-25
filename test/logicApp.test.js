/**
 * http://usejsdoc.org/
 */
var assert = require('chai').assert;
var sinon = require('sinon');

var msghlp = require('../lib/msghlp.js');
var mu = require('../lib/myutil.js');
var LogicApp = require('../lib/logicApp.js');
var procImg = require('../lib/processimage.js');

var testHomeConf = {
    EG:{
      Kueche: {
        Kochbereich: {
          type      : 'light',
          out_addr  : '10000001.001.1',
          rm_addr   : ['01100001.001.1', '01100001.001.3'],
          man_addr  : ['01100001.001.2', '01100001.001.4']
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
  test('create light map', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.deepEqual(logicApp.lightMap, {
      '01100001.001.2':['10000001.001.1', '01100001.001.1', '01100001.001.3'],
      '01100001.001.4':['10000001.001.1', '01100001.001.1', '01100001.001.3']
    });
  });
  test('create output rm map', function() {
    logicApp.createInternalMaps(testHomeConf);
    assert.deepEqual(logicApp.outNeighbourMap, {
      '10000001.001.1':['01100001.001.1', '01100001.001.3']
    });
  });
  test('str2idOff', function() {
    var ret = msghlp.str2IdOffs('10000001.001.1');
    assert.deepEqual(ret, {
      id :'10000001.001',
      offs :1
    });
  });
  test('switch corresponding light outputs on', function() {
    this.getOutStub.returns(1);
    logicApp.createInternalMaps(testHomeConf);
    logicApp.switchLight('10000001.001.1', 'ON');
    assert.deepEqual( this.setOutSpy.args[0], ['10000001.001', 1, 1] );
    assert.deepEqual( this.setOutSpy.args[1], ['01100001.001', 1, 1] );
    assert.deepEqual( this.setOutSpy.args[2], ['01100001.001', 3, 1] );
  });
  test('onInput man light switches rm and output on', function() {
    this.getOutStub.returns(0);
    logicApp.createInternalMaps(testHomeConf);
    logicApp.onInputEvent({
      prio: 0, txType: 0x3, txId: 0x1, txStr: '01100001',
      rxType: 0x1, rxId: 0x1, rxStr: '00100001', code: 1
    },{
      states:[0,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
    });
    assert.deepEqual( this.setOutSpy.args[0], ['10000001.001', 1, 1] );
    assert.deepEqual( this.setOutSpy.args[1], ['01100001.001', 1, 1] );
    assert.deepEqual( this.setOutSpy.args[2], ['01100001.001', 3, 1] );
  });
  test('onInput man light switches rm and output off', function() {
    this.getOutStub.returns(1);
    logicApp.createInternalMaps(testHomeConf);
    logicApp.onInputEvent({
      prio: 0, txType: 0x3, txId: 0x1, txStr: '01100001',
      rxType: 0x1, rxId: 0x1, rxStr: '00100001', code: 1
    },{
      states:[0,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      tOn   :[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
    });
    assert.deepEqual( this.setOutSpy.args[3], ['10000001.001', 1, 0] );
    assert.deepEqual( this.setOutSpy.args[4], ['01100001.001', 1, 0] );
    assert.deepEqual( this.setOutSpy.args[5], ['01100001.001', 3, 0] );
  });
});

