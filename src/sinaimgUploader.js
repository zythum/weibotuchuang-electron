const fs = require('fs')
const path = require('path')
const request = require('request')
const imgParser = require('./sinaimgParser')

const { objectPath, noop } = require('./utils')

const SINAIMG_UPLOAD_URL_URL = ''+
  'http://picupload.service.weibo.com'+
  '/interface/pic_upload.php'+
  '?mime=image%2Fjpeg&markpos=1&logo=&nick=0&marks=1&app=miniblog'

module.exports = (file, cookies, callback=noop) => {
  const options = {
    url: SINAIMG_UPLOAD_URL_URL,
    method: 'post',
    headers: { 'Cookie': cookies },
    formData: {
      pic1: {
        value: file.buffer || fs.createReadStream(file.filePath),
        options: {
          filename: file.name,
          contentType: 'image/png'
        }
      }
    }
  }

  request(options, (err, httpResponse, body) => {
    if (err) return console.log('got error: ', err)
    const json = JSON.parse(body.split('\n')[2])
    callback(null, objectPath(json, 'data.pics.pic_1.pid'))
  })
}