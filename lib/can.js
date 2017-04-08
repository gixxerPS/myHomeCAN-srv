/**
 * http://usejsdoc.org/
 */
var can = require('socketcan');
var util = require('util');
var log = require('log4js').getLogger('server');

var channel = can.createRawChannel("can0", true);
channel.start();

//see example http://nodecode.de/chat-nodejs-websocket

//Log any message
channel.addListener("onMessage", function(msg) {
	if (globalsocket) {
		globalsocket.emit('chat', {zeit: new Date(), text: 'can nachricht empfangen: ' + msg.data.toString()});
	}
	//socket.emit('chat', { zeit: new Date(), text: 'Du bist nun mit dem Server verbunden!' });
	console.log(msg);
});
