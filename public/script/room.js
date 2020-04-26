'use strict';
(function(exports) {
  var socket;
  var intervalId;
  $(document).ready(function(){
    socket = io.connect();
    socket.on('chat', function (data) {
    });
    // received output states
    socket.on('output_res', function (data) {
      var elem;
      if (data.circle) {
        for (var id in data.states) {
          elem = document.getElementById(id);
          if (elem) {
            if (data.states[id] && data.states[id].toString() === '1') {
              elem.style.backgroundColor = 'green';
            } else {
              elem.style.backgroundColor = '';
            }
          }
        } 
      } else if (data.delta) {
        for (var id in data.states) {
          elem = document.getElementById(id);
          if (elem) {
            if (data.states[id] && data.states[id].toString() === '1') {
              elem.style.fill = 'green';
            } else {
              elem.style.fill = 'white';
            }
          }
        } 
      }
    });
    socket.on('valve_res', function (data) {
      var elem;
      for (var id in data.valveMap) {
        elem = document.getElementById(id+'_output_circle');
        if (elem) {
          if (data.valveMap[id].state === 1) { // running ? 
            elem.style.backgroundColor = 'green';
          } else if (data.valveMap[id].state === 2) { // pending ?
            elem.style.backgroundColor = 'yellow';
          } else { // off ?
            elem.style.backgroundColor = 'white';
          }
        }
        elem = document.getElementById(id+'_remaining');
        if (elem) {
          elem.innerHTML = convertMs2HhMmSs( data.valveMap[id].remaining ); 
        }
        elem = document.getElementById(id+'_starttime');
        if (elem && data.valveMap[id].starttime !== '-') {
          elem.innerHTML = new Date( data.valveMap[id].starttime ).toLocaleTimeString('de-DE'); 
        } else {
          elem.innerHTML = '-';
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
    intervalId = setInterval(function () {
      updateAllLightOutputStates();
      updateAllShutterOutputStates();
      updateAllValveStates();
    }, 1000);
    updateAllLightOutputStates();
    updateAllShutterOutputStates();
    updateAllValveStates();
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
   * for valves */
  function updateAllValveStates () {
    var x = document.getElementsByClassName('valve_circle');
    var ids = [];
    // collect outputs we need info for 
    for (var i = 0; i < x.length; i++) {
      ids.push(x[i].id.split('_')[0]); // convert: 89.1_output_circle -> 89.1
    }
    // request info from server if necessary
    if (ids.length > 0) {
      socket.emit('valve_req', ids);
    }
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
  /**
   * for valve */
  function valveClick (id, state) {
      var tElem = document.getElementById(id+'_valvetime');
      var hh=0, mm=0, ms=0, value;
      if (tElem) {
        value = tElem.value;
        if (value === '') {
          console.log('no time for valve specified: ' + id);
        } else {
          hh = parseInt(value.split(':')[0]);
          mm = parseInt(value.split(':')[1]);
          ms = (hh*60 + mm)*60000;
           console.log('valve id=' + id + ' state= ' + state + ' runtime= ' + hh + ' hours ' + mm + ' minutes = ' + (hh*60 + mm)*60000 + ' ms' ); 
        }
      }
    socket.emit('ctrl', { id: id, state: state, runtime:ms, type:'valve'});
  }

  /**
   * @param ms {number} - e.g. 3660000 ms = 1h 1min
   * returns {string} - ' xx h yy min zz s'
   */
  function convertMs2HhMmSs (ms) {
    var hh=0, mm=0, rest=0, sumSec=0;
    if (ms) {
      sumSec = parseInt(ms / 1000); // e.g. 3660
      hh = parseInt (sumSec / 3600); // e.g. 1
      rest = parseInt (sumSec % 3600); // e.g. 60  
      mm = parseInt (rest / 60); // e.g. 1
      rest = parseInt (rest % 60); // e.g. 0  
    }
    return hh + 'h ' + mm + 'min ' + rest + 's';
  }
  window.onerror = function () {
    console.error('clear interval');
    clearInterval(intervalId);
  }
    
  exports.room = {
      lightClick : lightClick,
      receptClick : receptClick,
      valveClick : valveClick,
      shutterClick : shutterClick,
      convertMs2HhMmSs : convertMs2HhMmSs 
  }
})(this);
