/**
 * Process incoming and outgoing messages.
 */
var util = require('util');

module.exports = {
    cl : function (d) {
      console.log(d);
    },
    po : function (o) {
      console.log('type = ' + typeof(o) + '\r\n  content= ' + util.inspect(o, {depth:null}));
    },
    buf2HexStr : function (buf) {
      return util.format(buf); // <Buffer 00 01 02 04 10 20 40>
    }
}