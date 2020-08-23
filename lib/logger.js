/**
 * http://usejsdoc.org/
 */
var conf = require('../config/appconfig.json');
var path = require('path');

var categories = {
  can     : { appenders: ['console', 'can'], level: 'info'},
  msg     : { appenders: ['console', 'msg'], level: 'info'},
  server  : { appenders: ['console', 'server'], level: 'info'},
  logic   : { appenders: ['console', 'logic'], level: 'info'},
  weather : { appenders: ['console', 'weather'], level: 'info'},
  pv      : { appenders: ['console', 'pv'], level: 'info'},
  default : { appenders: ['console'], level: 'info' } 
};

// export MYHOMECANDEBUG='server msg'
if(process.env.MYHOMECANDEBUG) {
  process.env.MYHOMECANDEBUG.split(' ').forEach(function (item) {
    if (categories[item]) {
      console.log('set debug level for ' + item);
      categories[item].level = 'debug';
    }
  });
}

require('log4js').configure({
  appenders: {
    console : { type: 'console' },
    can     : { type: 'file', filename: path.join(conf.PATH.LOG, 'can.log'), 'maxLogSize': 20480},
    msg     : { type: 'file', filename: path.join(conf.PATH.LOG, 'msg.log'), 'maxLogSize': 20480},
    server  : { type: 'file', filename: path.join(conf.PATH.LOG, 'server.log'), 'maxLogSize': 20480},
    weather  : { type: 'file', filename: path.join(conf.PATH.LOG, 'weather.log'), 'maxLogSize': 20480},
    logic   : { type: 'file', filename: path.join(conf.PATH.LOG, 'logic.log'), 'maxLogSize': 20480},
    pv      : { type: 'file', filename: path.join(conf.PATH.LOG, 'pv.log'), 'maxLogSize': 20480}
  },
  categories: categories
});
