/*
 * @Author: lduoduo 
 * @Date: 2018-01-26 14:21:48 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-27 16:16:12
 * 文本框框的样式
 */

import React, { Component } from 'react';
import classNames from 'classnames';

export default class extends Component {
  render() {
    const { children, className, onChange, onBlur, onKeyDown, placeholder,value } = this.props;
    return (
      <textarea
        className={classNames('u-textarea', className)}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        value={value}
      >
      </textarea>
    );
  }
}
