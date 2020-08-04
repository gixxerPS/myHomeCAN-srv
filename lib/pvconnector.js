/**
 * PV module .
 */
'use strict';
var modbus = require("modbus-stream");

var mu = require('./myutil.js');
var util = require('util');
// var log = require('log4js').getLogger('logic');
var appconf = require('./conf.js').app;


modbus.tcp.connect(appconf.COMM.PV_MODBUS.PORT, appconf.COMM.PV_MODBUS.IP, { debug: "automaton-2454" }, (err, connection) => {
    // do something with connection
    // serial
    // connection.readHoldingRegisters({ address: 40036 }, (err, res) => {
    //     if (err) throw err;

    //     console.log(res); // response
    // });

    // pv P [W]
    // connection.readHoldingRegisters({ address: 40068 }, (err, res) => {
    //     if (err) throw err;

    //     console.log(res); // response
    // });

    connection.readHoldingRegisters({ address: 40001 }, (err, res) => {
        if (err) throw err;

        console.log(res); // response
    });
});
