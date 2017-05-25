var conf = require('./config/appconfig.json');
var werbserver = require('./lib/webserver.js');

var ProcMsg = require('./lib/procmsg.js');
var Can = require('./lib/can.js');
var LogicApp = require('./lib/logicApp.js');
var ProcImg = require('./lib/processimage.js');

console.log('start application');

// connect/create modules

// connect can to process message module (1st abstraction layer)
var procMsg = new ProcMsg(Can.sendMsg);
Can.setReceiveCB(procMsg.onMsg, procMsg);

// connect abstracted module to process image
ProcImg.setSendIoFcn(procMsg.send, procMsg);

var logicApp = new LogicApp();
werbserver.setLogicObj(logicApp);

// keep alive once a second
setInterval(function () {
  procMsg.sendAlive();
}, 1000);