const { BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

let win = null
exports.show = () => {
  if (win) {
    win.show()
    return
  }
  win = new BrowserWindow({width: 600, height: 600})
  win.on('closed', () =>  win = null)

  win.loadURL(url.format({
    pathname: path.join(__dirname, 'about.html'),
    protocol: 'file:',
    slashes: true
  }))
}