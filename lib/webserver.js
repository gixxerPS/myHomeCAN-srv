/**
 * http://usejsdoc.org/
 */
var express = require('express')
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var util = require('util');
var path = require('path');
var favicon = require('serve-favicon');
var os = require('os-utils');

var conf = require('../config/appconfig.json');
var packageJson = require('../package.json');
var homeconf = require('./conf.js').home;
var ProcImg = require('./processimage.js');
var WeatherApp = require('./weatherApp.js');
var log = require('log4js').getLogger('server');
var msghlp = require('./msghlp.js');
var mu = require('./myutil.js');

var commonData = {
    curver : packageJson.version
}

var floors = {};
var rooms = {};
for (var floor in homeconf) {
  floors[floor] = homeconf[floor];
  for(var room in homeconf[floor]) {
    rooms[floor + '_' + room] = floor + '-' + room;
  }
}

server.listen(conf.SERVER.PORT);
log.info('server is running at http://127.0.0.1:' + conf.SERVER.PORT + '/');

app.set('view engine', 'pug');
if (!process.env.MYHOMECANTESTENV) {
  app.use(favicon(path.join(conf.SERVER.DIR, 'favicon.ico')));
}

app.get('/', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/index.pug'), 
     {rooms : rooms, // for toc
    commonData : commonData} 
  );
});
app.get(/room_/g, function (req, res) {
  //log.debug('get room: ' + util.inspect(req));
  //log.debug('url = ' + req.url);
  var urlPart = req.url.replace('/room_', '');
  var floor_room = urlPart.split('-'); // '-' is automatic floor room seperator
  var floorStr = floor_room[0];
  var roomStr = floor_room[1];
  log.debug('requested floor = ' + floorStr + ' .room = ' + roomStr);
  //log.debug('roomObj: ' + util.inspect(homeconf[floorStr][roomStr]));
  
  res.render(path.join(conf.SERVER.DIR,'views/room.pug'), 
      {roomObj : homeconf[floorStr][roomStr], roomtitle : urlPart/*roomStr*/,
    rooms : rooms, // for toc
    commonData : commonData}
  );
});
app.get('/debug', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/debug.pug'), 
      {rooms : rooms, // for toc
    commonData : commonData, // for version
    homeconf : homeconf} 
  );
});
app.get('/mynotes', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/mynotes.pug'), 
      {rooms : rooms, // for toc
    commonData : commonData, // for version
    homeconf : homeconf} 
  );
});
app.get('/system', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/system.pug'), 
     {aliveMap:ProcImg.getAliveMap(), 
    rooms : rooms, // for toc
    commonData : commonData} // for version
  );
});
app.get('/light', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/light.pug'), 
      {rooms : rooms,  // for toc
       homeObj : homeconf, 
       commonData : commonData} // for version
  );
});
app.get('/watering', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/watering.pug'), 
      {rooms : rooms,  // for toc
       homeObj : homeconf, 
       commonData : commonData} // for version
  );
});
app.get('/shutter', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/shutter.pug'), 
      {rooms : rooms, // for toc
    commonData : commonData} // for version
  );
});
app.use(express.static(conf.SERVER.DIR));

var getOutputStates = function (ids) {
  var outs = {};
  var adr;
  var i,l = ids.length;
  for (i = 0; i < l; i++) {
    adr = msghlp.str2IdOffs(ids[i].split('_')[0]);
    outs[ ids[i] ] = ProcImg.getOutput(adr.id, adr.offs);
  }
  return outs;
}

/**
 * @param {array} ids - [{addr:'69.1.10', htmlid:'69.1.10_flow'}] 
 */
var getInputStates = function (ids) {
  var ins = [];
  var adr;
  var i,l = ids.length;
  mu.po(ids);
  for (i = 0; i < l; i++) {
    adr = msghlp.str2IdOffs(ids[i].addr); // splitted by client
    ins.push( {
      state: ProcImg.getOutput(adr.id, adr.offs),
      htmlid : ids[i].htmlid }
    );
  }
  return ins;
}

var globalsocket;
io.sockets.on('connection', function (socket) {
  log.debug('client connected');
  globalsocket = socket;
  //socket.emit('chat', { zeit: new Date(), text: 'Du bist nun mit dem Smarthome-Server verbunden!' });
  socket.on('ctrl', function (data) {
    //log.debug('ctrl received: ' + util.inspect(data));
    if (data.type === 'light') {
      logicObj.switchLight(data.id, data.state);
    } else if (data.type === 'shutter') {
      logicObj.switchShutter(data.id, data.state);
    } else if (data.type === 'receptacle') {
      logicObj.switchReceptacle(data.id, data.state);
    } else if (data.type === 'valve') {
      logicObj.switchValve(data.id, data.state, data.runtime);
    } else if (data.type === 'tanklvl') {
      logicObj.tanklvlCmd(data.id, data.state, data.cmdLvl);
    } else {
      log.warn('ctrl. unknown type ' + data.type);
    }
  });
  // get output states from process image
  socket.on('output_req_c', function (ids) {
    io.sockets.emit('output_res', { states : getOutputStates(ids), circle : true});
  });
  //get output states from process image
  socket.on('output_req_d', function (ids) {
    io.sockets.emit('output_res', { states : getOutputStates(ids) , delta : true});
  });
  // get valve states e.g. remaining runtime
  socket.on('valve_req', function (ids) {
    //log.debug('requested valve ids:' + util.inspect(ids, {depth:null}));
    io.sockets.emit('valve_res', { valveInfo : logicObj.getValveInfo(ids)});
  });
  // get output states from process image
  socket.on('input_req_c', function (ids) {
    io.sockets.emit('input_res', { states : getInputStates(ids), circle : true});
  });
  // get tank info e.g. level
  socket.on('tank_req', function (ids) {
    //log.debug('requested tanks ids:' + util.inspect(ids, {depth:null}));
    io.sockets.emit('tank_res', { tankInfo : logicObj.getTankInfo(ids)});
  });
  socket.on('tempCmd', function (data) {
    log.info('received new temp cmd val for: ' + data.id + ' val = ' + data.value);
  });
  socket.on('system', function (data) {
    //log.debug('system request: ' + util.inspect(data, {depth:null}));
    if (data.req) {
      if (data.req.includes('getAliveMap')) {
        io.sockets.emit('system', { aliveMap : ProcImg.getAliveMap()});
      }
      if (data.req.includes('getIoMap')) {
        var ioMap = {};
        var tmpMap = ProcImg.getIoMap();
        for (var unit in tmpMap) {
          ioMap[unit] = {};
          if (tmpMap[unit].out) {
            ioMap[unit].out = [parseInt(tmpMap[unit].out[7]), 
              parseInt(tmpMap[unit].out[6])];
          }
          if (tmpMap[unit].in) {
            ioMap[unit].in = [parseInt(tmpMap[unit].in[0]), 
              parseInt(tmpMap[unit].in[1])];
          }
        }
//        mu.po(ioMap);
        io.sockets.emit('system', { ioMap : ioMap});
      }
      if (data.req.includes('setOutput')) {
        log.debug('id=' + data.id + '.'+ data.offs + ' state=' + data.state);
        ProcImg.setOutput(data.id, data.offs, data.state);
      }
    }
  });
  socket.on('srvinfo_req', function () {
    //log.debug('received srvinfo_req');
    io.sockets.emit('srvinfo_res', { 
      info : {
        uptime : os.processUptime(), // [s]
        cpuload : os.loadavg(1),
        freemem : os.freemem(), // [MB]
        totalmem : os.totalmem(), // [MB]
        srvuptime : os.sysUptime() // [s]
      }
    });
  });
  socket.on('weather_req', function () {
    //log.debug('received weather_req');
    WeatherApp.getData(function(weatherData) {
      io.sockets.emit('weather_res', { 
        weatherData : weatherData
      });
    });
  });
});

// socket directly to debug namespace
var debugSocket;
io.of('/debug').on('connection', function (socket) {
  log.debug('debug connected');
  debugSocket = socket;
  socket.emit('logmsg', {text:'server connected'});
  socket.on('disconnect', function () {
    log.debug('debug disconnected');
    debugSocket = null;
  });
});

var onMsgData = function (idObj, data)  {
  if (debugSocket) {
    debugSocket.emit('logmsg', {idObj:idObj, data:data});
  }
}

var logicObj;
var procMsgObj;

module.exports = {
    setLogicObj : function (obj) {
      if (typeof(obj) !== 'object') {
        throw new Error('invalid type of object: ' + typeof(obj));
      }
      logicObj = obj;
    },
    setProcMsgObj : function (obj) {
      if (typeof(obj) !== 'object') {
        throw new Error('invalid type of object: ' + typeof(obj));
      }
      procMsgObj = obj;
    },
    getOutputStates : getOutputStates,
    onMsgData : onMsgData
}


