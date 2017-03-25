var conf = require('./config.json');
var express = require('express')
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var can = require('socketcan');
var util = require('util');

var channel = can.createRawChannel("can0", true);
channel.start();



// see example http://nodecode.de/chat-nodejs-websocket

// Webserver
// auf den Port x schalten
server.listen(conf.port);

app.use(express.static(__dirname + '/public'));

// wenn der Pfad / aufgerufen wird
app.get('/', function (req, res) {
        // so wird die Datei index.html ausgegeben
        res.sendfile(__dirname + '/public/index.html');
});

// Websocket
var globalsocket;
io.sockets.on('connection', function (socket) {
  console.log('client connected');
        // der Client ist verbunden
        globalsocket = socket;
        socket.emit('chat', { zeit: new Date(), text: 'Du bist nun mit dem Smarthome-Server verbunden!' });
        // wenn ein Benutzer einen Text senden
        socket.on('chat', function (data) {
                console.log('received: ' + data);
                // so wird dieser Text an alle anderen Benutzer gesendet
                io.sockets.emit('chat', { zeit: new Date(), name: data.name || 'Anonym', text: data.text });
        });
});

// Log any message
channel.addListener("onMessage", function(msg) {
  if (globalsocket) {
    globalsocket.emit('chat', {zeit: new Date(), text: 'can nachricht empfangen: ' + msg.data.toString()});
  }
  //socket.emit('chat', { zeit: new Date(), text: 'Du bist nun mit dem Server verbunden!' });
  console.log(msg);
});

// Portnummer in die Konsole schreiben
console.log('Der Server läuft nun unter http://127.0.0.1:' + conf.port + '/');
                                                                                                                                                                                                                            53,1          Bot
