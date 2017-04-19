var socket;
$(document).ready(function(){
    // WebSocket
    /*var */socket = io.connect();
    // neue Nachricht
    socket.on('chat', function (data) {
        
    });
    
    $('#lichtAn').click(function() {
      socket.emit('ctrl', { name: 'licht_EG_Flur', state: 1});
    });
    $('#lichtAus').click(function () {
      socket.emit('ctrl', { name: 'licht_EG_Flur', state: 0});
    });
});
function buttonClick (id) {
  socket.emit('ctrl', { id: id});
};
