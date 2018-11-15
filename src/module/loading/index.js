/*
 * @Author: lduoduo 
 * @Date: 2018-01-31 23:19:19 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-31 23:28:41
 * 路由切换的loading展示
 */

import React, { Component } from 'react';
import { Mask } from 'component';

export default class extends Component {
  render() {
    const { body, isHtml } = this.props;
    return (
      <div className="u-alert-wrapper">
        <Mask visible={true} />
        <section className="u-alert">
          {body && (
            <div className="u-alert-body">
              <i className="u-loading" />
              {isHtml ? renderHTML(body) : body}
            </div>
          )}
        </section>
      </div>
    );
  }
}
