/**
 * stub io module for tests.
 * @param global
 * @param module
 * @returns
 */
'use strict';
(function (global, module) {

  module.exports = {
      connect : function () {
        return {
          emit : function () {},
          on : function () {}
        }
      }
  }

  if ('undefined' != typeof window) {
    window.io = module.exports;
  }

})(
    this
  , 'undefined' != typeof module ? module : {exports: {}}
);
