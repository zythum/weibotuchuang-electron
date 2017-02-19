const path = require('path')
const fs = require('fs')
const packager = require('electron-packager')

const archiver = require('archiver')
const appdmg = require('appdmg')

const pkg = require('../package.json')

packager({
  'dir': './',
  'app-copyright': 'weibotuchuang.zythum.com',
  'arch': 'x64',
  'electronVersion': '1.6.0',
  'icon': './resource/icons/app.icns',
  'out': './app',
  'overwrite': true,
  'platform': 'darwin',
  'ignore': [
    /\.git$/,
    /^\/\.tuchuang-st$/,
    /^\/\.gitignore$/,
    /^\/app\//
  ]
}, function done_callback (err, appPaths) {
  if (err) return console.log(err)
  console.log('build success')

  const appPath = appPaths[0]
  const appName = `${pkg.productName}.app`
  const zipName = `${pkg.productName}.zip`
  const dmgName = `${pkg.productName}.dmg`

  // 打 zip 包
  const archive = archiver.create('zip', {});
  const output = fs.createWriteStream(path.resolve(appPath, zipName))
  archive.pipe(output)
  archive.directory(path.resolve(appPath, appName), appName)
  archive.finalize()

  // 打 dmg 包
  appdmg({
    target: path.resolve(appPath, dmgName),
    basepath: process.cwd(),
    specification: {
      title: pkg.productName,
      window: { size: { width: 450, height: 130 } },
      contents: [
        {x: 348, y: 90, type: 'link', path: '/Applications'},
        {x:  92, y: 90, type: 'file', path: path.resolve(appPath, appName) }
      ]
    }
  })
})