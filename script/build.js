var packager = require('electron-packager')
packager({
  dir: './',
  'app-copyright': 'weibotuchuang.zythum.com',
  'arch': 'x64',
  'electronVersion': '1.6.0',
  'icon': './resource/icons/app.icns',
  'out': './app',
  'overwrite': true,
  'platform': 'darwin'
}, function done_callback (err, appPaths) {
  if (!err) {
    console.log('build success')
    console.log(appPaths)
  }
})