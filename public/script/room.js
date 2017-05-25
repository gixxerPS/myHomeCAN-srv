var socket;
$(document).ready(function(){
    /*var */socket = io.connect();
    socket.on('chat', function (data) {
        console.log('chat received: ' + data);
    });
    // received output states
    socket.on('output_res', function (data) {
      if (data.circle) {
        for (var id in data.states) {
          if (data.states[id] && data.states[id].toString() === '1') {
            document.getElementById(id).style.backgroundColor = 'green';
          } else {
            document.getElementById(id).style.backgroundColor = '';
          }
        } 
      } else if (data.delta) {
        for (var id in data.states) {
          if (data.states[id] && data.states[id].toString() === '1') {
            document.getElementById(id).style.fill = 'green';
          } else {
            document.getElementById(id).style.fill = 'white';
          }
        } 
      }

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
    
    updateAllLightOutputStates();
});
function buttonClick (id) {
  socket.emit('ctrl', { id: id});
};
function sendNewTempCmdVal (id, value) {
  socket.emit('tempCmd', {id: id, value: value});
}
function lightClick (id, state) {
  console.log('light ' + id + ' ' + state );
  socket.emit('ctrl', { id: id, state: state, type:'light'});
  updateAllLightOutputStates();
};
function receptClick (id, state) {
  console.log('receptacle ' + id + ' ' + state );
  socket.emit('ctrl', { id: id, state: state, type:'receptacle'});
  updateAllLightOutputStates();
};
function shutterClick (id, state) {
  console.log('shutter ' + id + ' ' + state );
  socket.emit('ctrl', { id: id, state: state, type:'shutter'});
  updateAllShutterOutputStates();
};

/**
 * for lights and receptacles */
function updateAllLightOutputStates () {
  var x = document.getElementsByClassName('output_circle');
  var ids = [];
  // collect outputs we need info for 
  for (var i = 0; i < x.length; i++) {
    ids.push(x[i].id)
  }
  // request info from server
  socket.emit('output_req_c', ids);
}
/**
 * for shutter */
function updateAllShutterOutputStates () {
  var x = document.getElementsByClassName('output_delta');
  var ids = [];
  // collect outputs we need info for 
  for (var i = 0; i < x.length; i++) {
    ids.push(x[i].id)
  }
  // request info from server
  socket.emit('output_req_d', ids);
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
  console.log('rawId = ' + rawId);
  sendNewTempCmdVal(rawId, ev.target.value);
};
