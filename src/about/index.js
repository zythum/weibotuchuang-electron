const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const markdown = require('markdown').markdown

const pkg = require('../../package.json')

let win = null
exports.show = () => {
  if (win) {
    win.show()
    return
  }

  const readmePath = path.resolve(app.getAppPath(), 'README.md')
  const readme = fs.readFileSync(readmePath, 'utf8')
  const css = fs.readFileSync(path.resolve(__dirname, 'markdown.css'))

  win = new BrowserWindow({width: 600, height: 600})
  win.on('closed', () =>  win = null)

  win.setTitle('关于' + pkg.productName)
  win.loadURL('about:blank')
  win.webContents.insertCSS(String(css))
  win.webContents.executeJavaScript(`
    (function () {
      document.body.innerHTML = \`${markdown.toHTML(String(readme))}\`
      var h1 = document.getElementsByTagName('h1')[0]
      var p = document.createElement('p')
      p.innerHTML = '当前版本: v${pkg.version}'
      h1.parentNode.insertBefore(p, h1.nextSibling)
    }())
  `)
}