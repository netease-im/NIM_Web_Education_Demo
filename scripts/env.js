/*
 * @Author: andyzou
 * @Date: 2018-08-26 17:39:36
 * @Last Modified by: andyzou
 * @Last Modified time: 2018-09-13 14:49:56
 */

const Config = {
  'development': {
    appkey: 'a24e6c8a956a128bd50bdffe69b405ff',
    url: 'https://apptest.netease.im',
    resourceUrl: 'https://yx-web-nosdn.netease.im/webdoc/h5', // 表情、贴图、猜拳消息显示图片前缀
    emojiBaseUrl: 'https://yx-web-nosdn.netease.im/webdoc/h5/emoji'
  },
  'pre-production': {
    appkey: '1ee5a51b7d008254cd73b1d4369a9494',
    url: 'https://app.netease.im',
    resourceUrl: 'https://yx-web-nosdn.netease.im/webdoc/h5', // 表情、贴图、猜拳消息显示图片前缀
    emojiBaseUrl: 'https://yx-web-nosdn.netease.im/webdoc/h5/emoji'
  },
  'production': {
    appkey: '1ee5a51b7d008254cd73b1d4369a9494',
    url: 'https://app.netease.im',
    resourceUrl: 'https://yx-web-nosdn.netease.im/webdoc/h5', // 表情、贴图、猜拳消息显示图片前缀
    emojiBaseUrl: 'https://yx-web-nosdn.netease.im/webdoc/h5/emoji'
  }
}

const fse = require('fs-extra')
const path = require('path')

const env = process.env.NODE_ENV || 'development'

const contentDist = path.join(__dirname, `../src/env.js`)

fse.outputFileSync(contentDist, `export default ${JSON.stringify(Config[env])}`)
