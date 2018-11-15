/*
 * @Author: lduoduo 
 * @Date: 2018-02-05 17:04:14 
 * @Last Modified by: andyzou
 * @Last Modified time: 2018-09-13 15:14:44
 * 初始化IM连接
 */
import React, { Component } from "react";
import env from "../env";
import config from "config";
import { Ajax, Alert, Toast, Loading, Valid, MD5, Storage, Page } from "util";
import { ConfirmDeviceContent } from "../component/alert-content";

import { StoreNim, StoreChatroom, StoreNetcall, StoreEventPool } from "store";

import EXT_CHAT from "ext/chatroom";
import EXT_NETCALL from "ext/webrtc";
import EXT_WHITEBOARD from "ext/whiteboard";
import EXT_EVENTPOOL from "ext/eventpool";

const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NimState = StoreNim.state;
const NimAction = StoreNim;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;
const EventPoolAction = StoreEventPool;
const EventPoolState = StoreEventPool.state;

// SDK插件注册
window.WebRTC && window.NIM.use(window.WebRTC);
window.WhiteBoard && window.NIM.use(window.WhiteBoard);

export default {
  // 注册逻辑
  regist(param) {
    if (!Valid.param(param, "username password nickname"))
      return Promise.reject("注册失败: 参数不完整，请检查");
    param.password = MD5(param.password);
    return Ajax({
      url: env.url + "/api/createDemoUser",
      type: "POST",
      dataType: "form",
      data: param
    })
      .then(data => {
        if (data && data.res === 200) {
          return Promise.resolve();
        } else {
          return Promise.reject(data.errmsg);
        }
      })
      .catch(err => {
        return Promise.reject(err);
      });
  },

  // 初始化NIM SDK, 登录
  login(account, token) {
    if (NimState.nim) {
      console.log('=== 已存在的nim实例， 不再重新初始化...');
      return Promise.resolve();
    }
    if (!account || !token) {
      return Promise.reject("请输入登录名和密码");
    }

    return new Promise((resolve, reject) => {
      window.nim = window.NIM.getInstance({
        debug: true,
        // debug: true && { api: 'info', style: 'font-size:12px;color:blue;background-color:rgba(0,0,0,0.1)' },
        appKey: env.appkey,
        account,
        token,
        db: false,
        syncSessionUnread: true,
        syncRobots: true,
        autoMarkRead: true, // 默认为true
        onconnect: function(event) {
          console.log("im连接成功....");

          //全局状态更新
          NimAction.setNim(window.nim);
          NimAction.setAccount(account);
          NimAction.setToken(token);
        },
        onerror: function(event) {
          console.error("网络连接状态异常", event);
          Page.to("login", "网络连接状态异常");
        },
        onwillreconnect: function() {
          console.log(event);
        },
        ondisconnect: function(error) {
          let message = "";
          switch (error.code) {
            // 账号或者密码错误, 请跳转到登录页面并提示错误
            case 302:
              reject("帐号或密码错误");
              break;
            // 被踢, 请提示错误后跳转到登录页面
            case "kicked":
              let map = {
                PC: "电脑版",
                Web: "网页版",
                Android: "手机版",
                iOS: "手机版",
                WindowsPhone: "手机版"
              };
              let str = error.from;
              message = `你的帐号于${util.formatDate(new Date())}被${map[str] ||
                "其他端"}踢出下线，请确定帐号信息安全!`;
              Page.to("login", message);
              break;
            default:
              break;
          }
        },
        onmsg: this.onMsg.bind(this),
        oncustomsysmsg: this.onCustomSysMsg.bind(this),
        // 同步完成
        onsyncdone: function onSyncDone() {
          console.log("onsyncdone");
          resolve();
        }
      });
    });
  },

  onCustomSysMsg(msg) {
    console.log("收到onCustomSysMsg: ", msg);
    if (msg.type == "custom" && msg.scene == "p2p") {
      let content = null;
      try {
        content = JSON.parse(msg.content);
      } catch (e) {
        console.error(e, "解析自定义系统通知消息内容失败");
        content = null;
      }
      if (!content) {
        console.error("无内容：", content);
        return;
      }

      console.log(content);

      //收到点对点权限控制消息
      if (content.type == 10) {
        switch (content.data.command) {
          //主持人通知有权限的成员列表【成员】
          case 1:
            //设置已收到主持人通知的标记
            NimAction.setHasReceiveHostMsg(true);
            Storage.set("teacherAccount", msg.from);
            const uids = content.data.uids;
            let members = [];
            uids.forEach(item => {
              members.push({
                account: item,
                self: NimState.account == item
              });

              //非老师的互动成员则标记一下
              if (item != msg.from) {
                ChatroomAction.setMemberStatus(item, 1);
              }
            });
            NetcallAction.setMembers(members);

            // 添加到RTC房间及标记互动状态
            members.forEach(member => {
              EXT_EVENTPOOL.handleRtcPermissionAndDraw(member.account);
            });

            EXT_NETCALL.reDrawVideos();
            break;
          //收到有权限成员的通知【成员/主持人】
          case 3:
            const account = msg.from;
            NetcallAction.addMember({
              account: account,
              self: false
            });
            ChatroomAction.setMemberStatus(account, 1);

            // 添加到RTC房间及标记互动状态
            EXT_EVENTPOOL.handleRtcPermissionAndDraw(account);

            break;
          //成员请求连麦权限【主持人】
          case 10:
            console.log("收到连麦请求", msg);
            //设置成员请求互动状态
            ChatroomAction.setMemberStatus(msg.from, 2);

            //设置成员请求权限状态标记
            if (!ChatroomState.isShowMemberTab) {
              console.log("*** 当前不在成员列表TAB，设置有人请求加麦标记");
              ChatroomAction.setHasPermissionRequest(true);
            }

            break;
          //主持人同意连麦请求【成员】
          case 11:
            console.log("主持人同意连麦请求");
            console.log("默认设置视频与麦克风都可用...");
            NetcallAction.setVideo(true);
            NetcallAction.setAudio(true);

            Alert.open({
              title: "操作确认",
              msg: <ConfirmDeviceContent />,
              btns: [
                {
                  label: "确定",
                  clsName: "u-btn-smaller",
                  onClick: () => {
                    console.log("【设备确认弹窗】--> 确定..");
                    this.doConfirmDevice();
                  }
                }
              ],
              close: () => {
                console.log("【设备确认弹窗】--> X..");
                this.doConfirmDevice();
              }
            });
            break;
          //主持人拒绝或关闭连麦【成员】
          case 12:
            console.log("主持人拒绝连麦请求");
            this.doEndInteraction4CurrentStudent();
            Alert.open({
              title: "提示",
              msg:
                '<div class="u-end-interaction"><i class="u-icon-tip"></i>你被老师取消互动</div>',
              isHtml: true,
              btns: [
                {
                  label: "确定",
                  clsName: "u-btn-smaller",
                  onClick: () => {
                    console.log("【老师剔除学生，学生提示弹窗】--> 确定");
                    Alert.close();
                  }
                }
              ],
              close: () => {
                console.log("【老师剔除学生，学生提示弹窗】--> x");
                Alert.close();
              }
            });
            break;
          //成员取消连麦请求【主持人】
          case 13:
            console.log("收到取消连麦请求", msg);

            //取消设置成员请求互动状态
            ChatroomAction.setMemberStatus(msg.from, 0);
            if (ChatroomAction.hasPermissionRequestMember()) {
              console.log("尚有成员请求连麦，红点依然显示...");
            } else {
              console.log("无成员请求连麦，红点直接不显示...");
              ChatroomAction.setHasPermissionRequest(false);
            }

            NetcallAction.delMember(msg.from);

            // 画面取消
            EXT_NETCALL.stopRemoteStream(msg.from);
            EXT_NETCALL.stopPlayRemoteAudio(msg.from);
            EXT_NETCALL.reDrawVideos();

            // TODO 可能需要广播给聊天室成员，最新有权限列表
            let hasPermissionUids = [];
            NetcallState.members.forEach(item => {
              if (item.account && item.account != "") {
                hasPermissionUids.push(item.account);
              }
            });
            console.log(
              "**** 成员取消或停止连麦， 主持人收到点对点后， 发送群广播。待通知有权限列表为：",
              hasPermissionUids
            );
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
            break;
        }
      }
    }
  },

  //自定义IM消息
  sendCustomMsg(to, data) {
    const nim = NimState.nim;
    return new Promise((resolve, reject) => {
      nim.sendCustomMsg({
        scene: "p2p",
        to: to,
        content: JSON.stringify({
          type: 10,
          data: data
        }),
        done: function(error, msg) {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      });
    });
  },

  sendCustomSysMsg(to, data) {
    const nim = NimState.nim;
    return new Promise((resolve, reject) => {
      nim.sendCustomSysMsg({
        scene: "p2p",
        to: to,
        sendToOnlineUsersOnly: true, //不离线
        isPushable: false, //不推送
        content: JSON.stringify({
          type: 10,
          data: data
        }),
        done: function(error, msg) {
          console.log("发送的自定义系统通知消息为：", msg);
          if (error) {
            reject(error);
            return;
          }

          resolve();
        }
      });
    });
  },
  //更新聊天室信息
  updateChatroom(data) {
    const chatroom = ChatroomState.currChatroom
    if (!chatroom) {
      return
    }
    return new Promise((resolve, reject) => {
      chatroom.updateChatroom({
        chatroom: {
          custom: JSON.stringify(data) // getChatroom使用
        },
        needNotify: true,
        custom: JSON.stringify(data), // 通知使用
        done: function(error, msg) {
          console.log(
            '更新聊天室信息' + (!error ? '成功' : '失败'),
            error,
            msg
          )
          if (error) {
            reject(error)
            return
          }
          resolve()
        }
      })
    });
  },
  onMsg(msg) {
    console.log("收到im消息onMsg: ", msg);
  },

  doConfirmDevice() {
    Alert.close();
    console.log(
      "互动模式",
      "audio: ",
      NetcallState.audio,
      ", video: ",
      NetcallState.video
    );

    NetcallAction.setHasPermission(true);
    NetcallAction.addMember({
      account: NimState.account,
      self: true
    });
    ChatroomAction.setMemberStatus(NimState.account, 1);
    // 白板本地行为
    EXT_WHITEBOARD.changeRoleToPlayer();
    EXT_WHITEBOARD.checkColor()

    // 音视频本地行为(麦克风、摄像头、画面等)
    if (NetcallState.hasAudio && NetcallState.audio) {
      EXT_NETCALL.startMicro()
        .then(() => {
          console.log("===麦克风启动成功");
        })
        .catch(error => {
          console.error("===麦克风启动失败", error);

          //禁用状态识别
          //chrome
          if(error =='NotAllowedError'){
            NetcallAction.setHasAudio(false);
          }
        });
    }
    if (NetcallState.hasVideo && NetcallState.video) {
      EXT_NETCALL.startCamera()
        .then(() => {
          console.log("===摄像头启动成功");

          const findIdx = NetcallState.members.findIndex(item => {
            return item.account == NimState.account;
          });
          if (findIdx == -1) {
            console.error("不存在的成员, 无法渲染", NimState.account);
            return;
          }

          const dom = NetcallState.doms[findIdx];
          if (!dom) {
            console.error("@@@@ 不存在的节点，忽略渲染本地流");
            return;
          }
          console.log("当前人员加入节点：", dom);
          EXT_NETCALL.startLocalStream(dom);
          EXT_NETCALL.setVideoViewSize();
        })
        .catch(error => {
          console.error("===摄像头启动失败", error);

          //禁用状态识别
          //chrome
          if(error =='NotAllowedError'){
            NetcallAction.setHasVideo(false);
          }
        });
    }
    EXT_NETCALL.changeRoleToPlayer();
  },

  doEndInteraction4CurrentStudent() {
    // 白板设置为观众
    EXT_WHITEBOARD.changeRoleToAudience();
    //本地行为及控制指令通知（麦克风、摄像头、画面）
    const findIdx = NetcallState.members.findIndex(item => {
      return item.account == NimState.account;
    });
    if (findIdx == -1) {
      console.error("未找到对应DOM节点,无法停止流...");
    } else {
      EXT_NETCALL.stopLocalStream(NetcallState.doms[findIdx]);
    }
    NetcallAction.delMember(NimState.account);
    NetcallAction.setHasPermission(false);
    NetcallAction.setShowStatus(0);

    ChatroomAction.setMemberStatus(NimState.account, 0);

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
      .catch(error=> {
        console.error("停止本地行为失败", error);
      });
  },

  //退出NIM SDK
  logout() {
    NimState.nim && NimState.nim.disconnect();
    NimAction.setAccount("");
    NimAction.setToken("");

    //原nim对象清除
    window.nim = null;
    NimAction.setNim(null);

    Storage.remove("account");
    Storage.remove("token");

    Page.to("login");
  }
};
