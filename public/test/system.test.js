'use strict';
var assert = chai.assert;
//var sinon = require('sinon');

suite('SYSTEM', function() {
  setup(function() {
  });
  teardown(function() {
  });
  test('simple byte to bin array', function() {
    assert.deepEqual(system.byte2BinArray(0x80), 
        [1,0,0,0,0,0,0,0]);
  });
  test('simple byte to bin array reverse', function() {
    assert.deepEqual(system.byte2BinArrayRev(0xC0), 
        [0,0,0,0,0,0,1,1]);
  });
  test('random byte to bin array', function() {
    assert.deepEqual(system.byte2BinArray(0xDE), 
        [ 1, 1, 0, 1, 1, 1, 1, 0 ]);
  });
  test('random byte array to bin array', function() {
    assert.deepEqual(system.byteArray2BinArray([0xDE, 0x80]), 
        [ 1, 1, 0, 1, 1, 1, 1, 0, 1,0,0,0,0,0,0,0 ]);
  });
  test('random byte array to bin array reverse', function() {
    assert.deepEqual(system.byteArray2BinArrayRev([0xE0, 0xA]), 
        [ 0,0,0,0,0,1,1,1, 0,1,0,1,0,0,0,0]);
  });
  test('bin array to table row', function() {
    assert.deepEqual(system.binArray2TableRow(system.byte2BinArray(0xDE)), 
        '<td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td>');
  });
  test('byte array to table row', function() {
    assert.deepEqual(system.binArray2TableRow(system.byteArray2BinArray([0xDE, 0x80])), 
        '<td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td>');
  });
  test('output button one col', function() {
    assert.deepEqual(system.getButtonCodeColById('71.2', 0), 
        '<th><button onmousedown="system.setOutput(\'71.2\',0,1)" onmouseup="system.setOutput(\'71.2\',0,0)" type="button">0</button></th>'
        );
  });
  test('output button row', function() {
    var i=0;
    var expected = '';
    for (;i<12;i++) {
      expected += system.getButtonCodeColById('71.2', i);
    }
    assert.deepEqual(system.getButtonCodeColsById('71.2', 12), 
        expected);
    for (;i<16;i++) {
      expected += system.getButtonCodeColById('71.2', i);
    }
    assert.deepEqual(system.getButtonCodeColsById('71.2', 16), 
        expected);
  });
});

