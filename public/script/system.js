'use strict';
(function(exports) {
  var socket;
  var intervalId;
  var aliveMap;
  $(document).ready(function(){
    socket = io.connect();
    socket.on('system', function (data) {
      if (data.aliveMap) { // received alive data?
        aliveMap = data.aliveMap;
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
  /**
   * Keeps bit order.
   * e.g. 0x80 -> [1,0,0,0,0,0,0,0]
   * bit 0 -> [0]
   * bit 7 -> [7] */
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
  /**
   * Reverses bit order. e.g. 
   * 0xC0 -> [0,0,0,0,0,0,1,1]
   * bit 0 -> [7]
   * bit 7 -> [0] */
  function byte2BinArrayRev (num) {
    return byte2BinArray(num).reverse();
  };
  /**
   * concats byte arrays and keeps bit order. e.g.
   * [0xDE, 0x80] -> [ 1, 1, 0, 1, 1, 1, 1, 0, 1,0,0,0,0,0,0,0 ] */
  function byteArray2BinArray (byteArr) {
    var ret = [];
    byteArr.forEach(function (byte) {
      ret = ret.concat(byte2BinArray(byte));
    });
    return ret;
  };
  /**
   * concats byte arrays and reverses bit order. e.g.
   * [0xE0, 0xA] -> [ 0,0,0,0,0,1,1,1, 0,1,0,1,0,0,0,0,0] */
  function byteArray2BinArrayRev (byteArr) {
    var ret = [];
    byteArr.forEach(function (byte) {
      ret = ret.concat(byte2BinArrayRev(byte));
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
  function setOutput(id, offs, state) {
    console.log('setOutput id=' + id + '.' + offs + ' state=' +state);
    socket.emit('system', 
        {req: ['setOutput'], id: id, offs: offs, state: state});
  }
  function getButtonCodeColById (id, idx) {
    var idi = id+'\','+idx.toString();
    return '<th><button onmousedown="system.setOutput(\''+idi+',1)"'+
    ' onmouseup="system.setOutput(\''+idi+',0)" type="button">'+idx.toString()+'</button></th>';
  }
  function getButtonCodeColsById (id, cnt) {
    var ret = '';
    var i=0;
    var idi;
    for (; i < cnt; i++) {
      ret += getButtonCodeColById(id, i);
    }
    return ret;
  };
  
  function updateIoMap(ioMap) {
    const ioSubTable = {
        head : '<table class="noBorder"><thead><tr>',
        mid : '</tr></thead><tbody><tr>',
        foot : '</tr></tbody></table>'
    }
    const inSubTable = {
               head : '<table class="noBorder"><thead>'+
               '<tr><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th></tr></thead>'+
               '<tbody><tr>',
               foot : '</tr></tbody></table>'
           }
    var table = document.getElementById('aliveTable');
    var i = table.rows.length-1;
    for (; i > 0; i--) {

      // TODO: code .1 only for iu and pu. search more intelligent
      var aliveId = table.rows[i].cells[0].innerHTML; // without code
      var uId = aliveId + '.1';
      if (ioMap[uId] !== undefined) {
        switch (aliveMap[aliveId].type) {
        case 0x3:
          if (ioMap[uId].out) {
            table.rows[i].cells[5].innerHTML = ioSubTable.head
            + getButtonCodeColsById(uId, 16)
            + ioSubTable.mid
            + binArray2TableRow(byteArray2BinArray(ioMap[uId].out))
            + ioSubTable.foot;
          }
          break;
        case 0x4:
          if (ioMap[uId].out) {
            table.rows[i].cells[5].innerHTML = ioSubTable.head
            + getButtonCodeColsById(uId, 12)
            + ioSubTable.mid
            + binArray2TableRow(
                byteArray2BinArray(ioMap[uId].out).slice(0,12) // cut lsb
              )
            + ioSubTable.foot;
          }
          if (ioMap[uId].in) {
            //console.log(ioMap[uId].in[0]);
            table.rows[i].cells[6].innerHTML = inSubTable.head
            + binArray2TableRow(
                byteArray2BinArrayRev(ioMap[uId].in).slice(0,12) // cut msb
              )
            + inSubTable.foot;
          }
          break;
        default:
          console.error(aliveId + ' has unknown type: ' + aliveMap[aliveId].type);
        return;
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
      byte2BinArrayRev : byte2BinArrayRev,
      binArray2TableRow : binArray2TableRow,
      byteArray2BinArray : byteArray2BinArray,
      byteArray2BinArrayRev : byteArray2BinArrayRev,
      getButtonCodeColById : getButtonCodeColById,
      getButtonCodeColsById : getButtonCodeColsById,
      setOutput : setOutput
  }
})(this);

