/*
 * @Author: lduoduo 
 * @Date: 2018-02-02 00:15:52 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-02-02 00:22:36
 * 鼠标hover显示的tip
 */

import React, { Component } from 'react';
import classNames from 'classnames';

export default class extends Component {
  render() {
    const { children, className, title } = this.props;
    return (
      <div className={classNames('u-tooltip', className)}>
        {children}
        {title && <div className="u-tooltip-title">{title}</div>}
      </div>
    );
  }
}
