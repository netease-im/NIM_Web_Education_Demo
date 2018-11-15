/*
 * @Author: lduoduo 
 * @Date: 2018-01-26 21:40:25 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-26 23:16:07
 * react 将组件挂载到指定dom上
 */

import React, { Component } from 'react';
import classNames from 'classnames';
import ReactDOM from 'react-dom';

export default function(InComponent, inProps, el, cb) {
  const props = inProps || {};
  const body = el || document.body;
  let div = document.createElement('div');

  body.appendChild(div);
  return ReactDOM.render(<InComponent {...props} />, div)
//   ReactDOM.render(<InComponent {...props} />, div, function(e) {
//     console.log('callback', e);
//     Valid.isFunction(cb) &&
//       cb({
//         component: e,
//         destroy: function() {
//           component = null;
//           body.removeChild(div);
//         }
//       });
//   });
}
