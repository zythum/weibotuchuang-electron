const path = require('path')

exports.noop = () => {}

exports.resource = subPath => {
  return path.resolve(__dirname, '../resource', subPath)
}

exports.objectPath = (object, path) => {
  path = path.split('.')
  let key
  try {
    while (key = path.shift()) object = object[key]
    return object
  } catch (e) {
    return null
  }
}

// uuid
function S4 () {
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1)
}
exports.uuid = () => {
  // then to call it, plus stitch in '4' in the third group
  return 'u-' + (S4() + S4() + '-' + S4() + '-4' + S4().substr(0,3) +
    '-' + S4() + '-' + S4() + S4() + S4()).toLowerCase()
}

exports.textCut = (str, length=17) => {

  const pLength = parseInt(length / 2)
  const tLength = length - pLength

  return str.length <= length ? str :
    str.substring(0, pLength) + '...' + str.substring(str.length - tLength)
}

exports.asyncAll = (funcs, callback) => {
  let index = 0
  const results = []
  const next = (...result) => {
    results.push(result)
    if (++index < funcs.length) {
      funcs[index](next)
      return
    }
    callback(results)
  }
  funcs[index](next)
}

exports.dateFormat = (date, format) => {
  var o = {
    'M+': date.getMonth() + 1, //月份
    'd+': date.getDate(), //日
    'h+': date.getHours(), //小时
    'm+': date.getMinutes(), //分
    's+': date.getSeconds(), //秒
    'q+': Math.floor((date.getMonth() + 3) / 3), //季度
    'S': date.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(format)) {
    format = format
      .replace(RegExp.$1, (date.getFullYear() + '')
      .substr(4 - RegExp.$1.length))
  }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(format)) {
      format = format.replace(RegExp.$1,
        RegExp.$1.length == 1 ?
          o[k] : ('00' + o[k]).substr(('' + o[k]).length))
    }
  }
  return format;
}