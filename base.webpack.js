const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HappyPack = require('happypack')
const os = require('os')
const HappyThreadPool = HappyPack.ThreadPool({size: os.cpus().length - 1})

let resolve = subPath => { return path.resolve(__dirname, subPath || '') }

const ruleOfReact = {
  test: /\.(js|jsx)?$/,
  loader: 'babel-loader',
  include: resolve('src/'),
  query: {
    babelrc: false,
    presets: [
      'react',
      'env'
    ],
    plugins: [
      'transform-decorators-legacy',
      'transform-class-properties',
      'transform-object-rest-spread'
    ]
  }
}

module.exports = {
  entry: './src/index.jsx',
  output: {
    filename: '[name].[hash:8].js',
    path: resolve('./dist')
  },
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    modules: [resolve('node_modules')],
    alias: {
      '@': resolve('./src'),
      'component': resolve('./src/component'),
      'layout': resolve('./src/component/layout'),
      'module': resolve('./src/module'),
      'pages': resolve('./src/pages'),
      'test': resolve('./test'),
      'util': resolve('./src/util'),
      'assets': resolve('./src/assets'),
      'images': resolve('./src/assets/images'),
      'store': resolve('./src/store'),
      'sdk': resolve('./src/sdk'),
      'ext': resolve('./src/ext'),
      'config': resolve('./src/config')
    }
  },
  performance: { hints: false },
  module: {
    rules: [
      {
        test: ruleOfReact.test,
        loader: 'happypack/loader',
        query: { id: 'babel' },
        include: ruleOfReact.include
      },
      {
        test: /\.css$/,
        include: resolve('./src/assets/css'),
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        test: /\.less$/,
        include: resolve('./src/assets/css'),
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'less-loader'
        ]
      },
      {
        test: /\.(jpeg|jpg|png|gif|svg)$/,
        include: resolve('./src/assets/images'),
        use: {
          loader: 'url-loader',
          options: {
            limit: 10240,
            name: 'images/[name]-[hash:8].[ext]'
          }
        }
      },
      {
        test: /\.(woff|woff2|ttf|eot|png|jpg|jpeg|gif|svg)(\?v=\d+\.\d+\.\d+)?$/i,
        include: resolve('src/assets/iconfont'),
        use: {
          loader: 'url-loader',
          options: {
            limit: 10240,
            name: 'font/[name]-[hash:8].[ext]'
          }
        }
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
    }),
    new ProgressBarPlugin(),
    new HappyPack({
      id: 'babel',
      threadPool: HappyThreadPool,
      loaders: [ruleOfReact]
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: resolve('index.html'),
      inject: 'true'
    })
  ]
}
