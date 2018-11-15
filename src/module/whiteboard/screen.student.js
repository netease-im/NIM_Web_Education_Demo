import React, { Component } from "react";
import classNames from "classnames";
import { observer } from "mobx-react";

import { StoreNim, StoreChatroom, StoreNetcall, StoreWhiteBoard } from "store";
import { Storage } from "util";

import EXT_NIM from "ext/nim";
import EXT_CHAT from "ext/chatroom";
import EXT_NETCALL from "ext/webrtc";

const NimState = StoreNim.state;
const NimAction = StoreNim;
const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;

@observer
export default class extends Component {
  state = {
    isFullScreen: false
  };
  //退出大屏
  exitFullScreen = e => {
    NetcallAction.setScreenShareing4Local(false);
    const teacherAccount = Storage.get("teacherAccount");

    //默认窗口显示
    const index = NetcallAction.findMember({
      account: teacherAccount
    });
    console.log("### 缩小", index, NetcallState.doms[index], teacherAccount);
    EXT_NETCALL.startRemoteStream(teacherAccount, NetcallState.doms[index]);
    EXT_NETCALL.setVideoViewRemoteSize(teacherAccount);
  };

  render() {
    const { className, visible } = this.props;
    let html = '';
    if (NetcallState.screenShareing4Local) {
      html = <div className={classNames(this.state.isFullScreen ? 'video-fullscreen-box' : 'video-fullscreen-box-no')}>
        <div className="exit-fullscreen" onClick={this.exitFullScreen} />
        <div className="video-fullscreen" onClick={this.toggleFullscreen.bind(this)} />
      </div>
      
    }
    return (
      <div className={classNames(
            "m-fullscreen-box",
            visible ? "" : "hide"
          )}>
          <div
          id="m-whiteboard-fullscreen"
          className={classNames(
            "m-whiteboard-container",
            className,
            visible ? "" : "hide",
            this.state.isFullScreen ? "m-whiteboard-video-fullscreen" : "m-whiteboard-video"
          )}
        >
        </div>
        {html}
      </div>
    );
  }
  /**
   * 显示全屏
   * @param {Object} element
   */
  toggleFullscreen(element) {
    var element = document.querySelector('#m-whiteboard-fullscreen video')
    if (!element) {
      return;
    }
    this.setState({
      isFullScreen: !this.state.isFullScreen
    })
  }
}
