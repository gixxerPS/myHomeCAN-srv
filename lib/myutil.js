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
    }
}