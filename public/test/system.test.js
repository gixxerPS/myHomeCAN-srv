var assert = chai.assert;
//var sinon = require('sinon');

const dut = system; // device under test

suite('SYSTEM', function() {
  setup(function() {
  });
  teardown(function() {
  });
  test('simple byte to bin array', function() {
    assert.deepEqual(dut.byte2BinArray(0x80), 
        [1,0,0,0,0,0,0,0]);
  });
  test('random byte to bin array', function() {
    assert.deepEqual(dut.byte2BinArray(0xDE), 
        [ 1, 1, 0, 1, 1, 1, 1, 0 ]);
  });
  test('random byte array to bin array', function() {
    assert.deepEqual(dut.byteArray2BinArray([0xDE, 0x80]), 
        [ 1, 1, 0, 1, 1, 1, 1, 0, 1,0,0,0,0,0,0,0 ]);
  });
  test('bin array to table row', function() {
    assert.deepEqual(dut.binArray2TableRow(dut.byte2BinArray(0xDE)), 
        '<td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td>');
  });
  test('byte array to table row', function() {
    assert.deepEqual(dut.binArray2TableRow(dut.byteArray2BinArray([0xDE, 0x80])), 
        '<td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td>');
  });
});

