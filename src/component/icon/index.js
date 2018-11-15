/*
 * @Author: lduoduo 
 * @Date: 2018-01-18 14:44:51 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-28 16:08:37
 * icon组件，使用iconfont
 * <Icon active={active} />
 * }
 * 
 * 注意：如果点击事件需要使用默认的，不要传click
 */
import React, { Component } from 'react';
import classNames from 'classnames';

export default class extends Component {
  render() {
    const { children, className, onClick, disable, active } = this.props;
    return (
      <i
        className={classNames(
          'u-icon iconfont',
          className,
          `${active ? 'active' : ''}`
        )}
        disable={disable}
        onClick={onClick}
      >
        {children}
      </i>
    );
  }
}
