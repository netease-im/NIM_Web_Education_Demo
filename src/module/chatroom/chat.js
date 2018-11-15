/*
 * @Author: lduoduo 
 * @Date: 2018-01-27 13:25:49 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-27 23:50:16
 * 聊天室聊天区
 */
import React, { Component } from 'react';
import { observer } from 'mobx-react';

import classNames from 'classnames';

import { Row, Col } from 'component';

import List from './chat.list';
import ChatInput from './chat.input';

@observer
export default class extends Component {
  render() {
    return (
      <div className="m-chatroom-chatarea">
        <List />
        <ChatInput />
      </div>
    );
  }
}
