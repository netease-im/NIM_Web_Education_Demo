/*
 * @Author: lduoduo 
 * @Date: 2018-01-27 13:25:36 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-27 21:58:20
 * 聊天室成员列表
 */
import React, { Component } from "react";
import { observer } from "mobx-react";

import classNames from "classnames";

import { StoreChatroom, StoreNim, StoreNetcall, StoreEventPool } from "store";
import { Storage, Alert, Toast } from "util";

import EXT_NIM from "ext/nim";
import EXT_CHAT from "ext/chatroom";
import EXT_NETCALL from "ext/webrtc";
import EXT_EVENTPOOL from "ext/eventpool";

const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NimState = StoreNim.state;
const NimAction = StoreNim;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;
const EventPoolAction = StoreEventPool;
const EventPoolState = StoreEventPool.state;

@observer
export default class extends Component {
  doEndInteraction = account => {
    console.log("【结束互动确认弹窗】 --> 确定..");
    Alert.close();

    // 成员状态设置[未互动状态]
    ChatroomAction.setMemberStatus(account, 0);

    // 画面取消
    EXT_NETCALL.stopRemoteStream(account);
    EXT_NETCALL.stopPlayRemoteAudio(account);

    //通知请求者结果【关闭】连麦
    EXT_NIM.sendCustomSysMsg(account, {
      room_id: ChatroomState.currChatroomId,
      command: 12
    })
      .then(() => {
        console.log("主持人通知成员关闭连麦结果成功");

        //主持人通知当前有权限成员列表
        NetcallAction.delMember(account);
        // 需要重新调整房间内成员的显示
        EXT_NETCALL.reDrawVideos();

        let hasPermissionUids = [];
        NetcallState.members.forEach(item => {
          if (item.account && item.account != "") {
            hasPermissionUids.push(item.account);
          }
        });
        console.log("待通知有权限列表为：", hasPermissionUids);
        EXT_CHAT.sendCustomMsg({
          room_id: ChatroomState.currChatroomId,
          command: 1,
          uids: hasPermissionUids
        })
          .then(() => {
            console.log("[停止互动后]主持人通知成员有权限的成员列表成功");
          })
          .catch(error => {
            console.error(
              "[停止互动后]主持人通知成员有权限的成员列表失败",
              error
            );
          });
      })
      .catch(error => {
        console.error("主持人通知成员关闭连麦结果失败", error);
      });
  };

  //结束成员的互动
  endInteraction = account => {
    console.log("结束互动【老师端】", account);
    Alert.open({
      title: "提示",
      msg:
        '<div class="u-end-interaction"><i class="u-icon-tip"></i>确定取消该用户的互动权限？</div>',
      isHtml: true,
      btns: [
        {
          label: "确定",
          clsName: "u-btn-smaller f-mgr-10",
          onClick: () => {
            this.doEndInteraction(account);
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

  doCancle = () => {
    console.log("【结束互动确认弹窗】 --> 取消..");
    Alert.close();
  };

  //同步成员发起的互动请求
  allowInteraction = account => {
    //判断是否已满4人
    if (NetcallAction.canAddNewMember()) {
      Toast({
        msg: "互动人数已满"
      });
      console.error("不可再加人互动...");
      return;
    }

    console.log("允许互动【老师端】", account);
    //成员状态调整【聊天室】
    ChatroomAction.setMemberStatus(account, 1);

    //主持人通知当前有权限成员列表
    NetcallAction.addMember({
      account: account,
      self: false
    });

    // 添加到RTC房间及标记互动状态
    EXT_EVENTPOOL.handleRtcPermissionAndDraw(account);

    //通知请求者结果【同意】
    EXT_NIM.sendCustomSysMsg(account, {
      room_id: ChatroomState.currChatroomId,
      command: 11
    })
      .then(() => {
        console.log("主持人通知成员同意连麦结果成功");

        let uids = [];
        NetcallState.members.forEach(item => {
          if (item.account && item.account != "") {
            uids.push(item.account);
          }
        });
        console.log(
          "待通知有权限成员列表为：",
          uids,
          NetcallState.doms.length,
          NetcallState.members.length
        );
        EXT_CHAT.sendCustomMsg({
          room_id: ChatroomState.currChatroomId,
          command: 1,
          uids: uids
        })
          .then(() => {
            console.log("[同意互动后]主持人通知成员有权限的成员列表成功");
          })
          .catch(error => {
            console.error(
              "[同意互动后]主持人通知成员有权限的成员列表失败",
              error
            );
          });
      })
      .catch(error => {
        console.error("主持人通知成员同意连麦结果失败", error);
      });
  };

  /**
   * 将音量的0-1范围值，映射为音量贴图类名
   */
  getVolume = volume => {
    if (volume > 0 && volume <= 0.125) {
      return "volume-1";
    } else if (volume > 0.125 && volume <= 0.25) {
      return "volume-2";
    } else if (volume > 0.25 && volume <= 0.375) {
      return "volume-3";
    } else if (volume > 0.375 && volume <= 0.5) {
      return "volume-4";
    } else if (volume > 0.5 && volume <= 0.625) {
      return "volume-5";
    } else if (volume > 0.625 && volume <= 0.75) {
      return "volume-6";
    } else if (volume > 0.75 && volume <= 0.875) {
      return "volume-7";
    } else if (volume > 0.875 && volume <= 1) {
      return "volume-8";
    } else {
      return "";
    }
  };

  render() {
    const isTeacher = Storage.get("isTeacher");
    return (
      <div className="m-chatroom-list m-chatroom-list-1">
        {ChatroomState.members.map(
          (item, index) =>
            item.type == "owner" ? (
              <div key={index} className="u-member">
                <div className="owner" />
                <div
                  className={classNames(
                    "volume",
                    this.getVolume(item.audioVolume)
                  )}
                />
                {item.avatar ? (
                  <div
                    className="avatar"
                    style={{
                      backgroundImage: "url(" + item.avatar + ")"
                    }}
                  />
                ) : (
                  <div className="avatar" />
                )}
                <div className="nickname">
                  {item.nick}
                </div>
              </div>
            ) : (
              <div key={index} className="u-member">
                <div
                  className={classNames(
                    "volume",
                    this.getVolume(item.audioVolume)
                  )}
                />
                {item.avatar ? (
                  <div
                    className="avatar"
                    style={{
                      backgroundImage: "url(" + item.avatar + ")"
                    }}
                  />
                ) : (
                  <div className="avatar" />
                )}
                <div className="nickname">
                  {item.nick}
                </div>
                <div className="opt">
                  {isTeacher == 1 &&
                    item.status == 1 && (
                      <div
                        className="button button-end"
                        onClick={this.endInteraction.bind(this, item.account)}
                      >
                        结束互动
                      </div>
                    )}
                  {isTeacher == 1 &&
                    item.status == 2 && (
                      <div
                        className="button"
                        onClick={this.allowInteraction.bind(this, item.account)}
                      >
                        允许互动
                      </div>
                    )}
                  {isTeacher == 0 &&
                    item.status == 1 && (
                      <div className="interaction-msg">互动中...</div>
                    )}
                </div>
              </div>
            )
        )}
      </div>
    );
  }
}
