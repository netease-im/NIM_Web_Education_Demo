/*
 * @Author: lduoduo 
 * @Date: 2018-01-27 13:17:43 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-03-18 18:05:08
 * 白板区域, 主要是绘图展示
 */
import React, { Component } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react';
import { WbKit, DrawKit, FileKit } from '../kit';

import EXT_WHITEBOARD from 'ext/whiteboard';

import { StoreNim, StoreChatroom, StoreNetcall } from 'store';

const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NimState = StoreNim.state;
const NimAction = StoreNim;
const NetcallState = StoreNetcall.state;

@observer
export default class extends Component {
  componentDidMount() {
    console.log('whiteboard::componentDidMount');
    EXT_WHITEBOARD.setContainer(this.node);    
    // // 根据角色设置是否可以绘图
    // if(ChatroomState.isPlayer){
    //   EXT_WHITEBOARD.changeRoleToPlayer()
    // } else {
    //   EXT_WHITEBOARD.changeRoleToAudience()
    // }
  }
  render() {
    const {
      visible
    } = this.props;
    return (
      <div className={`m-whiteboard-container ${visible ? '' : 'hide'}`}>
        <div className="m-whiteboard-canvas" ref={node => (this.node = node)} />
        <WbKit />
        <FileKit visible={NetcallState.hasPermission} />
      </div>
    );
  }
}
