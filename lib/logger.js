/**
 * http://usejsdoc.org/
 */
var conf = require('./config/appconfig.json');
var log4js = require('log4js');
log4js.configure({
  appenders: [
    { type: 'console' },
    { type: 'file', filename: path.join(conf.PATH.LOG, can.log), 'maxLogSize': 20480, category: 'can' },
    { type: 'file', filename: path.join(conf.PATH.LOG, msg.log), 'maxLogSize': 20480, category: 'msg' },
    { type: 'file', filename: path.join(conf.PATH.LOG, server.log), 'maxLogSize': 20480, category: 'server' },
  ]
});