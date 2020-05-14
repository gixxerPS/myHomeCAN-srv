'use strict';
(function(exports) {
  var socket;
  var intervalId;
  $(document).ready(function(){
    socket = io.connect();
    // received states/info
    
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
    }, 1000);
    updateAllTankStates();
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

  window.onerror = function () {
    console.error('clear interval');
    clearInterval(intervalId);
  }
    
  exports.watering = {
    lvlCmdClick : lvlCmdClick
  }
})(this);
