/*
 * @Author: lduoduo 
 * @Date: 2018-01-26 14:28:17 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-27 23:53:07
 * 网格布局组件
 */

import React, { Component } from 'react';
import classNames from 'classnames';

export default class extends Component {
  render() {
    const { children, className, span, onClick, spacing = false } = this.props;
    return (
      <div
        className={classNames(
          'u-grid-col',
          className,
          `flex-${span || 12}`,
          `${spacing ? 'spacing' : ''}`
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }
}
