(function(exports) {
  'use strict';

  var socket;
  var intervalId;
  $(document).ready(function(){
    /*var */socket = io.connect();
    socket.on('system', function (data) {
      if (data.aliveMap) { // received alive data?
        updateAliveTable(data.aliveMap);
      }
      if (data.ioMap) {
        updateIoMap(data.ioMap);
      }
    });
    intervalId = setInterval(function () {
      console.log('request data');
      socket.emit('system', {req: ['getAliveMap', 'getIoMap']});
    }, 1000);
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
    Object.keys(aliveMap).sort().forEach(function (node) {
      row = table.insertRow(); // append row
      row.insertCell(0).innerHTML = node;
      var stateCell = row.insertCell(1);//.innerHTML = aliveMap[node].state;
      row.insertCell(2).innerHTML = aliveMap[node].cnt;
      row.insertCell(3).innerHTML = aliveMap[node].sw;
      row.insertCell(4).innerHTML = aliveMap[node].last_rx_time;
      row.insertCell(5).innerHTML = ''; // outputs
      row.insertCell(6).innerHTML = ''; // inputs
      if (aliveMap[node].state == 1) {
        stateCell.style.backgroundColor  = 'green';
      } else if (aliveMap[node].state == 2) {
        stateCell.style.backgroundColor  = 'yellow';
      } else {
        stateCell.style.backgroundColor  = 'red';
      }
    });
    document.getElementById('aliveCnt').innerHTML = Object.keys(aliveMap).length
    document.getElementById('dateAct').innerHTML = new Date().toLocaleTimeString();
  };

  function byte2BinArray (num) {
    var mask;
    var ret=[];
    for (mask = 0x80; mask > 0; mask=mask>>1) {
      if (num & mask) {
        ret.push(1);
      } else {
        ret.push(0);
      }
    }
    return ret;
  };
  function byteArray2BinArray (byteArr) {
    var ret = [];
    byteArr.forEach(function (byte) {
      ret = ret.concat(byte2BinArray(byte));
    });
    return ret;
  };
  const colOpen = '<td>';
  const colClose = '</td>';
  function binArray2TableRow (binArr) {
    var ret = '';
    binArr.forEach(function(binVal){
      ret += colOpen + binVal.toString() + colClose;
    });
    return ret;
  };
  function updateIoMap(ioMap) {
    const ioSubTable = {
        head : '<table class="noBorder"><thead>'+
        '<tr><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th><th>12</th><th>13</th><th>14</th><th>15</th></tr></thead>'+
        '<tbody><tr>',
        foot : '</tr></tbody></table>'
    }
    var table = document.getElementById('aliveTable');
    var i = table.rows.length-1;
    for (; i > 0; i--) {

      // TODO: code .1 only for iu and pu. search more intelligent
      var uId = table.rows[i].cells[0].innerHTML + '.1';
      if (ioMap[uId] !== undefined) {
        if (ioMap[uId].out) {
          table.rows[i].cells[5].innerHTML = ioSubTable.head
          + binArray2TableRow(byteArray2BinArray(ioMap[uId].out))
          + ioSubTable.foot;
        }
        if (ioMap[uId].in) {
          table.rows[i].cells[6].innerHTML = ioSubTable.head
          + binArray2TableRow(byteArray2BinArray(ioMap[uId].in))
          + ioSubTable.foot;
        }
      }
    }
  }
  window.onerror = function () {
    console.error('clear interval');
    clearInterval(intervalId);
  }
  exports.system = {
      byte2BinArray : byte2BinArray,
      binArray2TableRow : binArray2TableRow,
      byteArray2BinArray : byteArray2BinArray
  }
})(this);
