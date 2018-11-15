/*
 * @Author: lduoduo 
 * @Date: 2018-01-26 16:32:42 
 * @Last Modified by: qiusa
 * @Last Modified time: 2018-07-09 21:46:35
 * 白板区域
 */

import React, { Component } from "react";
import classNames from "classnames";
import { observer } from "mobx-react";

import WB from "./wb";
import ScreenShare4Teacher from "./screen.teacher";
import ScreenShare4Student from "./screen.student";

import { Storage } from "util";

import { StoreNim, StoreChatroom, StoreNetcall, StoreWhiteBoard } from "store";
import EXT_NETCALL from 'ext/webrtc'
import EXT_NIM from "ext/nim"

const NimState = StoreNim.state;
const NimAction = StoreNim;
const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;

@observer
export default class extends Component {
  state = {
    tabIndex: 0
  }

  showWhiteboardPanel = e => {
    // webrtc未初始化完成或者屏幕共享已点击 return
    if (!(NetcallState.webrtc && NetcallState.webrtc.startDevice) || NetcallState.hasShareScreen) {
      return
    }
    NetcallAction.settabindex(0)
    NetcallAction.setShareStarted(false)
    const isTeacher = Storage.get('isTeacher')
    if (isTeacher == 1) {
      this.startCamera()
    }
    if (ChatroomState.custom) {
      ChatroomState.custom.fullScreenType = 0 //标记屏幕共享状态 不共享
      EXT_NIM.updateChatroom(ChatroomState.custom)
    }
  }

  showScreenSharePanel = e => {
    // webrtc未初始化完成或者屏幕共享已点击 return
    if (!(NetcallState.webrtc && NetcallState.webrtc.startDevice)) {
      return
    }
    NetcallAction.settabindex(1)
    this.shareScreen()
  }
  startCamera() {
    if (NetcallState.hasVideo && NetcallState.video) {
      //启用新设备并渲染画面
      EXT_NETCALL.startCamera()
        .then(() => {
          const findIdx = NetcallState.members.findIndex(item => {
            return item.account == NimState.account
          })
          if (findIdx == -1) {
            console.error('不存在的成员, 无法渲染', NimState.account)
            return
          }

          const dom = NetcallState.doms[findIdx]
          if (!dom) {
            console.error('@@@@ 不存在的节点，忽略渲染本地流')
            return
          }
          console.log('其他【摄像头】设备自动开启成功：')
          EXT_NETCALL.startLocalStream(dom)
          EXT_NETCALL.setVideoViewSize()
        })
        .catch(error => {
          console.error('其他【摄像头】设备自动开启失败：', error)

          //禁用状态识别
          //chrome
          if (error == 'NotAllowedError') {
            NetcallAction.setHasVideo(false)
          }
        })
    } else {
      // 延时处理 否则对端视频可能未关闭
      setTimeout(() => {
        EXT_NETCALL.stopCamera()
        .then(() => {
          console.log("==本地摄像头关闭成功");
          const findIdx = NetcallState.members.findIndex(item => {
            return item.account == NimState.account
          })
          if (findIdx == -1) {
            console.error('不存在的成员, 无法渲染', NimState.account)
            return
          }
          const dom = NetcallState.doms[findIdx]
          if (!dom) {
            console.error('@@@@ 不存在的节点，忽略渲染本地流')
            return
          }
          EXT_NETCALL.stopLocalStream(dom);
        })
        .catch(error => {
          console.error("==本地摄像头关闭失败", error);
        });
      }, 100);
      
    }
  }
  /**
   *屏幕共享
   */
  shareScreen() {
    const ua = window.navigator.userAgent;
    const isChrome = ua.indexOf("Chrome") && window.chrome;
    if (!isChrome) {
      return
    }
    if (!NetcallState.hasShareScreen) {
      NetcallAction.setHasShareScreen(true);
      NetcallAction.setScreenShareing4Local(true);
      NetcallAction.setChromeDown(false)
      EXT_NETCALL.startChromeShareScreen()
        .then(() => {
          console.log('===屏幕共享启动成功')
          NetcallAction.setHasShareScreen(false);
          if (ChatroomState.custom) {
            ChatroomState.custom.fullScreenType = 1 //标记屏幕共享状态 共享
            EXT_NIM.updateChatroom(ChatroomState.custom)
          }
          const findIdx = NetcallState.members.findIndex(item => {
            return item.account == NimState.account
          })
          if (findIdx == -1) {
            console.error('不存在的成员, 无法渲染', NimState.account)
            return
          }

          const dom = NetcallState.doms[findIdx]
          if (!dom) {
            console.error('@@@@ 不存在的节点，忽略渲染本地流')
            return
          }
          console.log('当前人员加入节点：', dom)
          EXT_NETCALL.startLocalStream(dom)
          EXT_NETCALL.setVideoViewSize()
          setTimeout(() => {
            let dom1 = document.getElementById('videoShare')
            dom1.srcObject = dom.childNodes[0].childNodes[0].srcObject
            dom1.play()
            NetcallAction.setShareStarted(true)
          }, 1000)
        })
        .catch(error => {
          console.error('屏幕共享启动失败', error)
          NetcallAction.setHasShareScreen(false);
          if (error && error.code === 404) {
            NetcallAction.setChromeDown(true)
            NetcallAction.setShareStarted(false)
          } else {
            // 拉流失败到白板页面
            this.showWhiteboardPanel()
          }
          
        })
    }
    EXT_NETCALL.changeRoleToPlayer()
  }
  render() {
    const isTeacher = Storage.get('isTeacher')
    const { children, className } = this.props
    const state = this.state
    // 学生端屏幕共享有文案变更
    let text = (NetcallState.screenShareing4Local && isTeacher!=1) ? '屏幕共享' : '白板' 
    return (
      <div className="m-whiteboard">
        <div className="u-tab">
          <div className="u-tab-header u-tab-header-big">
            <div
              className={classNames(
                'u-tab-item u-tab-item-big',
                NetcallState.tabIndex == 0 ? 'active' : ''
              )}
              onClick={this.showWhiteboardPanel}
            >
              {text}
            </div>
            {isTeacher == 1 && (
              <div
                className={classNames(
                  'u-tab-item u-tab-item-big',
                  NetcallState.tabIndex == 1 ? 'active' : ''
                )}
                onClick={this.showScreenSharePanel}
              >
                屏幕共享
              </div>
            )}
          </div>
          <div className="u-tab-body">
            <WB visible={NetcallState.tabIndex == 0} />
            {isTeacher == 1 ? (
              <ScreenShare4Teacher
                visible={NetcallState.tabIndex == 1}
              />
            ) : (
              <ScreenShare4Student
                className="m-whiteboard-video m-whiteboard-container-cover"
                visible={NetcallState.screenShareing4Local}
              />
            )}
          </div>
        </div>
      </div>
    )
  }
}
