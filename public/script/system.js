var socket;
var intervalId;
$(document).ready(function(){
    /*var */socket = io.connect();
    socket.on('chat', function (data) {
        console.log('chat received: ' + data);
    });
    socket.on('system', function (data) {
      if (data.aliveMap) { // received alive data?
        updateAliveTable(data.aliveMap);
      }
    });
    intervalId = setInterval(function () {
      console.log('request data');
      socket.emit('system', {req: 'getAliveMap'});
    }, 5000);
}).delegate('.ui-page', 'pagehide', function () {
  console.log('clear interval');
  clearInterval(intervalId);
});
function updateAliveTable (aliveMap) {
  var table = document.getElementById('aliveTable');
  var i = table.rows.length-1;
  for (; i > 0; i--) {
    table.deleteRow(i);
  }
  var row;
  for (var node in aliveMap) {
    row = table.insertRow(); // append row
    row.insertCell(0).innerHTML = node;
    var stateCell = row.insertCell(1);//.innerHTML = aliveMap[node].state;
    row.insertCell(2).innerHTML = aliveMap[node].cnt;
    row.insertCell(3).innerHTML = aliveMap[node].sw;
    row.insertCell(4).innerHTML = aliveMap[node].last_rx_time;
    if (aliveMap[node].state == 1) {
      stateCell.style.backgroundColor  = 'green';
    } else if (aliveMap[node].state == 2) {
      stateCell.style.backgroundColor  = 'yellow';
    } else {
      stateCell.style.backgroundColor  = 'red';
    }
  }
  document.getElementById('aliveCnt').innerHTML = Object.keys(aliveMap).length
  document.getElementById('dateAct').innerHTML = new Date().toLocaleTimeString();
};

