'use strict';
(function(exports) {
  function byte2BinArray (num) {
    var mask;
    var ret=[];
    for (mask = 0x80; mask > 0; mask=mask>>1) {
      if (num & mask) {
        ret.push(1);
      } else {
        ret.push(0);
      }
    }
    return ret;
  };
  function byteArray2BinArray (byteArr) {
    var ret = [];
    byteArr.forEach(function (byte) {
      ret = ret.concat(byte2BinArray(byte));
    });
    return ret;
  };
  exports.mu = {
      byte2BinArray : byte2BinArray,
      byteArray2BinArray : byteArray2BinArray
  }
})(this);
