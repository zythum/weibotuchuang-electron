const { app, BrowserWindow } = require('electron')
const { URL } = require('url')
const { noop, md5 } = require('./utils')

const WEIBO_BASE = 'https://weibo.com'
const SUCCESS_URL = '/aj/static/weibo_is_a_good_image_bed.html'
const LOGIN_URL = '/aj/static/upimgback.html'

const cookieString = cookies => {
  return cookies.map(({name, value}) => `${name}=${value}`).join(';')
}

const callbacks = []

let win
module.exports = (callback=noop) => {

  callbacks.push(callback)

  if (win) {
    win.show()
    return
  }

  win = new BrowserWindow({
    width: 400,
    height: 400,
    resizable: false,
    backgroundColor: '#ffffff',
    fullscreen: false,
    fullscreenable: false,
    titleBarStyle: 'hidden',
  })
  win.on('closed', () => win = null)

  const contents = win.webContents
  const session = contents.session

  contents.on('did-navigate', (event, url) => {
    const urlObj = new URL(url)
    if (urlObj.pathname === SUCCESS_URL) {
      contents.session.cookies.get({ url }, (err, cookies) => {
        if (win) win.close()
        let callback
        while (callback = callbacks.shift()) {
          callback(null, cookieString(cookies))
        }
      })
      event.preventDefault()
    }
  })
  contents.on('dom-ready', event => {
    const urlObj = new URL(contents.getURL())
    if (urlObj.pathname === LOGIN_URL) {
      contents.insertCSS(INSERT_CSS)
      contents.executeJavaScript(EXECUTE_JAVASCRIPT)
    }
  })

  session.clearStorageData(() => {
    contents.setUserAgent('Baiduspider')
    contents.loadURL(WEIBO_BASE + LOGIN_URL)
  })
}

// 注入的CSS
const INSERT_CSS = `
  html {
    width: 100%;
    height: 100%;
  }
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: #FFFFFF;
    font-family: arial, sans-serif;
  }
  .dragbar {
    height: 32px;
    -webkit-app-region: drag;
    position: relative;
    z-index: 99999;
  }
  .help {
    position: absolute;
    top: 50%;
    left: 50%;
    white-space: nowrap;
    transform: translate(-50%, -50%);
  }
  .help a {
    text-decoration: none;
  }
  .Bv6_layer {
    position: fixed;
    padding-top: 20px;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #FFFFFF;
  }
  .Bv6_layer .layer_login_register_v2 {
    margin: 0 auto;
    padding-top: 20px;
    padding-left: 0;
    padding-right: 0;
  }
  .Bv6_layer .content {
    border-top: none!important;
  }
  .Bv6_layer .W_layer_close,
  .Bv6_layer .W_layer_title,
  .Bv6_layer .layer_login_register_v2 > img,
  .Bv6_layer .layer_login_register_v2 .qrcode_con_hover .bg {
    display: none;
  }
`

const EXECUTE_JAVASCRIPT = `;(function () {
  var help = document.createElement('div')
  help.className = 'help'
  help.innerHTML = '微博登陆组件加载中...'
  help.onclick = doLogin
  document.body.insertBefore(help, document.body.firstChild)

  var dragbar = document.createElement('div')
  dragbar.className = 'dragbar'
  document.body.insertBefore(dragbar, document.body.firstChild)

  var script = document.createElement('script');
  var version = '?version=d7a77880fa9c5f84';
  script.src = '//'+
    /* host  */ 'js.t.sinajs.cn'+
    /* path  */ '/t5/register/js/page/remote/'+
    /* file  */ 'loginLayer.js' +
    /* query */ version;
  script.charset = 'utf-8';
  document.body.appendChild(script);

  var intervalDelay = 100;
  setTimeout(function loop () {
    if (window.WBtopGlobal_loginLayer) return doLogin();
    setTimeout(loop, intervalDelay);
  }, intervalDelay);

  function doLogin () {
    window.WBtopGlobal_loginLayer({
      loginSuccessUrl: '${WEIBO_BASE + SUCCESS_URL}'
    });
    setTimeout(function () {
      help.innerHTML = '<a href="javascropt:;">点击我，完成微博登陆</a>';
    }, 1000);
  }
}());`