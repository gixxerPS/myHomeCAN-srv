/**
 * http://usejsdoc.org/
 */
module.exports = {
    units : {
      master : 0x1,
      sensor : 0x2,
      power  : 0x3,
      itf    : 0x4
    },
    header : '000000',
    footer : {
      pu : '000000000000000000000000000000000000000000000000',
      iu : '0000000000000000000000000000000000000000000000000000'
    },
    aliveCode: '000'
}