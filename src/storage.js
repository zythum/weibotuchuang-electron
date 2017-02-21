const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const rimraf = require('rimraf')
const homedir = require('os').homedir()

const CONFIG_FILE_PATH = path.resolve(homedir, '.weibotuchuang')
const CONFIG_SECRET = '今天天气不错'

const storage = {}

try {
  const stat = fs.lstatSync(CONFIG_FILE_PATH)
  if (!stat.isFile()) rimraf.sync(CONFIG_FILE_PATH)
} catch (e) {}

try {
  Object.assign(
    storage,
    JSON.parse(decode(String(fs.readFileSync(CONFIG_FILE_PATH))))
  )
} catch (e) {}

const sync = exports.sync = () => {
  fs.writeFileSync(CONFIG_FILE_PATH, encode(JSON.stringify(storage)))
}

exports.get = key => storage[key]

exports.getObject = () => storage

exports.set = (key, value) => {
  if (typeof key === 'object') {
    Object.assign(storage, key)
  } else {
    storage[key] = value
  }
  sync()
}
exports.remove = key => {
  delete storage[key]
  sync()
}

function encode (str) {
  var cipher = crypto.createCipher('aes192', CONFIG_SECRET)
  var enc = cipher.update(str, 'utf8', 'hex')
  return enc + cipher.final('hex')
}

function decode (str) {
  var decipher = crypto.createDecipher('aes192', CONFIG_SECRET)
  var dec = decipher.update(str, 'hex', 'utf8')
  return dec + decipher.final('utf8')
}