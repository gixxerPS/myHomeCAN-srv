'use strict';
(function(exports) {
  var socket;
  $(document).ready(function(){
    socket = io.connect('/debug');
    socket.on('logmsg', function (data) {
      if (data.text) {
        $('#log').append($('<li>').text(data.text));
      }
      console.log(data)
      if (data.idObj) {
        $('#log').append(
            $('<li></li>').append(
                $('<span>').text('RX <= id=' + data.idObj 
                    + ' outputs: ' + (data.msg))
            )
        );
      }
      $('body').scrollTop($('body')[0].scrollHeight);
    });
  });
  exports.debug = {
  }
})(this);
function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
function accordionToggle(id) {
  var x = document.getElementById(id);
  if (x.className.indexOf("w3-show") == -1) {
    x.className += " w3-show";
    x.previousElementSibling.className = 
    x.previousElementSibling.className.replace("w3-pale-blue", "w3-blue");
  } else { 
    x.className = x.className.replace(" w3-show", "");
    x.previousElementSibling.className = 
    x.previousElementSibling.className.replace("w3-blue", "w3-pale-blue");
  }
}