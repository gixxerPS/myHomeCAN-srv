var socket;
$(document).ready(function(){

// https://plotly.com/
// mousewheel or two-finger scroll zooms the plot

// var trace1 = {
//   x:['2020-10-04', '2021-11-04', '2023-12-04'],
//   y: [90, 40, 60],
//   type: 'scatter'
// };
var x1 = [],y1 = [], i, L=1000;
for (i=0; i<L; i++) {
  x1.push(10*2*Math.PI/L*i);
  y1.push(x1[i] * Math.sin(x1[i]));
}
var trace1 = {
    x:x1, y: y1,
    type: 'scatter'
  };
var data = [trace1];

var layout = {
  title: 'Plotly test',
  showlegend: false
};

Plotly.newPlot('plotlytest', data, layout, {scrollZoom: true, responsive: true});


    // WebSocket
    socket = io.connect();
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
