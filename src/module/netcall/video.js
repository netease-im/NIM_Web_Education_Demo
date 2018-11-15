/*
 * @Author: lduoduo 
 * @Date: 2018-01-27 13:40:35 
 * @Last Modified by: andyzou
 * @Last Modified time: 2018-09-04 15:15:31
 * 每个人视频画面显示区域
 */

import React, { Component } from "react";
import { observer } from "mobx-react";

import classNames from "classnames";

import { Row, Col } from "component";

import EXT_NIM from "ext/nim";
import EXT_CHAT from "ext/chatroom";
import EXT_NETCALL from "ext/webrtc";

import { StoreNim, StoreChatroom, StoreNetcall } from "store";

import { Storage, Throttle } from "util";
console.log('!!!!!!!!!', Throttle)
const NimState = StoreNim.state;
const NimAction = StoreNim;
const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;

@observer
export default class extends Component {
  state = {
    preventDom: null, //之前提示DOM
    timer: null, //延迟计时器
    ChangeVideoStatus: true, // 切换摄像头状态
    ChangeAudioStatus: true // 切换麦克风状态
  };
  //开关本地视频流
  toggleVideo() {
    if (NetcallState.tabIndex == 1) { //屏幕共享不关闭
      console.error('屏幕共享不关闭摄像头')
      return
    }
    if (!this.state.ChangeVideoStatus) {
      return
    }
    this.setState({
      ChangeVideoStatus: false
    })
    const v = !NetcallState.video;
    NetcallAction.setVideo(v);
    console.log("toggleVideo -> ", v);
    if (v) {
      EXT_NETCALL.startCamera()
        .then(() => {
          console.log("==本地摄像头开启成功");
          EXT_NETCALL.setVideoViewSize();
          EXT_NETCALL.startLocalStream(this.dom);
          this.setState({
            ChangeVideoStatus: true
          })
        })
        .catch(error => {
          this.setState({
            ChangeVideoStatus: true
          })
          console.error("==本地摄像头开启失败", error);
        });
    } else {
      EXT_NETCALL.stopCamera()
        .then(() => {
          console.log("==本地摄像头关闭成功");
          EXT_NETCALL.stopLocalStream(this.dom);
          this.setState({
            ChangeVideoStatus: true
          })
        })
        .catch(error => {
          console.error("==本地摄像头关闭失败", error);
          this.setState({
            ChangeVideoStatus: true
          })
        });
    }
  };

  //开关本地音频播放
  toggleAudio() {
    if (!this.state.ChangeAudioStatus) {
      return
    }
    this.setState({
      ChangeAudioStatus: false
    })
    const v = !NetcallState.audio;
    NetcallAction.setAudio(v);
    console.log("toggleAudio -> ", v);
    if (v) {
      EXT_NETCALL.startMicro()
        .then(() => {
          this.setState({
            ChangeAudioStatus: true
          })
          console.log("==本地麦克风关闭成功");
        })
        .catch(error => {
          console.error("==本地麦克风关闭/播放本地音频失败", error);

          //禁用状态识别
          //chrome
          if (error == "NotAllowedError") {
            NetcallAction.setHasAudio(false);
          }
          this.setState({
            ChangeAudioStatus: true
          })
        });
    } else {
      EXT_NETCALL.stopMicro()
        .then(() => {
          this.setState({
            ChangeAudioStatus: true
          })
          console.log("==本地麦克风关闭成功");
        })
        .catch(error => {
          console.error("==本地麦克风关闭/停止播放本地音频失败", error);

          //禁用状态识别
          //chrome
          if (error == "NotAllowedError") {
            NetcallAction.setHasVideo(false);
          }
          this.setState({
            ChangeAudioStatus: true
          })
        });
    }
  };

  toggleFullscreen() {
    const dom = document.getElementById("m-whiteboard-fullscreen");
    if (!dom) {
      console.error('节点未准备完毕')
      return
    }
    NetcallAction.setScreenShareing4Local(true);
    const account = this.props.account;
    //放大显示
    console.log("### 放大", account, dom);
    EXT_NETCALL.startRemoteStream(account, dom);
    EXT_NETCALL.setVideoViewRemoteSize(account, 700, 490);
  };

  onMouseOver = type => {
    if (this.state.timer) {
      clearTimeout(this.state.timer);
      this.setState({
        timer: null
      });
      if (this.state.preventDom) {
        this.state.preventDom.style.display = "none";
      }
    }
    const dom = this.getTipDom(type);
    dom.style.display = "block";
  };

  onMouseOut = type => {
    const dom = this.getTipDom(type);
    this.setState({
      timer: setTimeout(() => {
        dom.style.display = "none";
      }, 250),
      preventDom: dom
    });
  };

  getTipDom(type) {
    return type == "video"
      ? document.getElementById("tip4video")
      : document.getElementById("tip4audio");
  }

  render() {
    const {
      className,
      account = "", //账号
      self = false, // 是否是自己
      offline = false, //老师是否离线
      index = 0 //索引
    } = this.props;
    const teacherAccount = Storage.get("teacherAccount");
    const isTeacher = account == teacherAccount;
    return (
      <div className={classNames("m-netcall-video", className)}>
        <div className="video-name">{account}</div>
        <div
          className={classNames(
            "m-video",
            account && account != ""
              ? offline == true ? "room-offline" : "room-hasuser"
              : ""
          )}
          id={className}
          ref={dom => (this.dom = dom)}
        />
        {!offline &&
          isTeacher &&
          NetcallState.video4ScreenSharing &&
          !NetcallState.screenShareing4Local && (
            <div className="video-toolbar">
              <span
                className={classNames(
                  "fullscreen",
                  !NetcallState.screenShareing4Local ? "fullscreen-open" : ""
                )}
                onClick={Throttle(this.toggleFullscreen.bind(this), 250, 1000)}
                // onClick={this.toggleFullscreen}
              />
            </div>
          )}
        {!offline &&
          self && (
            <div className="video-toolbar">
              {NetcallState.hasVideo ? (
                <span
                  className={classNames(
                    "video",
                    NetcallState.video ? "video-open" : "video-close",
                    NetcallState.shareStarted ? "hide-import" : ""
                  )}
                  onClick={Throttle(this.toggleVideo.bind(this), 250, 1000)}
                  // onClick={this.toggleVideo}
                />
              ) : (
                <span>
                  <span
                    id="tip4video"
                    className="tip tip4video"
                    style={{
                      display: "none"
                    }}
                  >
                    摄像头不可用
                  </span>
                  <span
                    className={classNames("video", "video-disabled", NetcallState.shareStarted ? "hide-import" : "")}
                    onMouseOver={this.onMouseOver.bind(this, "video")}
                    onMouseOut={this.onMouseOut.bind(this, "video")}
                  />
                </span>
              )}
              {NetcallState.hasAudio ? (
                <span
                  className={classNames(
                    "audio",
                    NetcallState.audio ? "audio-open" : "audio-close"
                  )}
                  onClick={Throttle(this.toggleAudio.bind(this), 250, 1000)}
                  // onClick={this.toggleAudio}
                />
              ) : (
                <span>
                  <span
                    id="tip4audio"
                    className="tip tip4audio"
                    style={{
                      display: "none"
                    }}
                  >
                    麦克风不可用
                  </span>
                  <span
                    className={classNames("audio", "audio-disabled")}
                    onMouseOver={this.onMouseOver.bind(this, "audio")}
                    onMouseOut={this.onMouseOut.bind(this, "audio")}
                  />
                </span>
              )}
            </div>
          )}
      </div>
    );
  }
}
