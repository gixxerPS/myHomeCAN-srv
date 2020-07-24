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
  /**
   * @param ms {number} - e.g. 3660000 ms = 1h 1min
   * returns {string} - ' xx h yy min zz s'
   */
  function convertMs2HhMmSs (ms) {
    var hh=0, mm=0, rest=0, sumSec=0;
    if (ms) {
      sumSec = parseInt(ms / 1000); // e.g. 3660
      hh = parseInt (sumSec / 3600); // e.g. 1
      rest = parseInt (sumSec % 3600); // e.g. 60  
      mm = parseInt (rest / 60); // e.g. 1
      rest = parseInt (rest % 60); // e.g. 0  
    }
    return hh + 'h ' + mm + 'min ' + rest + 's';
  }
  /**
   * @param ms {number} - e.g. 3660 s = 1h 1min
   * returns {string} - ' xx h yy min zz s'
   */
  function convertSec2HhMmSs (s) {
    var hh=0, mm=0, rest=0, sumSec=0;
    if (s) {
      sumSec = parseInt(s); // e.g. 3660
      hh = parseInt (sumSec / 3600); // e.g. 1
      rest = parseInt (sumSec % 3600); // e.g. 60  
      mm = parseInt (rest / 60); // e.g. 1
      rest = parseInt (rest % 60); // e.g. 0  
    }
    return hh + 'h ' + mm + 'min ' + rest + 's';
  }
  /**
   * @param s {number} - e.g. 3660 s = 1h 1min
   * returns {string} - ' xx h yy min zz s'
   */
  function convertSec2ddHhMmSs (s) {
    var dd=0, hh=0, mm=0, rest=0, sumSec=0;
    if (s) {
      sumSec = parseInt(s); // e.g. 3660
      dd = parseInt (sumSec / 86400);
      rest = parseInt (sumSec % 86400);
    }
    return dd + 'd ' + convertSec2HhMmSs(rest);
  }
  function weekDay2String (d) {
    switch (d) {
      case 0: return 'Sonntag';
      case 1: return 'Montag';
      case 2: return 'Dienstag';
      case 3: return 'Mittwoch';
      case 4: return 'Donnerstag';
      case 5: return 'Freitag';
      case 6: return 'Samstag';
    }
  }
  function weekDay2ShortString (d) {
    switch (d) {
      case 0: return 'So';
      case 1: return 'Mo';
      case 2: return 'Di';
      case 3: return 'Mi';
      case 4: return 'Do';
      case 5: return 'Fr';
      case 6: return 'Sa';
    }
  }
  function setStateColor4Elem (id, state) {
    var elem = document.getElementById(id);
    if (elem) {
      if (state && state.toString() === '1') {
        elem.style.backgroundColor = 'green';
      } else {
        elem.style.backgroundColor = '';
      }
    }
  }
  exports.mu = {
    byte2BinArray : byte2BinArray,
    byteArray2BinArray : byteArray2BinArray,
    convertMs2HhMmSs : convertMs2HhMmSs,
    convertSec2HhMmSs : convertSec2HhMmSs,
    convertSec2ddHhMmSs : convertSec2ddHhMmSs,
    weekDay2String : weekDay2String,
    weekDay2ShortString : weekDay2ShortString,
    setStateColor4Elem : setStateColor4Elem  
  }
})(this);
