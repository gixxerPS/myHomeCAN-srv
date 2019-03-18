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
    },
    callCbIfFunctionWithArg : function (cb, arg) {
      if(typeof(cb) === 'function') {
        cb(arg);
      }
    },
    /**
     * Asynchronous for loop. Usage:
     * 
     * <pre>
     * asyncloop(numOfIterations, function(loop) {
     *   doSomethingWithLoopIdx(loop.iteration());
     *   loop.next();
     * }, function() {
     *   doSomethingWhenFinished();
     * });
     * </pre>
     * 
     * @param numIts {number} - number of iterations
     * @param func {function} - action in loop body
     * @param callback {function} - finished maybe use npm install async instead... could
     *          also be a private function
     */
    asyncloop : function(numIts, func, callback) {
      var idx = 0;
      var done = false;
      var loop = {
        next : function(arg) {
          if (done) {
            return;
          }
          if (idx < numIts) {
            idx++;
            func(loop);
          } else {
            done = true;
            callback(arg);
          }
        },
        iteration : function() {
          return idx - 1;
        },
        brk : function(err, res) {
          done = true;
          callback(err, res);
        }
      };
      loop.next();
      return loop;
    }
}