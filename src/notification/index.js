const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const { uuid } = require('../utils')

let window = null
const callbacks = {}

module.exports = function (title, opts, onClick) {

  if (window) {
    sendNotification(title, opts, onClick)
    return
  }

  window = new BrowserWindow({ show: false })
  window.loadURL('file://' + path.join(__dirname, '/notify.html'))
  window.on('ready-to-show', () => {
    sendNotification(title, opts, onClick)
  })

  ipcMain.on('display-notification-onclick', (event, uid) => {
    try { callbacks[uid].call(this) } catch (e) {}
  })
}

function sendNotification (title, opts, onClick) {
  var uid = uuid()
  if (onClick) callbacks[uid] = onClick
  window.webContents.send('display-notification', { title, opts, uid })
}