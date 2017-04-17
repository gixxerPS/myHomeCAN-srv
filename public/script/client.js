var socket;
$(document).ready(function(){
    // WebSocket
    /*var */socket = io.connect();
    // neue Nachricht
    socket.on('chat', function (data) {
        var zeit = new Date(data.zeit);
        $('#log').append(
            $('<li></li>').append(
                // Uhrzeit
                $('<span>').text('[' +
                    (zeit.getHours() < 10 ? '0' + zeit.getHours() : zeit.getHours())
                    + ':' +
                    (zeit.getMinutes() < 10 ? '0' + zeit.getMinutes() : zeit.getMinutes())
                    + ':' +
                    (zeit.getSeconds() < 10 ? '0' + zeit.getSeconds() : zeit.getSeconds())
                    + ':' +
                    (zeit.getMilliseconds() < 10 ? '00' + zeit.getMilliseconds() : zeit.getMilliseconds())
                    + '] '
                ),
                // Name
                $('<b>').text(typeof(data.name) != 'undefined' ? data.name + ': ' : ''),
                // Text
                $('<span>').text(data.text))
        );
        // nach unten scrollen
        $('body').scrollTop($('body')[0].scrollHeight);
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
