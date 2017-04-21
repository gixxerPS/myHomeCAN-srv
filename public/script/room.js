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
    
    // connect update event to temperature sliders
    var x = document.getElementsByClassName('_cmd');
    for (var i = 0; i < x.length; i++) {
      x[i].addEventListener('input', updateTempCmdvals);
    }
    // ... and vice versa
    x = document.getElementsByClassName('_cmdshow');
    for (var i = 0; i < x.length; i++) {
      x[i].addEventListener('input', updateTempCmdvals);
    }
});
function buttonClick (id) {
  socket.emit('ctrl', { id: id});
};

function sendNewTempCmdVal (id, value) {
  socket.emit('tempCmd', {id: id, value: value});
}

/**
 * Search correct element and update value in input number.
 * Send new temp cmd val to server.
 * @param ev - input event object */
function updateTempCmdvals (ev) {
  // target id has same id with postfix '_cmdshow' instead of '_cmd'
  // sample: '4166cd8a-b1b5-4110-8199-bbd0dc574986_cmdshow'
  // with twin id: '4166cd8a-b1b5-4110-8199-bbd0dc574986_cmd'
  var splitIdArr = ev.target.id.split('_');
  var rawId = splitIdArr[0];
  var twinClass;
  if (splitIdArr[1] === 'cmd') {
    twinClass = '_cmdshow';
  } else {
    twinClass = '_cmd';
  }
  var targetId = rawId.concat(twinClass);
  var x = document.getElementsByClassName(twinClass);
  for (var i = 0; i < x.length; i++) {
    if (x[i].id === targetId) {
      x[i].value = ev.target.value;
    }
  }
  sendNewTempCmdVal(rawId, ev.target.value);
};
