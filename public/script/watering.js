'use strict';
(function(exports) {
  var socket;
  var intervalId;
  $(document).ready(function(){
    socket = io.connect();
    // received states/info
    
    socket.on('output_res', function (data) {
      if (data.circle) {
        for (var id in data.states) {
          mu.setStateColor4Elem(id, data.states[id]);
        }
      } 
    });
    socket.on('input_res', function (data) {
      // console.log(data.states[0]);
      // console.log(data.states[1]);
      // console.log(data.states[2]);
      if (data.circle) {
        data.states.forEach(function (obj) {
          mu.setStateColor4Elem(obj.htmlid, obj.state)
        }); 
      } 
    });
    socket.on('tank_res', function (data) {
      // console.log('got tank_res: ');
      // console.log(data);
      var elem;
      for (var id in data.tankInfo) {
        $('#'+ id+'_tank').val(data.tankInfo[id].level);
        $('#'+ id+'_actlvl').html(data.tankInfo[id].level.toString() + ' %');
        if (data.tankInfo[id].starttime !== '-') {
          $('#'+ id+'_starttime').html(
            new Date( data.tankInfo[id].starttime ).toLocaleTimeString('de-DE')
          ); 
        } else {
          $('#'+ id+'_starttime').html('-');
        }
        if (data.tankInfo[id].state === 1) { // running ? 
          $('#'+ id+'_output_circle').css('backgroundColor', 'green');
        } else { // off ?
          $('#'+ id+'_output_circle').css('backgroundColor', 'white');
        }
      } 
    });
    socket.on('pump_res', function (data) {
      // console.log('got pump_res: ');
      // console.log(data);
      for (var id in data.pumpInfo) {
        if (data.pumpInfo[id].opts.autoEnable) {
          $('#'+ id+'_autoEnable').addClass('w3-green');
          $('#'+ id+'_autoEnable').html('Einschaltautomatik ausschalten');
        } else {
          $('#'+ id+'_autoEnable').removeClass('w3-green');
          $('#'+ id+'_autoEnable').html('Einschaltautomatik einschalten');
        }
        mu.setStateColor4Elem(id+'_flow_circle', data.pumpInfo[id].flow);
        mu.setStateColor4Elem(id+'_pressure_circle', data.pumpInfo[id].pressure);
        mu.setStateColor4Elem(id+'_minlvl_circle', data.pumpInfo[id].min);
      } 
    });
    socket.on('valve_res', function (data) {
      var elem;
      for (var id in data.valveInfo) {
        elem = document.getElementById(id+'_output_circle');
        if (elem) {
          if (data.valveInfo[id].state === 1) { // running ? 
            elem.style.backgroundColor = 'green';
          } else if (data.valveInfo[id].state === 2) { // pending ?
            elem.style.backgroundColor = 'yellow';
          } else { // off ?
            elem.style.backgroundColor = 'white';
          }
        }
        elem = document.getElementById(id+'_remaining');
        if (elem) {
          elem.innerHTML = convertMs2HhMmSs( data.valveInfo[id].remaining ); 
        }
        elem = document.getElementById(id+'_starttime');
        if (elem && data.valveInfo[id].starttime !== '-') {
          elem.innerHTML = new Date( data.valveInfo[id].starttime ).toLocaleTimeString('de-DE'); 
        } else {
          elem.innerHTML = '-';
        }
      } 
    });
    intervalId = setInterval(function () {
      updateAllTankStates();
      updateAllPumpStates();
      updateAllValveStates();
    }, 1000);
    updateAllTankStates();
    updateAllPumpStates();
    updateAllValveStates();
  });
  
  function lvlCmdClick (id, state) {
    console.log('lvlCmd ' + id + ' ' + state );
    socket.emit('ctrl', { 
      id: id, 
      state: state, 
      cmdLvl: parseInt( $('#'+id+'_cmdlvl').val().split('%')[0] ), 
      type:'tanklvl'
    });
    updateAllTankStates();
  };

  function updateAllTankStates () {
    var x = document.getElementsByClassName('tank_meter');
    var ids = [];
    var end;
    for (var i = 0; i < x.length; i++) {
      // e.g. 'AUSSEN_Garten_Tank_tank' => 'AUSSEN_Garten_Tank'
      end = x[i].id.search(/_tank/g);
      ids.push(x[i].id.slice(0,end) ); 
    }
    // console.log(ids);
    socket.emit('tank_req', ids);
  }

  function updateAllPumpStates () {
    // easy search because of "special identifer class"
    var x = document.getElementsByClassName('pump');
    var ids = [];
    for (var i = 0; i < x.length; i++) {
      // e.g. 'AUSSEN_Garten_Pumpe2%container' => 'AUSSEN_Garten_Pumpe2'
      ids.push(x[i].id.split('%')[0] ); 
    }
    socket.emit('pump_req', ids);

    // request output seperate
    ids = [];
    $('.pumpOutput').each(function (i) {
      ids.push(this.id); 
    });
    socket.emit('output_req_c', ids);

    // // collect input id's
    // ids = [];
    // $('.pumpFlow').each(function (i) {
    //   ids.push({addr:this.id.split('_')[0], htmlid:this.id}); 
    // });
    // $('.pumpPress').each(function (i) {
    //   ids.push({addr:this.id.split('_')[0], htmlid:this.id}); 
    // });
    // $('.pumpMinLvl').each(function (i) {
    //   ids.push({addr:this.id.split('_')[0], htmlid:this.id}); 
    // });
    // socket.emit('input_req_c', ids);
  }

  function pumpClick(id, state) {
    socket.emit('ctrl', { id: id, state: state, type:'receptacle'});
  }
  function pumpOption(id, opts) {
    console.log('update pump opts. ID=' + id + ' opts=' + JSON.stringify(opts));
    if (opts && opts.autoEnable) {
      socket.emit('ctrlOpt', { id: id, opts: opts, type:'pump'});
    }
    updateAllPumpStates(); // trigger immediate update from server
  }

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
    updateAllValveStates();
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
    
  exports.watering = {
    lvlCmdClick : lvlCmdClick,
    pumpClick : pumpClick,
    pumpOption : pumpOption,
    updateAllPumpStates : updateAllPumpStates,
    valveClick : valveClick,
    convertMs2HhMmSs : convertMs2HhMmSs 
  }
})(this);
