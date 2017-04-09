/**
 * Process incoming and outgoing messages.
 */
var util = require('util');

module.exports = {
    cl : function (d) {
      console.log(d);
    },
    po : function (o) {
      console.log(util.inspect(o, {depth:null}));
    }
}