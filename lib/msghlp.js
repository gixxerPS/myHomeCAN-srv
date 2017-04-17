/**
 * http://usejsdoc.org/
 */
var conf = require('../config/appconfig.json');
require('sprintf.js');

var sw = new Uint8Array(conf.VER.split('.'));
var swMajor = sprintf('%08d', sw[0]);
var swMinor = sprintf('%08d', sw[1]);
var swPatch = sprintf('%08d', sw[2]);
var header = '000000';
var myTxType = '001'; // master
var myTxId = '00001';
var bcRxType = '000'; // broadcast
var bcRxId = '00000'; // broadcast
var bcCode = '000'; // broadcast

module.exports = {
    units : {
      master : 0x1,
      sensor : 0x2,
      power  : 0x3,
      itf    : 0x4
    },
    header : header,
    footer : {
      pu : '000000000000000000000000000000000000000000000000',
      iu : '0000000000000000000000000000000000000000000000000000'
    },
    aliveCode : bcCode,
    msgs : {
      aliveHeader : swMajor + swMinor + swPatch,
      aliveFooter : '00000000000000000000000000000000'
    },
    ids : {
      alive : header + '0000' //prio
      + myTxType + myTxId
      + bcRxType + bcRxId + bcCode
    }
}