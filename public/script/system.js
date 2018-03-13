var socket;
$(document).ready(function(){
    /*var */socket = io.connect();
    socket.on('chat', function (data) {
        console.log('chat received: ' + data);
    });
//    var intervalId = setInterval(function () {
//      
//    });
});
function buttonClick (id) {
  socket.emit('ctrl', { id: id});
};

