/*
 * @Author: lduoduo 
 * @Date: 2018-01-26 14:21:48 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-03-09 13:53:05
 * 输入框的样式
 */

import React, { Component } from "react";
import classNames from "classnames";

export default class extends Component {
  render() {
    const {
      children,
      className,
      onChange,
      onBlur,
      onFocus,
      onKeyDown,
      placeholder,
      value,
      type,
      name,
      domRef,
      maxLength,
      accept,
      multiple,
    } = this.props;
    return (
      <input
        name={name}
        className={classNames("u-input", className)}
        type={type}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        value={value}
        ref={domRef}
        maxLength={maxLength}
        accept={accept}
        multiple={multiple}
      />
    );
  }
}
