/**
 * http://usejsdoc.org/
 */
var packageJson = require('../package.json');
require('sprintf.js');

var sw = new Uint8Array(packageJson.version.split('.'));
var swMajor = sprintf('%08d', sw[0]);
var swMinor = sprintf('%08d', sw[1]);
var swPatch = sprintf('%08d', sw[2]);
//var header = '000000';
var myTxType = 1;   // master 3 bit
var myTxId = 1;     // master id 5 bit
var myTxIdPart = (myTxType<<16) + (myTxId<<11);
var bcRxType = 0;   // broadcast 3 bit
var bcRxId = 0;     // broadcast 5 bit
var bcCode = 0;     // broadcast 3 bit

module.exports = {
    uTypes : {
      master : 0x1,
      su     : 0x2,
      pu     : 0x3,
      iu     : 0x4
    },
    header : {
      pu : Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0]), // 6 byte
      iu : Buffer.from([0x0,0x0,0x0,0x0,0x0,0x0])  // 6 byte
    },
    aliveCode : bcCode,
    defaultPrio : 0,
    msgs : {
      aliveFooter : Buffer.from([swPatch, swMinor, swMajor]),
      aliveHeader : Buffer.from([0x0,0x0,0x0,0x0])
    },
    ids : {
      alive : (myTxType<<16) + (myTxId<<11)
      + (bcRxType<<8) + (bcRxId<<3) + bcCode,
      myTxTypeId : myTxType + myTxId 
    },
    /**
     * For internal process image
     * @param addr {string} - e.g. '61.1.1' */
    str2IdOffs : function str2IdOffs(addr) {
      var spl = addr.split('.');
      return {
        id   : [spl[0], '.', spl[1]].join(''),
        offs : parseInt( spl[2] ) - 1 // zero based 
      }
    },
    /**
     * Prepared to send.
     * @param addr {string} - e.g. '61.1.1' */
    str2IdOffsSend : function str2IdOffsSend(addr) {
      var spl = addr.split('.');
      return myTxIdPart + (parseInt(spl[0], 16)<<3) + parseInt(spl[1], 16);
    }
}