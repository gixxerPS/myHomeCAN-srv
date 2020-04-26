var assert = chai.assert;
//var sinon = require('sinon');

suite('ROOM', function() {
  setup(function() {
  });
  teardown(function() {
  });
  test('dummy system', function() {
    assert.deepEqual(/*room.shutterClick()*/true, true);
  });
  test('convert millis to string', function() {
    assert.deepEqual(room.convertMs2HhMmSs(5397000), '1h 29min 57s');
  });
  test('convert undef to string', function() {
    assert.deepEqual(room.convertMs2HhMmSs(), '0h 0min 0s');
  });
});

