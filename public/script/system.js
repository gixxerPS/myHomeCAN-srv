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
      //console.log('request data');
      socket.emit('system', {req: ['getAliveMap', 'getIoMap']});
    }, 1000);
  }).delegate('.ui-page', 'pagehide', function () {
    console.log('clear interval');
    clearInterval(intervalId);
  });
  
  function state2Color (state) {
    if (state == 1) {
      return 'green';
    } else if (state == 2) {
      return 'yellow';
    } else {
      return 'red';
    }
  }
  /***
   * | 0  | 1     | 2         | 3          | 4            | 5   | 6  |
   * | ID | state | alive-cnt | sw-version | last rx time | out | in | 
   */
  function updateAliveTable (aliveMap) {
    var table = document.getElementById('aliveTable');
    var rowCnt = table.rows.length;
    var row, i;
    Object.keys(aliveMap).forEach(function (node) {
      row = null;
      // find row for current node
      for (i = 0; i < rowCnt; i++) {
        if (table.rows[i].cells[0].innerHTML === node.toString()) {
          row = table.rows[i];
          break;
        }
      }
      // row found ?
      if (row) {
        // then update
        row.cells[1].style.backgroundColor = state2Color(aliveMap[node].state);
        row.cells[2].innerHTML = aliveMap[node].cnt;
        row.cells[3].innerHTML = aliveMap[node].sw;
        row.cells[4].innerHTML = aliveMap[node].last_rx_time;
      } else { // not yet existing -> insert
        row = table.insertRow(); // append row
        row.insertCell(0).innerHTML = node;
        row.insertCell(1).style.backgroundColor = state2Color(aliveMap[node].state);//.innerHTML = aliveMap[node].state;
        row.insertCell(2).innerHTML = aliveMap[node].cnt;
        row.insertCell(3).innerHTML = aliveMap[node].sw;
        row.insertCell(4).innerHTML = aliveMap[node].last_rx_time;
        createIoSubTableOutputs(aliveMap[node], node, row.insertCell(5));
        createIoSubTableInputs(aliveMap[node], node, row.insertCell(6));
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
  function createIoSubTableInputs(nodeObj, nodeId, cell) {
    switch (nodeObj.type) {
    case 0x3: // pu
		    // no inputs on pu
      break;
    case 0x4: // iu
      var iotable = document.createElement('table');
      iotable.setAttribute('class', 'noBorder');
      var thead = iotable.createTHead();
      var headRow = thead.insertRow();
		    var tbody = iotable.createTBody();
      var stateRow = tbody.insertRow(); // state row dummy
      stateRow.setAttribute('id', 'in'+nodeId);
      var i=0, th;
      for (; i < 12; i++){
        th = document.createElement('th');
        th.innerHTML = i.toString();
        headRow.appendChild(th);
        stateRow.insertCell(-1).appendChild(document.createTextNode('0'));
      }
      cell.appendChild(iotable);
      break;
    }
  };
  function createIoSubTableOutputs(nodeObj, nodeId, cell) {
      var iotable = document.createElement('table');
      iotable.setAttribute('class', 'noBorder');
      var btnRow = iotable.insertRow();
      var stateRow = iotable.insertRow(); // state row dummy
      stateRow.setAttribute('id', 'out'+nodeId);
      var btn, i=0, btnCell;
    switch (nodeObj.type) {
    case 0x3: // pu
      for (; i < 16; i++){
        btn = document.createElement('button');
        btn.appendChild(document.createTextNode(i.toString()));
        btn.setAttribute('onmousedown','system.setOutput(\''+nodeId+'.1\','+i.toString()+',1)');
        btn.setAttribute('onmouseup','system.setOutput(\''+nodeId+'.1\','+i.toString()+',0)');
        btnCell = btnRow.insertCell(i);
        btnCell.appendChild(btn);
        btnRow.appendChild(btnCell);
        stateRow.insertCell(-1).appendChild(document.createTextNode('0'));
      }
      cell.appendChild(iotable);
      break;
    case 0x4: // iu
      for (; i < 12; i++){
        btn = document.createElement('button');
        btn.appendChild(document.createTextNode(i.toString()));
        btn.setAttribute('onmousedown','system.setOutput(\''+nodeId+'.1\','+i.toString()+',1)');
        btn.setAttribute('onmouseup','system.setOutput(\''+nodeId+'.1\','+i.toString()+',0)');
        btnCell = btnRow.insertCell(i);
        btnCell.appendChild(btn);
        btnRow.appendChild(btnCell);
        stateRow.insertCell(-1).appendChild(document.createTextNode('0'));
      }
      cell.appendChild(iotable);
      break;
    }
  };
  function updateIoMap(ioMap) {
    var table = document.getElementById('aliveTable');
    var stateRow;
    var i = table.rows.length-1;
    for (; i > 0; i--) {

      var aliveId = table.rows[i].cells[0].innerHTML; // without code
      var uId = aliveId;
      if (ioMap[uId] !== undefined) {
        switch (aliveMap[aliveId].type) {
        case 0x3:
          if (ioMap[uId].out) {
		  stateRow = document.getElementById('out'+aliveId);
		  stateRow.innerHTML = binArray2TableRow(byteArray2BinArray(ioMap[uId].out));
          }
          break;
        case 0x4:
          if (ioMap[uId].out) {
		  stateRow = document.getElementById('out'+aliveId);
		  stateRow.innerHTML = binArray2TableRow(byteArray2BinArray(ioMap[uId].out));
          }
          if (ioMap[uId].in) {
		  stateRow = document.getElementById('in'+aliveId);
		  stateRow.innerHTML = binArray2TableRow(byteArray2BinArrayRev(ioMap[uId].in).slice(0,12)); // cut msb
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
      setOutput : setOutput
  }
})(this);

