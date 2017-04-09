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
var log = require('log4js').getLogger('server');

server.listen(conf.SERVER.PORT);


// test with template engine pug
app.set('view engine', 'pug');
app.get('/', function (req, res) {
  res.render(path.join(conf.SERVER.DIR,'views/index.pug'), 
      { title: 'Hey', message: 'Hello there!', 
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
      }
  );
})


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
});

log.info('server is running at http://127.0.0.1:' + conf.SERVER.PORT + '/');

