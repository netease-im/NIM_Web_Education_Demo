const WebPackHook = require('./scripts/plugin')
const fse = require('fs-extra')
const path = require('path')
const merge = require('webpack-merge')
const baseConfig = require('./base.webpack')

let resolve = subPath => { return path.resolve(__dirname, subPath || '') }

const prodConfig = {
  mode: 'production',
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxAsyncRequests: 5, // 最大异步请求数， 默认5
      maxInitialRequests: 3, // 最大初始化请求书，默认3
      automaticNameDelimiter: '~' // 打包分隔符
    }
  },
  plugins: [
    new WebPackHook({
      beforeRun: compiler => {
        console.log('\n empty dist directory begin')
        fse.emptyDirSync(path.resolve('./dist'))
        fse.emptyDirSync(path.resolve('./.cache'))
        console.log('\n empty dist directory done')
      },
      run: compiler => {
        console.log('\n copy ing ......')
        let srcFolder = resolve('./sdk')
        let destFolder = resolve('./dist/sdk/')
        fse.copy(srcFolder, destFolder, {}, err => {
          if (err) {
            return console.error(err)
          }
          console.log(`\n ${srcFolder} => ${destFolder}`)
        })
      }
    })
  ]
}
module.exports = merge(baseConfig, prodConfig)
