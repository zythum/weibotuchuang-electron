const { app, BrowserWindow } = require('electron')
const { noop } = require('./utils')

const SUCCESS_URL = 'http://tuchuang.weibo.com'
const WEIBO_LOGIN_URL = 'http://weibo.com/a/unlogin/loginmini'+
  '?lang=zh-cn&url=' + encodeURIComponent(SUCCESS_URL)

const cookieString = cookies => {
  return cookies.map(({name, value}) => `${name}=${value}`).join(';')
}

module.exports = (callback=noop) => {
  let win = new BrowserWindow({width: 551, height: 375, resizable: false})
  win.on('closed', () => win = null)

  const contents = win.webContents
  const session = contents.session
  session.clearStorageData(() => {
    contents.setUserAgent('Baiduspider')
    contents.on('will-navigate', (event, url) => {
      if (url.indexOf(SUCCESS_URL) === 0) {
        contents.session.cookies.get(
          {url : SUCCESS_URL },
          (err, cookies) => {
            if (win) win.close()
            callback(null, cookieString(cookies))
          }
        )
        event.preventDefault()
      }
    })
    contents.on('did-navigate', (event, url) => {
      if (url.indexOf('http://weibo.com/login.php') === 0) {
        contents.loadURL(WEIBO_LOGIN_URL)
      }
    })
    contents.on('dom-ready', event => {
      const url = contents.getURL()
      if (url.indexOf(WEIBO_LOGIN_URL) === 0) {
        contents.insertCSS(INSERT_CSS)
      }
    })
    contents.loadURL(WEIBO_LOGIN_URL)
  })
}

// 注入的CSS
const INSERT_CSS = `
  body {
    background: #FFFFFF!important;
  }
  .W_reg_header {
    display: none!important;
  }
  .topic_login_bd {
    margin: 0!important;
  }
  .topic_login_cont {
    margin: 0!important;
    padding: 25px!important;
    width: auto!important;
    box-shadow: none!important;
    border-radius: 0!important;
  }
  .layer_login_register {
    height: 160px!important;
    width: auto!important;
  }
  .layer_login_register .left {
    padding-right: 30px!important;
  }
  .layer_login_register .right {
    padding-right: 30px!important;
  }
  .Bv6_layer_menu_list {
    max-height: 180px!important;
    overflow: auto!important;
  }
`