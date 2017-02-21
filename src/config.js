const storage = require('./storage')

const configs = storage.get('configs') || {}

const DEFAULT_CONFIGS = {
  'write_clipboard_when_uploaded': true,
  'copy_format_markdown': false,
  'launch_at_login': false,
  'auto_update': true
}

for (let key in DEFAULT_CONFIGS) {
  const defaultValue = DEFAULT_CONFIGS[key]
  if (configs[key] === undefined) configs[key] = defaultValue
}

exports.get = key => configs[key]

exports.set = (key, value) => {
  if (typeof key === 'object') {
    Object.assign(configs, key)
  } else {
    configs[key] = value
  }
  storage.set({configs})
}