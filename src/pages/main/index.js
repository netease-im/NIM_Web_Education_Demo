/*
 * @Author: lduoduo 
 * @Date: 2018-01-24 16:06:27 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-03-22 10:45:09
 * 登录进来的首页，创建房间、加入房间的页面
 * 注：
 */
import React, { Component } from "react";
import { observer } from "mobx-react";

import { Header } from "layout";
import { Row, Col, Button } from "component";
import { Chatroom, Netcall, Whiteboard } from "module";

import { StoreNim, StoreChatroom, StoreNetcall } from "store";

import { Page, Storage, Alert, CheckBroswer } from "util";
import Video from "../../module/netcall/video";

import EXT_NIM from "ext/nim";
import EXT_CHAT from "ext/chatroom";
import EXT_NETCALL from "ext/webrtc";
import EXT_WHITEBOARD from "ext/whiteboard";

import Ext from "./main.ext";

const NimState = StoreNim.state;
const NimAction = StoreNim;
const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;

@observer
class Main extends Component {
  state = {
    needShowTip: true, //是否需要持续显示设备无可用的提示消息
    requesting: false //是否正在请求
  };
  componentDidMount() {
    CheckBroswer({
      success: this.init.bind(this)
    });
  }

  init() {
    NetcallAction.setShowStatus(0);
    this.autoLogin();
  }

  request = e => {
    //当前聊天室主持人
    const findIdx = this.findOwnerIdx();
    if (findIdx == -1) {
      console.error("未找到老师端，老师不在线所致");
      return;
    }
    const account = ChatroomState.members[findIdx].account;
    console.log("当前聊天室主持人：", account);

    this.setState({
      requesting: true
    });

    EXT_NIM.sendCustomSysMsg(account, {
      room_id: ChatroomState.currChatroomId,
      command: 10
    })
      .then(() => {
        console.log("发送请求连麦消息成功");

        //变成取消状态
        NetcallAction.setShowStatus(1);
        this.setState({
          requesting: false
        });
      })
      .catch(error => {
        console.error("发送请求连麦消息失败", error);

        NetcallAction.setShowStatus(0);
        this.setState({
          requesting: false
        });
      });
  };

  cancleRequest = e => {
    //当前聊天室主持人
    const findIdx = this.findOwnerIdx();
    if (findIdx == -1) {
      console.error("未找到老师端，老师不在线所致");
      return;
    }
    const account = ChatroomState.members[findIdx].account;
    console.log("当前聊天室主持人：", account);

    this.setState({
      requesting: true
    });
    //取消请求
    EXT_NIM.sendCustomSysMsg(account, {
      room_id: ChatroomState.currChatroomId,
      command: 13
    })
      .then(() => {
        console.log("发送请求取消连麦消息成功");

        //变成请求状态
        NetcallAction.setShowStatus(0);
        this.setState({
          requesting: false
        });
      })
      .catch(error => {
        console.error("发送请求取消连麦消息失败", error);

        NetcallAction.setShowStatus(1);
        this.setState({
          requesting: false
        });
      });
  };

  doStopInteraction = () => {
    console.log("【停止互动确认弹窗】--> 确定...");
    Alert.close();
    //当前聊天室主持人：
    const findIdx = this.findOwnerIdx();
    if (findIdx == -1) {
      console.error("未找到老师端，老师不在线所致");
      return;
    }

    const account = ChatroomState.members[findIdx].account;
    console.log("当前聊天室主持人：", account);

    this.setState({
      requesting: true
    });

    //停止请求
    EXT_NIM.sendCustomSysMsg(account, {
      room_id: ChatroomState.currChatroomId,
      command: 13
    })
      .then(() => {
        console.log("【停止连麦】发送请求取消连麦消息成功");

        //变成请求状态
        NetcallAction.setShowStatus(0);

        this.setState({
          requesting: false
        });

        //本地行为及控制指令通知（麦克风、摄像头、画面）
        const findIdx = NetcallState.members.findIndex(item => {
          return item.account == NimState.account;
        });
        if (findIdx == -1) {
          console.error("未找到对应DOM节点,无法停止流...");
        } else {
          EXT_NETCALL.stopLocalStream(NetcallState.doms[findIdx]);
        }

        //删除自己
        NetcallAction.delMember(NimState.account);
        NetcallAction.setHasPermission(false);
        ChatroomAction.setMemberStatus(NimState.account, 0);

        EXT_WHITEBOARD.changeRoleToAudience();
        EXT_NETCALL.changeRoleToAudience()
          .then(() => {
            console.log("==== 切换为观众成功");
            return EXT_NETCALL.stopMicro();
          })
          .then(() => {
            console.log("==== 停止麦克风成功");
            NetcallAction.setAudio(false);
            return EXT_NETCALL.stopCamera();
          })
          .then(() => {
            console.log("==== 停止摄像头成功");
            NetcallAction.setVideo(false);
          })
          .catch(error => {
            console.error("停止本地行为失败", error);
          });
      })
      .catch(error => {
        console.error("【停止连麦】发送请求取消连麦消息失败", error);

        this.setState({
          requesting: false
        });
      });
  };
  doCancle = () => {
    console.log("【停止互动确认弹窗】--> 取消...");
    Alert.close();
  };

  stopInteraction = e => {
    Alert.open({
      title: "提示",
      msg:
        '<div class="u-stop-interaction"><i class="u-icon-tip"></i>确定退出互动嘛？</div>',
      isHtml: true,
      btns: [
        {
          label: "确定",
          clsName: "u-btn-smaller f-mgr-10",
          onClick: () => {
            this.doStopInteraction();
          }
        },
        {
          label: "取消",
          clsName: "u-btn-cancle",
          onClick: () => {
            this.doCancle();
          }
        }
      ]
    });
  };

  findOwnerIdx() {
    return ChatroomState.members.findIndex((item, index) => {
      return item.type == "owner";
    });
  }

  closeDeviceDisabledTip = () => {
    this.setState({
      needShowTip: false
    });
  };

  render() {
    const state = this.state;
    return (
      <div>
        <Header isHome={false} />
        <div className="m-main">
          {(!NetcallState.hasVideo || !NetcallState.hasAudio) &&
            state.needShowTip && (
              <div id="device-disabled-tip" className="u-tip">
                <div className="u-tip-message">
                  提示：当前摄像头或话筒不可用
                  。尝试到浏览器：设置-内容-摄像头\话筒，删除禁用地址。再刷新页面，获取权限时，点击“同意”。
                  <div
                    className="close"
                    onClick={this.closeDeviceDisabledTip}
                  />
                </div>
              </div>
            )}

          <div className="room-info">
            房间号: {ChatroomState.currChatroomId}
          </div>
          <div className="more-opt">
            {ChatroomState.type != "owner" &&
              !NetcallState.hasPermission &&
              NetcallState.showStatus == 0 && (
                <Button
                  className="u-btn-longer"
                  onClick={this.request}
                  disabled={state.requesting}
                  loading={state.requesting}
                >
                  请求互动
                </Button>
              )}

            {ChatroomState.type != "owner" &&
              !NetcallState.hasPermission &&
              NetcallState.showStatus == 1 && (
                <Button
                  className="u-btn-longer"
                  onClick={this.cancleRequest}
                  disabled={state.requesting}
                  loading={state.requesting}
                >
                  取消互动
                </Button>
              )}

            {ChatroomState.type != "owner" &&
              NetcallState.hasPermission && (
                <Button
                  className="u-btn-longer u-btn-stop"
                  onClick={this.stopInteraction}
                  disabled={state.requesting}
                  loading={state.requesting}
                >
                  停止互动
                </Button>
              )}

            {ChatroomState.type != "owner" &&
              !NetcallState.hasPermission && (
                <div className="tip">
                  （注：加入互动后可在白板上与老师画图交流）
                </div>
              )}
          </div>
          <Whiteboard />
          <div className="m-netcall">
            {NetcallState.members.map((item, index) => (
              <Video
                key={index}
                className={"video-" + (index + 1)}
                index={index}
                self={item.self}
                account={item.account}
                offline={item.offline}
              />
            ))}
          </div>
          <Chatroom />
        </div>
      </div>
    );
  }
}

Main.prototype = Object.assign(Main.prototype, Ext);
export default Main;
