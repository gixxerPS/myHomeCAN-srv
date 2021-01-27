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
    if (err) {
        console.error(`pv connector could not connect: ${err}`);
        return;
    }

    // Magicbyte – ModBus ID (Immer 0xE3DC)
    connection.readHoldingRegisters({ address: 40000 }, (err, res) => {
        if (err) console.error(`pv connector error: ${err}`);
        mu.cl(40000)
        mu.po(res.response.data);
    });
    // Photovoltaik-Leistung in Watt
    connection.readHoldingRegisters({ address: 40067}, (err, res) => {
        if (err) console.error(`pv connector error: ${err}`);
        mu.cl(40067)
        mu.po(res.response.data); // type array of buffer
    });
    // Batterie-Leistung in Watt
    connection.readHoldingRegisters({ address: 40069 }, (err, res) => {
        if (err) console.error(`pv connector error: ${err}`);
        mu.cl(40069)
        mu.po(res.response.data); // type array of buffer
    });
    // Hausverbrauchs-Leistung in Watt
    connection.readHoldingRegisters({ address: 40071 }, (err, res) => {
        if (err) console.error(`pv connector error: ${err}`);
        mu.cl(40071)
        mu.po(res.response.data); // type array of buffer
    });
    // Leistung am Netzübergabepunkt in Watt
    connection.readHoldingRegisters({ address: 40073 }, (err, res) => {
        if (err) console.error(`pv connector error: ${err}`);
        mu.cl(40073)
        mu.po(res.response.data); // type array of buffer
    });
    // Leistung der Wallbox in Watt
    connection.readHoldingRegisters({ address: 40077 }, (err, res) => {
        if (err) console.error(`pv connector error: ${err}`);
        mu.cl(40077)
        mu.po(res.response.data); // type array of buffer
    });
    // Batterie-SOC in Prozent
    connection.readHoldingRegisters({ address: 40082 }, (err, res) => {
        if (err) console.error(`pv connector error: ${err}`);
        mu.cl(40082)
        mu.po(res.response.data); // type array of buffer
    });
});
