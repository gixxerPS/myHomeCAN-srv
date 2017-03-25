$(document).ready(function(){
    // WebSocket
    var socket = io.connect();
    // neue Nachricht
    socket.on('chat', function (data) {
        var zeit = new Date(data.zeit);
        $('#content').append(
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
    // Nachricht senden
    function senden(){
        // Eingabefelder auslesen
        var name = $('#name').val();
        var text = $('#text').val();
        // Socket senden
        socket.emit('chat', { name: name, text: text });
        // Text-Eingabe leeren
        $('#text').val('');
    }
    // bei einem Klick
    $('#senden').click(senden);
    // oder mit der Enter-Taste
    $('#text').keypress(function (e) {
        if (e.which == 13) {
            senden();
        }
    });
});
