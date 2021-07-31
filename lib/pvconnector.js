/**
 * PV module .
 */
'use strict';
var modbus = require('modbus-stream');

var mu = require('./myutil.js');
var util = require('util');
var log = require('log4js').getLogger('pv');
var appconf = require('./conf.js').app;

/**
 * @constructor
 * @param sendFcn */
class PvConnector {
  constructor() {
    this.actData = {
      production  : 0, // [W]
      toBattery   : 0, // [W]
      house       : 0, // [W]
      fromGrid    : 0, // [W]
      wallBox     : 0, // [W]
      soc         : 0 // [%] state of charge  
    };
    this.connection = null;
    modbus.tcp.connect(appconf.COMM.PV_MODBUS.PORT, appconf.COMM.PV_MODBUS.IP, (err, connection) => {
      if (err) {
        log.error('no connection possible: ' + appconf.COMM.PV_MODBUS.IP);
      }
      else {
        this.connection = connection;
        // Magicbyte – ModBus ID (Immer 0xE3DC)
        //   connection.readHoldingRegisters({ address: 40000 }, (err, res) => {
        //       if (err) throw err;
        //       mu.cl(40000)
        //       mu.po(res.response.data);
        //   });
      }
    })
  }
  readPVdata() {
    if (this.connection) {
      // Photovoltaik-Leistung in Watt
      this.readPVvalueInt16(40067, (val) => {this.actData.production = val;});

      // Batterie-Leistung in Watt
      this.readPVvalueInt16(40069, (val) => {this.actData.toBattery = val;});

      // Batterie-SOC in Prozent
      this.readPVvalueInt16(40082, (val) => {this.actData.soc = val;});
      
      // Hausverbrauchs-Leistung in Watt
      this.readPVvalueInt16(40071, (val) => {this.actData.house = val;});
      
      // Leistung am Netzübergabepunkt in Watt
      this.readPVvalueInt16(40073, (val) => {this.actData.fromGrid = val;});
      
      // Leistung der Wallbox in Watt
      this.readPVvalueInt16(40077, (val) => {this.actData.wallBox = val;});
    }
  }
  readPVvalueInt16(address, cb) {
    if (!this.connection) {
      return mu.callCbIfFunctionWithArg(cb, 0);
    }
    this.connection.readHoldingRegisters({ address: address }, (err, res) => {
      var val = 0;
      if (err) {
        log.error('reading address ' + addr + ' failed');
      } else {
        try {
          log.debug(address + ' : ' + util.inspect(res.response.data));
          val = res.response.data[0].readInt16BE();
        }
        catch (e) {
          log.error('parsing I16 address ' + address + ' failed: ' + e.toString());
        }
      }
      mu.callCbIfFunctionWithArg(cb, val);
    });
  }
  getPvData() {
    // log.debug(this.actData);
    return this.actData;
  }
}

module.exports = PvConnector;
