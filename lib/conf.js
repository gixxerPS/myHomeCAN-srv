/**
 * Process incoming and outgoing messages.
 */
var util = require('util');
var uuid = require('uuid').v4;

var homeconf = require('../config/homeconfig.json');
  
// create internal ids, string for each item
for (var floor in homeconf) {
  for(var room in homeconf[floor]) {
    for(var item in homeconf[floor][room]) {
    homeconf[floor][room][item].id = uuid();
    homeconf[floor][room][item].str = item;
    }
  }
}

console.log('parsed conf = ' + util.inspect(homeconf, {depth:null}));

module.exports = {
    home : homeconf
}