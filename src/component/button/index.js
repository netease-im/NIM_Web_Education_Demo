/*
 * @Author: lduoduo 
 * @Date: 2018-01-18 14:44:51 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-27 22:05:46
 * button组件，调用方法
 * <Button title="设置" options={option} />
 * }
 * 
 * 注意：如果点击事件需要使用默认的，不要传click
 */
import React, { Component } from 'react';
import classNames from 'classnames';

export default class extends Component {
  render() {
    const { children, className, title, onClick, loading, disabled } = this.props;
    return (
      <button className={classNames('u-btn', className)} disabled={disabled?'disabled':''} onClick={onClick}>
        {loading && <i className="u-loading" />}
        {children}
      </button>
    );
  }
}
