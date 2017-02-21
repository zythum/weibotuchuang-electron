const { app, dialog, shell } = require('electron')
const request = require('request')
const { noop } = require('./utils')

const myVersion = 'v' + require('../package.json').version
const LAST_RELEASE_URL =
  'https://api.github.com/repos/zythum/weibotuchuang-electron/releases/latest'
const LAST_RELEASE_PAGE =
  'https://github.com/zythum/weibotuchuang-electron/releases'

const check = exports.check = quite => {
  request({
    url: LAST_RELEASE_URL,
    headers: {
      'User-Agent': 'weibotuchuang-electron',
      'Accept': 'application/vnd.github.v3+json'
    }
  }, (err, res, body) => {
    if (err || res.statusCode !== 200) return

    const release = JSON.parse(body)
    const version = release.tag_name

    if (version !== myVersion) {
      app.focus()
      dialog.showMessageBox({
        type: 'info',
        message: '发现最新版本 ' + version,
        detail: release.body,
        buttons: ['前往下载', '暂不下载'],
      }, res => {
        switch (res) {
          case 0: return shell.openExternal(LAST_RELEASE_PAGE)
        }
      })
      return
    }

    if (!quite) {
      app.focus()
      dialog.showMessageBox({
        type: 'info',
        message: '围脖是个好图床',
        detail: version + ' 已经是最新版本',
        buttons: ['知道了']
      })
    }
  })
}

let interval = null
exports.checkInterval = (quite) => {
  if (interval !== null) return
  check(quite)
  interval = setInterval(() => check(quite), 1000 * 60 * 60 * 2)
}

exports.stopCheckInterval = () => {
  clearInterval(interval)
  interval = null
}