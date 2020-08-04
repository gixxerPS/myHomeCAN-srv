console.log('start application');
require('./lib/logger.js');

var conf = require('./config/appconfig.json');
var Webserver = require('./lib/webserver.js');
var ProcMsg = require('./lib/procmsg.js');
var Can = require('./lib/can.js');
var LogicApp = require('./lib/logicApp.js');
var ProcImg = require('./lib/processimage.js');
var WeatherApp = require('./lib/weatherApp.js');
var PvConnector = require('./lib/pvconnector.js');

//-----------------------------------------------------------------------------
// create modules
//-----------------------------------------------------------------------------
var procMsg = new ProcMsg();
var logicApp = new LogicApp(true);

//-----------------------------------------------------------------------------
// connect modules
//-----------------------------------------------------------------------------
Can.registerOnMsgClient(procMsg, procMsg.onMsg);
Can.registerOnMsgClient(Webserver, Webserver.onMsgData); // for debug view

procMsg.registerOnMsgAliveClient(ProcImg, ProcImg.onMsgAlive);
procMsg.registerOnMsgDataClient(ProcImg, ProcImg.onMsgData);

procMsg.setSendFcn(Can.sendMsg);
ProcImg.setSendIoFcn(procMsg.send, procMsg);

ProcImg.registerOnInputEventClient(logicApp, logicApp.onInputEvent);

Webserver.setProcMsgObj(procMsg);
Webserver.setLogicObj(logicApp);

if (process.env.MYHOMECANTESTENV) {
  require('log4js').getLogger().info('TESTENVIRONMENT ACTIVE !!!'); 
}

WeatherApp.update(); // once at startup
setInterval(function () {
  WeatherApp.update();
}, 10 * 60 * 1000); // every n minutes

// keep alive once a second
setInterval(function () {
  procMsg.sendAlive();
}, 1000);

// check alive states at interval
setInterval(function () {
  ProcImg.checkAliveStates();
}, 2000);