/**
 * http://usejsdoc.org/
 */
var express = require('express')
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var util = require('util');
var path = require('path');

var conf = require('../config/appconfig.json');
var homeconf = require('./conf.js').home;
var procImg = require('./processimage.js');
var log = require('log4js').getLogger('server');
var msghlp = require('./msghlp.js');
var mu = require('./myutil.js');

var floors = {};
var rooms = {};
for (var floor in homeconf) {
  floors[floor] = homeconf[floor];
  for(var room in homeconf[floor]) {
    rooms[floor + '_' + room] = floor + '-' + room;
  }
}

server.listen(conf.SERVER.PORT);

app.set('view engine', 'pug');
app.get('/', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/index.pug'), 
     pugdata
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
    rooms : rooms} // for toc
  );
});
app.get('/floor', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/floor.pug'), 
      {rooms : rooms} // for toc
  );
});
app.get('/debug', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/debug.pug'), 
      {rooms : rooms} // for toc
  );
});
app.get('/system', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/system.pug'), 
     {aliveMap:procMsgObj.getAliveMap(), 
    rooms : rooms} // for toc
  );
});
app.use(express.static(conf.SERVER.DIR));

var getOutputStates = function (ids) {
  var outs = {};
  var adr;
  var i,l = ids.length;
  for (i = 0; i < l; i++) {
    adr = msghlp.str2IdOffs(ids[i]);
    outs[ ids[i] ] = procImg.getOutput(adr.id, adr.offs);
  }
  return outs;
}

var globalsocket;
io.sockets.on('connection', function (socket) {
  log.debug('client connected');
  globalsocket = socket;
  socket.emit('chat', { zeit: new Date(), text: 'Du bist nun mit dem Smarthome-Server verbunden!' });
  socket.on('ctrl', function (data) {
    log.debug('received: ' + util.inspect(data));
    if (data.type === 'light') {
      logicObj.switchLight(data.id, data.state);
    } else if (data.type === 'shutter') {
      logicObj.switchShutter(data.id, data.state);
    } else if (data.type === 'receptacle') {
      logicObj.switchReceptacle(data.id, data.state);
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
  socket.on('tempCmd', function (data) {
    log.info('received new temp cmd val for: ' + data.id + ' val = ' + data.value);
  });

});

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
    }
}

log.info('server is running at http://127.0.0.1:' + conf.SERVER.PORT + '/');
