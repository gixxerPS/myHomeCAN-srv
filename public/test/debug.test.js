'use strict';
var assert = chai.assert;
//var sinon = require('sinon');

suite('DEBUG', function() {
  setup(function() {
  });
  teardown(function() {
  });
  test('simple byte to bin array', function() {
    assert.deepEqual(byte2BinArray(0x80), 
        [1,0,0,0,0,0,0,0]);
  });
});

