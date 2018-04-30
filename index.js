console.log('start application');
require('./lib/logger.js');

var conf = require('./config/appconfig.json');
var Webserver = require('./lib/webserver.js');
var ProcMsg = require('./lib/procmsg.js');
var Can = require('./lib/can.js');
var LogicApp = require('./lib/logicApp.js');
var ProcImg = require('./lib/processimage.js');

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

// keep alive once a second
setInterval(function () {
  procMsg.sendAlive();
}, 1000);

// check alive states at interval
setInterval(function () {
  ProcImg.checkAliveStates();
}, 2000);