import 'babel-polyfill'

import './assets/css/skin/iconfont.css'
import './assets/css/skin/base.css'
import './assets/css/skin/main.less'

import React from 'react'
import ReactDOM from 'react-dom'
import { renderRoutes } from 'react-router-config'
import { HashRouter } from 'react-router-dom'

import routes from './router'

ReactDOM.render(
  <HashRouter>
    {renderRoutes(routes)}
  </HashRouter>,
  document.getElementById('app')
)
