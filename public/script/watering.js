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
    
    intervalId = setInterval(function () {
      updateAllTankStates();
      updateAllPumpStates();
    }, 1000);
    updateAllTankStates();
    updateAllPumpStates()
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

  /**
   * for tanks */
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

  /**
   * for pumps */
  function updateAllPumpStates () {
    var ids = [];
    $('.pumpOutput').each(function (i) {
      ids.push(this.id); 
    });
    socket.emit('output_req_c', ids);

    // collect input id's
    ids = [];
    $('.pumpFlow').each(function (i) {
      ids.push({addr:this.id.split('_')[0], htmlid:this.id}); 
    });
    $('.pumpPress').each(function (i) {
      ids.push({addr:this.id.split('_')[0], htmlid:this.id}); 
    });
    $('.pumpMinLvl').each(function (i) {
      ids.push({addr:this.id.split('_')[0], htmlid:this.id}); 
    });
    socket.emit('input_req_c', ids);
  }

  function pumpClick(id, state) {
    socket.emit('ctrl', { id: id, state: state, type:'receptacle'});
  }

  window.onerror = function () {
    console.error('clear interval');
    clearInterval(intervalId);
  }
    
  exports.watering = {
    lvlCmdClick : lvlCmdClick,
    pumpClick : pumpClick,
    updateAllPumpStates : updateAllPumpStates
  }
})(this);
