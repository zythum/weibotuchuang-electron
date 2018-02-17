const {
  app, Menu, MenuItem, Tray,
  clipboard, nativeImage, dialog
} = require('electron')
const path = require('path')
const AutoLaunch = require('auto-launch')
const notify = require('./notification')
const about = require('./about')
const subscribe = require('./subscribe')
const uploader = require('./sinaimgUploader')
const imgParser = require('./sinaimgParser')
const weiboLogin = require('./weiboLogin')
const updater = require('./updater')
const storage = require('./storage')
const config = require('./config')

const { resource, asyncAll, textCut, dateFormat, noop } = require('./utils')


const appVersion = require('../package.json').version;


const fileMessageFormat = items => {
  const length = items.length
  const suffix = length > 1 ? `等 ${length} 张图片` : ''
  const name = textCut(items[0].name)
  return `${name} ${suffix}`
}

app.on('ready', init)

//这个不写会默认quite
app.on('window-all-closed', noop)
app.dock.hide()

let tray = null
function init () {
  tray = new Tray(resource('icons/menubar.png'))
  tray.on('drop-files', (event, filePaths) => {
    uploadFiles(filePaths.map(filePath => ({
      name: path.basename(filePath),
      buffer: null,
      filePath: filePath
    })))
  })
  subscribe.on('uploader_task_queue_change', count => {
    tray.setTitle(count ? '⇧' + count : '')
  })
  updateMenu()

  if (config.get('auto_update')) {
    updater.checkInterval(true)
  }
}

let uploading = false
function uploadFiles (files) {
  if (uploading) return
  const weiboCookies = storage.get('weibo_cookies')
  if (!weiboCookies) {
    app.focus()
    dialog.showMessageBox({
      type: 'info',
      message: '您还没有登陆围脖账号',
      detail: [
        '围脖图床是通过围脖来上传图片的，',
        '你需要通过使用您的围脖账号登陆来完成这这步操作'
      ].join('\n'),
      buttons: ['登陆微博', '取消'],
    }, res => {
      if (res !== 0) return
      weiboLogin((err, cookies) => {
        storage.set('weibo_cookies', cookies)
        updateMenu()
        doUpload(cookies, files)
      })
    })
  } else {
    doUpload(weiboCookies, files)
  }
}

function doUpload (cookies, files) {
  uploading = true
  asyncAll(files.map((file, index) => {
    return next => {
      subscribe.emit('uploader_task_queue_change', files.length - index)
      uploader(file, cookies, next)
    }
  }), uploadComplete)

  // 上传完成回调
  function uploadComplete (results) {
    subscribe.emit('uploader_task_queue_change', 0)
    uploading = false
    const urls = []
    const errorFiles = []
    const history = []

    for (let index = 0; index < results.length; index++) {
      const [err, pid] = results[index]
      const file = files[index]

      if (err !== null) {
        errorFiles.push(file)
        if (err === -1) {
          storage.remove('weibo_cookies')
          updateMenu()
          dialog.showMessageBox({
            type: 'info',
            message: '你的微博登陆凭证貌似已经过期',
            detail: [
              '围脖图床是通过围脖来上传图片的，',
              '你需要通过重新登陆微博之后再次上传您的图片'
            ].join('\n'),
            buttons: ['重新登陆微博', '取消'],
          }, res => {
            if (res !== 0) return
            weiboLogin((err, cookies) => {
              storage.set('weibo_cookies', cookies)
              updateMenu()
              doUpload(cookies, files)
            })
          })
          return
        }
        continue
      }

      // 获取url
      urls.push(imgParser(pid, 'large'))

      // 获取缩略图
      let image = file.filePath ?
        nativeImage.createFromPath(file.filePath) :
        nativeImage.createFromBuffer(file.buffer)
      image = image.resize({ width: 200 })
      history.push({
        date: Date.now(),
        name: file.name,
        base64: image.toDataURL(),
        pid: pid,
      })
    }

    // 写入剪贴板
    const writeClipboard = config.get('write_clipboard_when_uploaded')
    if (writeClipboard && urls.length) {
      if (config.get('copy_format_markdown')) {
        clipboard.writeText(history.map((his, index) => {
          return `![${his.name}](${urls[index]})`
        }).join('\n'))
      } else {
        clipboard.writeText(urls.join('\n'))
      }
    }

    // 写入历史
    if (history.length) {
      const historys = storage.get('historys') || []
      historys.unshift(history)
      if (historys.length >= 10) historys.length = 10
      storage.set({historys})
    }

    // 更新menu
    updateMenu()

    // 输入消息提示
    {
      let message = ''
      if (history.length) {
        message += fileMessageFormat(history) + '上传成功'
      }

      if (errorFiles.length) {
        message += ' '
        message += fileMessageFormat(errorFiles) + '上传失败'
      }

      let detail = history.length === 0 ? '' :
        writeClipboard ? '已写入剪贴板' : '点击写入剪贴板'

      notify( message, { body: detail }, () => {
        if (!writeClipboard && urls.length) {
          if (config.get('copy_format_markdown')) {
            clipboard.writeText(history.map((his, index) => {
              return `![${his.name}](${urls[index]})`
            }).join('\n'))
          } else {
            clipboard.writeText(urls.join('\n'))
          }
        }
      })
    }
  }
}

function updateMenu () {
  if (!tray) return
  const template = []
  { // 关于围脖图床
    template.push({
      label: '关于 围脖是个好图床',
      click () { about.show() }
    })
  }

  { // 检测更新
    template.push({
      label: '检测更新',
      click () { updater.check() }
    })
  }

  template.push({ type: 'separator' })

  { // 上传文件
    const options = {
      filters: [
        {name: 'Images', extensions: ['jpg', 'png', 'gif']}
      ],
      properties: ['openFile', 'multiSelections']
    }
    template.push({
      label: '上传图片',
      click () {
        dialog.showOpenDialog(options, filePaths => {
          if (!filePaths || filePaths.length === 0) return
          uploadFiles(filePaths.map(filePath => ({
            name: path.basename(filePath),
            buffer: null,
            filePath: filePath
          })))
        })
      }
    })
  }

  { // 从剪贴板上传
    template.push({
      label: '从剪贴板上传',
      click () {
        const format = clipboard.availableFormats()
        if (format.some(type => type.indexOf('image') >= 0)) {
          const image = clipboard.readImage()
          if (image.isEmpty()) return

          const text = clipboard.readText()
          uploadFiles([{
            name: text && text.length ? text : '从剪贴板上传的图片',
            buffer: image.toPNG(),
            filePath: null
          }])
        }
      }
    })
  }

  template.push({ type: 'separator' })

  { // 历史记录
    const historys = storage.get('historys') || []
    historys.forEach(history => {

      const imageMenuItems = history.map(his => {
        const url = imgParser(his.pid, 'large')
        const image = nativeImage.createFromDataURL(his.base64)
        const copy = () => {
          const key = 'copy_format_markdown'
          if (config.get(key)) {
            clipboard.writeText(`![${his.name}](${url})`)
            return
          }
          clipboard.writeText(url)
        }
        return { icon: image, click: copy }
      })

      template.push({
        label: fileMessageFormat(history),
        submenu: [
          {
            label: '上传于 ' +
              dateFormat(new Date(history[0]['date']), 'yyyy-MM-dd hh:mm:ss'),
            enabled: false
          }
        ]
        .concat(imageMenuItems)
        .concat([
          { type: 'separator' },
          {
            label: history.length > 1 ?
              '复制全部图片地址' : '复制图片地址',
            click () {
              clipboard.writeText(history.map(his => {
                return imgParser(his.pid, 'large')
              }).join('\n'))
            }
          },
          {
            label: history.length > 1 ?
              '复制全部图片 markdown 代码' : '复制图片 markdown 代码',
            click () {
              clipboard.writeText(history.map(his => {
                const url = imgParser(his.pid, 'large')
                return `![${his.name}](${url})`
              }).join('\n'))
            }
          }
        ])
      })
    })

    if (historys.length) {
      template.push({
        label: '清空历史记录',
        click () {
          storage.remove('historys')
          updateMenu()
        }
      })
    } else {
      template.push({
        label: '暂无历史记录',
        enabled: false
      })
    }
  }

  template.push({ type: 'separator' })

  { // 设置 - 是否上传后直接写入剪贴板
    const key = 'write_clipboard_when_uploaded'
    const value = config.get(key)
    template.push({
      type: 'checkbox',
      label: '上传成功直接写入剪贴板',
      checked: !!value,
      click () {
        config.set(key, !value)
        updateMenu()
      }
    })
  }
  { // 设置 - 剪贴板设置为 markdown 格式
    const key = 'copy_format_markdown'
    const value = config.get(key)
    template.push({
      type: 'checkbox',
      label: '写入剪贴板为 markdown 格式',
      checked: !!value,
      click () {
        config.set(key, !value)
        updateMenu()
      }
    })
  }
  { // 设置 - 登录时自动打开
    const key = 'launch_at_login'
    const value = config.get(key)
    template.push({
      type: 'checkbox',
      label: '登录时自动打开',
      checked: !!value,
      click () {
        config.set(key, !value)
        const autoLaunch = new AutoLaunch({
          name: '围脖是个好图床',
          path: path.resolve(process.execPath, '../../../'),
          mac: true,
          isHidden: true
        })
        if (!value) {
          autoLaunch.enable()
        } else {
          autoLaunch.disable()
        }
        updateMenu()
      }
    })
  }

  { // 设置 - 登录时自动打开
    const key = 'auto_update'
    const value = config.get(key)
    template.push({
      type: 'checkbox',
      label: '自动检测更新 (间隔两小时)',
      checked: !!value,
      click () {
        config.set(key, !value)
        if (value) {
          updater.stopCheckInterval()
        } else {
          updater.checkInterval(true)
        }
        updateMenu()
      }
    })
  }

  template.push({ type: 'separator' })

  { // 微博登陆状态
    const weiboCookies = storage.get('weibo_cookies')
    const label = weiboCookies ? '登出围脖 (围脖账号已登录)' : '登录围脖'
    template.push({
      label: label,
      click () {
        if (weiboCookies) {
          storage.remove('weibo_cookies')
          updateMenu()
          return
        }
        weiboLogin((err, cookies) => {
          storage.set('weibo_cookies', cookies)
          updateMenu()
          notify('微博已登陆成功!', { body: '上传图片请拖拽图片到菜单栏图片' })
        })
      }
    })
  }

  template.push({ type: 'separator' })

  { // 退出
    template.push({ label: '退出围脖是个好图床', role: 'quit' })
  }

  contextMenu = Menu.buildFromTemplate(template)
  tray.setContextMenu(contextMenu)
}