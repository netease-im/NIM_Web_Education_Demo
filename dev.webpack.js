const fs = require('fs')
const path = require('path')
const merge = require('webpack-merge')
const baseConfig = require('./base.webpack')

let resolve = subPath => { return path.resolve(__dirname, subPath || '') }

const devConfig = {
  mode: 'none',
  devtool: 'cheap-module-eval-source-map',
  watchOptions: {
    ignored: /node_modules/
  },
  devServer: {
    // hot: true, // 热加载
    compress: false,
    open: false,
    host: 'localhost',
    port: '8080',
    disableHostCheck: true,
    stats: { colors: true },
    filename: '[name].chunk.js',
    headers: { 'Access-Control-Allow-Origin': '*' },
    open: true,
    https: {
      key: fs.readFileSync(resolve('./ssh/key.pem')),
      cert: fs.readFileSync(resolve('./ssh/cert.crt')),
      ca: fs.readFileSync(resolve('./ssh/cert.pem'))
    }
  }
}

module.exports = merge(baseConfig, devConfig)
