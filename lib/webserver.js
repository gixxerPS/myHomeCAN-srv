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
var log = require('log4js').getLogger('server');

var floors = {};
var rooms = {};
for (var floor in homeconf) {
  floors[floor] = homeconf[floor];
  for(var room in homeconf[floor]) {
    rooms[floor + '_' + room] = floor + '-' + room;
  }
}

server.listen(conf.SERVER.PORT);

var pugdata = { title: 'Hey', message: 'Hello there!', 
    userPosts:[
      {id:'fdj', author:'ich' , title:'ttt'},
      {id:'sdf', author:'iich' , title:'wet'},
      {id:'hr', author:'iiich' , title:'utr'}
      ],
      outputs:[
        {idON:'out1ON', idOFF:'out1OFF', disp: 'Ausgang 1'},
        {idON:'out2ON', idOFF:'out2OFF', disp: 'Ausgang 2'},
        {idON:'out3ON', idOFF:'out3OFF', disp: 'Ausgang 3'}
        ]
  };
pugdata.rooms = rooms;

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
     pugdata
  );
});
app.get('/debug', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/debug.pug'), 
     pugdata
  );
});
app.use(express.static(conf.SERVER.DIR));

//app.get('/', function (req, res) {
//	res.sendFile( path.join(conf.SERVER.DIR, 'index.html'));
//});

var globalsocket;
io.sockets.on('connection', function (socket) {
	log.info('client connected');
	globalsocket = socket;
	socket.emit('chat', { zeit: new Date(), text: 'Du bist nun mit dem Smarthome-Server verbunden!' });
	// wenn ein Benutzer einen Text senden
	socket.on('chat', function (data) {
		log.info('received: ' + data);
		// so wird dieser Text an alle anderen Benutzer gesendet
		io.sockets.emit('chat', { zeit: new Date(), name: data.name || 'Anonym', text: data.text });
	});
	socket.on('ctrl', function (data) {
    log.info('received: ' + util.inspect(data));
  });
	 socket.on('tempCmd', function (data) {
	    log.info('received new temp cmd val: ' + data.value);
	  });
});

log.info('server is running at http://127.0.0.1:' + conf.SERVER.PORT + '/');

