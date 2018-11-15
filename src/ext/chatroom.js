/*
 * @Author: lduoduo 
 * @Date: 2018-02-02 19:25:16 
 * @Last Modified by: andyzou
 * @Last Modified time: 2018-09-13 14:59:03
 * 连接聊天室的各种操作，包括：
 * 1. nim 登录
 * 2. 连接聊天室
 * 3. 申请互动
 * 4. 接受取消互动
 * 5. 聊天
 */

/* 
 * 聊天室SDK，依赖于nim sdk
 */

import env from "../env";
import config from "config";
import { Alert, Toast, Storage, Ajax, Page, Valid } from "util";

import { StoreNim, StoreChatroom, StoreNetcall } from "store";

import EXT_NIM from "ext/nim";
import EXT_CHAT from "ext/chatroom";
import EXT_NETCALL from "ext/webrtc";
import EXT_WHITEBOARD from "ext/whiteboard";
import { Netcall } from "../module";
import emojiData from "../component/emoji/emoji-data";

const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NimState = StoreNim.state;
const NimAction = StoreNim;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;

// 切换聊天室之前需要断开连接，原因是移动端不断累积连接实例，消息并发较大时会有性能问题
// 聊天室操作
export default {
  //聊天列表消息组件渲染对象
  createChatroomMsg4Component(
    _type,
    _account,
    _fromAvatar,
    _fromNick,
    _content,
    catalog
  ) {
    return {
      type: _type,
      account: _account,
      avatar: _fromAvatar,
      nick: _fromNick,
      content: _content,
      catalog: catalog
    };
  },

  //聊天成员列表组件渲染对象
  createMember4Component(_type, _account, _avatar, _nick, _enterTime) {
    return {
      type: _type,
      account: _account,
      avatar: _avatar,
      nick: _nick,
      enterTime: _enterTime
    };
  },

  handleEmojiText(sourceText) {
    console.log("source text: ", sourceText);
    if (/\[[^\]]+\]/.test(sourceText)) {
      let emojiItems = sourceText.match(/\[[^\]]+\]/g);
      emojiItems.forEach(text => {
        let emojiCnt = emojiData.emojiList.emoji;
        if (emojiCnt[text]) {
          sourceText = sourceText.replace(
            text,
            `<img class="emoji" src="${
              emojiCnt[text].img
            }?imageView&thumbnail=28x28">`
          );
        }
      });
    }

    console.log("target text: ", sourceText);
    return sourceText;
  },

  //格式化处理聊天室消息
  formatChatroomMsg(msg, onlyFormatMsg) {
    switch (msg.type) {
      case "text":
        //表情字符转为图片
        let sourceText = msg.text;
        console.log("sourceText: ", sourceText);
        sourceText = Valid.escape(sourceText);
        console.log("escape: ", sourceText);

        sourceText = this.handleEmojiText(sourceText);

        return this.createChatroomMsg4Component(
          "text",
          msg.from,
          msg.fromAvatar,
          msg.fromNick,
          sourceText
        );
      case "notification":
        let attach = msg.attach;
        switch (attach.type) {
          //成员加入
          case "memberEnter":
            //额外业务处理
            if (!onlyFormatMsg) {
              this.getChatroomMembersInfo(msg.from)
                .then(memberInfo => {
                  console.log("memberEnter ->", memberInfo);
                  //成员变更调整当前列表
                  ChatroomAction.addMember(
                    this.createMember4Component(
                      memberInfo.members[0].type,
                      memberInfo.members[0].account,
                      memberInfo.members[0].avatar,
                      memberInfo.members[0].nick,
                      memberInfo.members[0].enterTime
                    )
                  );

                  // //自己加入则设置对应成员类型 (已在页面加载时设置，不重新处理)
                  // if (attach.from == NimState.account) {
                  //   ChatroomAction.setType(memberInfo.members[0].type);
                  // }
                })
                .catch(error => {
                  console.error("获取成员信息失败...", error);
                });

              //主持人发送点对点消息给成员
              const isTeacher = Storage.get("isTeacher");
              const account = Storage.get("account");
              const teacherAccount = Storage.get("teacherAccount");
              //创建房间不进行请求
              if (NetcallState.fromCreate) {
                NetcallAction.setFromCreate(false);
                console.log(
                  "设置[创建房间]的标记为false，老师首次创建房间不发起请求权限人员消息..."
                );
                return this.createChatroomMsg4Component(
                  "notification",
                  msg.from,
                  "",
                  "",
                  attach.from == NimState.account
                    ? "欢迎你进入房间"
                    : attach.from + "进入了房间"
                );
              }

              if (msg.from == teacherAccount) {
                //老师重新上线
                console.log("===老师重新上线--->");
                if (isTeacher == 1) {
                  NetcallAction.addMember(
                    {
                      account: msg.from,
                      self: true
                    },
                    true,
                    false
                  );
                  /* if (ChatroomState.custom) {
                    console.error('adadsaobject123');
                    ChatroomState.custom.fullScreenType = 0 //标记屏幕共享状态 共享
                    EXT_NIM.updateChatroom(ChatroomState.custom)
                  } */
                } else {
                  NetcallAction.addMember(
                    {
                      account: msg.from,
                      self: false
                    },
                    true,
                    false
                  );
                }

                EXT_NETCALL.reDrawVideos();
              }

              //老师端学生上线
              if (isTeacher == 1 && msg.from != account) {
                console.log("### 老师端有学生上线...");
                let uids = [];
                NetcallState.members.forEach(item => {
                  if (item.account && item.account != "") {
                    uids.push(item.account);
                  }
                });
                console.log("uids: ", uids);

                //通知有权限成员列表给上线学生【点对点】
                EXT_NIM.sendCustomSysMsg(msg.from, {
                  room_id: ChatroomState.currChatroomId,
                  command: 1,
                  uids: uids
                })
                  .then(() => {
                    console.log("**** 主持人点对点通知有权限的成员列表成功");
                  })
                  .catch(error => {
                    console.error(
                      "**** 主持人点对点通知有权限的成员列表失败",
                      error
                    );
                  });
              } else if (msg.from == account) {
                //老师/学生重新上线
                console.log(
                  (msg.from == teacherAccount ? "老师" : "学生") +
                    "上线，向所有人发送请求有权限的成员消息(2s后）进行"
                );
                setTimeout(() => {
                  if (NimState.hasReceiveHostMsg) {
                    NimAction.setHasReceiveHostMsg(false);
                    console.log(
                      "#### 已收到主持人的有权限成员列表通知消息，不进行收集权限过程"
                    );
                    return;
                  }

                  console.log("*** 开始权限收集");
                  this.sendCustomMsg({
                    room_id: ChatroomState.currChatroomId,
                    command: 2
                  })
                    .then(() => {
                      console.log("请求有权限成员的聊天室消息成功");
                    })
                    .catch(error => {
                      console.error("请求有权限成员的聊天室消息失败", error);
                    });
                }, 2000);
              }
            }
            return this.createChatroomMsg4Component(
              "notification",
              msg.from,
              "",
              "",
              attach.from == NimState.account
                ? "欢迎你进入房间"
                : attach.from + "进入了房间"
            );

          //成员离开
          case "memberExit":
            if (!onlyFormatMsg) {
              //成员变更调整当前列表
              ChatroomAction.delMember(msg.from);
            }
            return this.createChatroomMsg4Component(
              "notification",
              msg.from,
              "",
              "",
              attach.from + "离开了房间"
            );

          //聊天室更新(屏幕共享状态通知)
          case "updateChatroom":
            if (!onlyFormatMsg) {
              console.log("#### updateChatroom: ", attach.custom);
              let custom = null;
              try {
                custom = JSON.parse(attach.custom);
              } catch (e) {}
              if (custom == null) {
                console.error("解析custom失败");
                return;
              }

              console.log("custom: ", custom);

              //设置远端是否正在屏幕共享
              NetcallAction.setVideo4ScreenShareing(custom.fullScreenType == 1);

              //关闭后处理（重新设置对应老师的画面节点）
              if (custom.fullScreenType == 0) {
                console.log(" 重新设置对应老师画面...");
                NetcallAction.setScreenShareing4Local(false);
                const teacherAccount = Storage.get("teacherAccount");

                //默认窗口显示
                const index = NetcallAction.findMember({
                  account: teacherAccount
                });
                console.log(
                  "### 缩小",
                  index,
                  NetcallState.doms[index],
                  teacherAccount
                );
                EXT_NETCALL.startRemoteStream(
                  teacherAccount,
                  NetcallState.doms[index]
                );
                EXT_NETCALL.setVideoViewRemoteSize(teacherAccount);
              } else {
                if (Storage.get("isTeacher") == 0) {
                  // 非教师下收到屏幕共享通知需重置标记
                  NetcallAction.setScreenShareing4Local(false);
                }
              }
            }
            break;
        }
        break;
      case "custom":
        console.log("==== 聊天室自定义: ", msg);
        let content = null;
        try {
          content = JSON.parse(msg.content);
        } catch (e) {
          console.error("解析聊天室自定义消息内容失败", e);
          content = null;
        }
        if (!content) {
          console.error("###聊天室自定义消息无内容");
          return;
        }

        const type = content.type;

        //猜拳消息
        if (type == 1) {
          const value = content.data.value;
          const resourceUrl = env.resourceUrl;
          console.log(env);
          console.log("猜拳消息内容: ", value, resourceUrl);
          return this.createChatroomMsg4Component(
            "caiquan",
            msg.from,
            msg.fromAvatar,
            msg.fromNick,
            `${resourceUrl}/im/play-${value}.png`
          );
        } else if (type == 3) {
          //贴图 消息
          const catalog = content.data.catalog;
          const chartlet = content.data.chartlet;
          const emojiBaseUrl = env.emojiBaseUrl;
          const url =
            `${emojiBaseUrl}/${catalog}/${chartlet}.png?imageView&thumbnail=` +
            (catalog == "emoji" ? "28x28" : "48x48");

          return this.createChatroomMsg4Component(
            "emoji",
            msg.from,
            msg.fromAvatar,
            msg.fromNick,
            url,
            catalog
          );
        } else if (type == 10) {
          if (!onlyFormatMsg) {
            //收到聊天室权限控制消息
            const command = content.data.command;
            //收到请求有权限成员的聊天室消息【成员】
            if (command == 2) {
              //发送点对点自己有权限的通知(自己有权限时下发)
              if (NetcallState.hasPermission) {
                EXT_NIM.sendCustomSysMsg(msg.from, {
                  room_id: ChatroomState.currChatroomId,
                  command: 3,
                  uids: [NimState.account]
                });
              }
            } else if (command == 1) {
              //收到主持人通知有权限成员列表的聊天室消息【成员】，非主持人发送的直接忽略
              console.log("**** 主持人通知有权限成员列表的聊天室消息");
              const teacherAccount = Storage.get("teacherAccount");
              if (teacherAccount != msg.from) {
                console.error("非主持人发送的权限广播消息，直接忽略 ");
                return this.createChatroomMsg4Component(
                  "custom",
                  msg.from,
                  "",
                  "",
                  "聊天室自定义消息忽略不显示"
                );
                return;
              }

              const uids = content.data.uids;
              let members = [];
              let owner = ""; //教师帐号
              ChatroomState.members.forEach(item => {
                if (item && item.type === "owner") {
                  owner = item.account;
                }
              });
              uids.forEach(item => {
                if (item && item != "") {
                  if (owner === item) {
                    members.unshift({
                      account: item,
                      self: item == NimState.account
                    });
                  } else {
                    members.push({
                      account: item,
                      self: item == NimState.account
                    });
                  }

                  //互动成员则标记一下
                  const isTeacher = Storage.get("isTeacher");
                  if (isTeacher == 0) {
                    //聊天室成员互动状态标记
                    ChatroomAction.setMemberStatus(item, 1);
                  }
                }
              });

              //重置不再互动的成员状态
              ChatroomState.members.forEach(item => {
                let interactionUser = false;
                uids.forEach(item2 => {
                  if (item.account == item2) {
                    interactionUser = true;
                  }
                });
                if (!interactionUser) {
                  console.log("已不再互动的成员状态重置:", item.account);
                  ChatroomAction.setMemberStatus(item.account, 0);
                }
              });

              //处理已有互动成员在firefox 上结束互动后对应流未移除导致的黑屏问题
              let notmembers = [];
              let preventMembers = NetcallState.members;
              preventMembers.forEach((item, index) => {
                let findIdx = members.findIndex(newitem => {
                  return newitem.account == item.account;
                });
                if (findIdx == -1) {
                  notmembers.push({
                    account: item.account,
                    index: index
                  });
                }
              });

              console.log('###### 已不再netcall互动列表的人员及对应位置为：', notmembers);
 
              //如果有找到不再互动的原有节点则进行删除
              notmembers.forEach(item=>{
                const currentDom = NetcallState.doms[item.index];
                if(currentDom){
                  let ele4Video= currentDom.getElementsByTagName('div');
                  if(ele4Video.length>0){
                    ele4Video =ele4Video[0];
                    console.log('**** 清理不再互动的画面节点：', ele4Video);
                    currentDom.removeChild(ele4Video);
                  }
                }
              });

              //设置最新的RTC成员
              NetcallAction.setMembers(members);
              EXT_NETCALL.reDrawVideos();
            }
          }
        } else {
          //ignore非权限控制的自定义消息
          console.log("忽略聊天室自定义消息type: ", type);
        }

        return this.createChatroomMsg4Component(
          "custom",
          msg.from,
          "",
          "",
          "聊天室自定义消息忽略不显示"
        );
        break;
    }

    //不处理的消息直接显示默认表现
    return this.createChatroomMsg4Component(
      "custom",
      msg.from,
      "",
      "",
      "聊天室自定义消息忽略不显示"
    );
  },

  //聊天室消息处理器
  onChatroomMsgs(msgs) {
    console.log("onChatroomMsgs", msgs);

    if (!Array.isArray(msgs)) {
      msgs = [msgs];
    }

    msgs = msgs.map(msg => {
      return this.formatChatroomMsg(msg, false);
    });
    console.log("$$$$$$$ 收到消息:", msgs.length, msgs);

    //更新聊天消息列表
    ChatroomAction.setMsgs(msgs);

    //自动滚动到底部
    setTimeout(() => {
      const msgListEle = document.getElementById("chat-msg-list");
      //仅当在讨论TAB时进行自动滚动处理
      if (msgListEle) {
        msgListEle.scrollTop = msgListEle.scrollHeight;
      }
    }, 0);
  },

  //发送聊天室消息
  sendChatroomMsg(content) {
    const chatroom = ChatroomState.currChatroom;
    const that = this;
    return new Promise((resolve, reject) => {
      chatroom.sendText({
        text: content,
        done: function(error, msg) {
          if (error) {
            reject(error);
            return;
          }

          //触发页面自动渲染
          that.onChatroomMsgs([msg]);

          resolve();
        }
      });
    });
  },

  //发送聊天室自定义消息(控制权限消息)
  sendCustomMsg(data) {
    const chatroom = ChatroomState.currChatroom;
    return new Promise((resolve, reject) => {
      chatroom.sendCustomMsg({
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

  //发送聊天室猜拳消息
  sendCqMsg() {
    const chatroom = ChatroomState.currChatroom;
    const that = this;
    return new Promise((resolve, reject) => {
      chatroom.sendCustomMsg({
        content: JSON.stringify({
          type: 1,
          data: {
            value: Math.ceil(Math.random() * 3)
          }
        }),
        done: function(error, msg) {
          if (error) {
            reject(error);
            return;
          }

          //触发页面自动渲染
          that.onChatroomMsgs([msg]);

          resolve();
        }
      });
    });
  },

  //发送贴图消息
  sendPinupMsg(catalog, chartlet) {
    const chatroom = ChatroomState.currChatroom;
    const that = this;
    return new Promise((resolve, reject) => {
      chatroom.sendCustomMsg({
        content: JSON.stringify({
          type: 3,
          data: {
            catalog: catalog,
            chartlet: chartlet
          }
        }),
        pushContent: "[贴图表情]",
        done: function(error, msg) {
          if (error) {
            reject(error);
            return;
          }

          //触发页面自动渲染
          that.onChatroomMsgs([msg]);

          resolve();
        }
      });
    });
  },

  // 创建聊天室
  create(roomName) {
    const param = {
      url: env.url + "/api/chatroom/create",
      type: "POST",
      data: {
        creator: StoreNim.state.account,
        name: roomName
      }
    };
    return Ajax(param)
      .then(data => {
        if (data.res === 200) {
          const id = data.msg;
          return Promise.resolve(id);
        } else {
          return Promise.reject("创建聊天室失败");
        }
      })
      .catch(data => {
        console.error("创建聊天室请求错误或超时");
        return Promise.reject(data);
      });
  },

  // 异步请求通过roomId获取聊天室地址
  login(chatroomId) {
    const param = {
      url: env.url + "/api/chatroom/getAddress",
      type: "POST",
      dataType: "form",
      data: {
        uid: StoreNim.state.account,
        roomid: chatroomId
      }
    };
    return Ajax(param)
      .then(data => {
        console.log("获取聊天室地址", data);
        if (data.res === 200) {
          const address = data.msg.addr;
          return this._login({ chatroomId, address });
        } else {
          return Promise.reject(data.errmsg);
        }
      })
      .catch(data => {
        console.error("获取roomid对应的聊天室地址请求错误或超时", data);
        return Promise.reject(data);
      });
  },
  // 登录连接聊天室
  _login(obj) {
    const that = this;
    const { chatroomId, address } = obj;
    if (!chatroomId || !address) return Promise.reject("请输入聊天室id和地址");
    return new Promise((resolve, reject) => {
      window.chatroom = window.Chatroom.getInstance({
        appKey: env.appkey,
        account: StoreNim.state.account,
        token: StoreNim.state.token,
        chatroomId,
        chatroomAddresses: address,
        onconnect: function(chatroom) {
          console.log("聊天室连接已建立...");

          ChatroomAction.setChatroom(chatroomId, window.chatroom);
          ChatroomAction.setCurrChatroomId(chatroomId);

          // 主动进行一次成员列表数据准备，后续都在成员变更通知时进行维护(两次数据合并（非游客及游客)
          that.getFirstMemebers();

          //获取聊天室信息（识别是否在屏幕共享状态）
          that.doGetChatroom();

          resolve();
        },
        onerror: function(error, obj) {
          if (error) {
            conosole.error("chatroom::onerror", error);
            that.logout(ChatroomState.currChatroomId, "网络连接状态异常");
          }

          reject(error);
        },
        onwillreconnect: function(obj) {
          // 此时说明 `SDK` 已经断开连接, 请开发者在界面上提示用户连接已断开, 而且正在重新建立连接
          console.warn("chatroom::onwillreconnect", obj);
          Toast({
            msg: "聊天室断开，正在重连中"
          });
        },
        ondisconnect: function(error) {
          // 此时说明 `SDK` 处于断开状态, 切换聊天室也会触发该回调
          console.log("chatroom::ondisconnect", error);
          if (error) {
            switch (error.code) {
              // 账号或者密码错误, 请跳转到登录页面并提示错误
              case 302:
                // 此逻辑与nim sdk错误逻辑相同，复用nim sdk的
                // 如果单用聊天室功能需要在此做处理

                Page.to("login", "账号或者密码错误");
                break;
              case 13003:
                that.logout(
                  ChatroomState.currChatroomId,
                  "抱歉，你已被踢出该房间并被拉入了黑名单"
                );
                break;
              // 被踢, 请提示错误后跳转到登录页面
              case "kicked":
                if (error.reason === "managerKick") {
                  that.logout(
                    ChatroomState.currChatroomId,
                    "抱歉，你已被踢出该房间"
                  );
                } else if (error.reason === "samePlatformKick") {
                  that.logout(
                    ChatroomState.currChatroomId,
                    "不允许同一个帐号重复登录同一个聊天室"
                  );
                } else if (error.reason === "chatroomClosed") {
                  if (that.clickBtnClose) {
                    // 自行主动关闭聊天室
                    that.clickBtnClose = false
                    return
                  }
                  let alertTitle = ChatroomState.type != "owner" ? "老师已经结束了教学" : "抱歉，您被踢出(该账号在其他设备创建房间)"
                  Alert.open({
                    title: "提示",
                    msg:
                      `<div class="u-kickedroom"><i class="u-icon-tip"></i>${alertTitle}</div>`,
                    isHtml: true,
                    btns: [
                      {
                        label: "确认",
                        clsName: "u-btn-smaller",
                        onClick: () => {
                          console.log("【提示退出房间】 --> 确认");
                          that.doLogout();
                        }
                      }
                    ],
                    close: () => {
                      console.log("【提示退出房间】 --> X");
                      that.doLogout();
                    }
                  });
                } else {
                  that.logout(
                    ChatroomState.currChatroomId,
                    "被踢原因：" + error.reason
                  );
                }
                break;
              default:
                Toast({
                  msg: error.message
                });
                break;
            }
          }
        },
        // 聊天室消息
        onmsgs: this.onChatroomMsgs.bind(this)
      });
    });
  },

  //获取聊天室信息（用于恢复屏幕共享状态）
  doGetChatroom() {
    this.getChatroom()
      .then(obj => {
        console.log("获取聊天室信息成功:", obj);
        let custom = null;
        try {
          custom = JSON.parse(obj.chatroom.custom);
        } catch (e) {}
        if (custom == null) {
          console.error("解析custom失败");
          return;
        }
        // todo
        //设置远端是否正在屏幕共享
        NetcallAction.setVideo4ScreenShareing(custom.fullScreenType == 1);
        ChatroomAction.setCustom(custom)
      })
      .catch(error => {
        console.error("获取聊天室信息失败:", error);
      });
  },

  doLogout() {
    Alert.close();
    this.logout(ChatroomState.currChatroomId, "聊天室关闭了");
  },

  // 关闭聊天室
  close(roomId) {
    // 自行主动关闭聊天室
    this.clickBtnClose = true
    const param = {
      url: env.url + "/api/chatroom/close",
      type: "POST",
      data: {
        uid: StoreNim.state.account,
        roomid: roomId
      }
    };
    return Ajax(param)
      .then(data => {
        if (data.res === 200) {
          const id = data.msg;
          return Promise.resolve(id);
        } else {
          return Promise.reject("关闭聊天室失败");
        }
      })
      .catch(data => {
        console.error("关闭聊天室请求错误或超时");
        return Promise.reject(data);
      });
  },
  // 离开某个聊天室
  logout(chatroomId, msg) {
    //断开连接
    const chatroom = ChatroomState.currChatroom;
    chatroom && chatroom.disconnect();

    //清理全局状态
    ChatroomAction.setChatroom(chatroomId, null);
    ChatroomAction.setCurrChatroomId("");
    ChatroomAction.clearMsgs();
    ChatroomAction.clearMembers();
    ChatroomAction.setType("");
    ChatroomAction.setIsShowMemberTab(false);
    ChatroomAction.setLastTimestamp(0);
    ChatroomAction.setCanLoadHistory(true);
    ChatroomAction.setShowEmojiPanel(false);
    ChatroomAction.setHasPermissionRequest(false);

    //房间清理
    EXT_NETCALL.leaveChannel()
      .then(() => {
        console.log("RTC房间离开成功");
        EXT_NETCALL.clear();
        EXT_WHITEBOARD.leaveChannel();
        EXT_WHITEBOARD.clearAll();
      })
      .catch(error => {
        console.error("RTC房间离开失败", error);
        EXT_NETCALL.clear();
      });

    //清空标记
    Storage.remove("roomId");
    Storage.remove("isTeacher");
    Storage.remove("joinFlag");

    Page.to("home", msg);
  },
  //获取聊天室成员列表
  getChatroomMembers(guest) {
    const chatroom = ChatroomState.currChatroom;
    if (!chatroom) {
      return;
    }
    return new Promise((resolve, reject) => {
      chatroom.getChatroomMembers({
        guest: guest,
        limit: 100,
        done: function(error, obj) {
          if (error) {
            reject(error);
            return;
          }

          resolve(obj.members);
        }
      });
    });
  },
  //获取聊天室成员信息
  getChatroomMembersInfo(account) {
    const chatroom = ChatroomState.currChatroom;
    if (!chatroom) {
      return;
    }
    return new Promise((resolve, reject) => {
      chatroom.getChatroomMembersInfo({
        accounts: [account],
        done: function(error, obj) {
          if (error) {
            reject(error);
            return;
          }

          console.log(obj);
          resolve(obj);
        }
      });
    });
  },

  //获取聊天室历史消息
  getHistoryMsgs(timestamp) {
    const chatroom = ChatroomState.currChatroom;
    if (!chatroom) {
      return;
    }
    return new Promise((resolve, reject) => {
      chatroom.getHistoryMsgs({
        timetag: timestamp,
        limit: 50, //最多50条
        reverse: false,
        done: function(error, obj) {
          if (error) {
            reject(error);
            return;
          }

          console.log("历史消息: ", obj.msgs);
          resolve(obj.msgs);
        }
      });
    });
  },

  //获取聊天室信息
  getChatroom() {
    const chatroom = ChatroomState.currChatroom;
    if (!chatroom) {
      return;
    }
    return new Promise((resolve, reject) => {
      chatroom.getChatroom({
        done: function(error, obj) {
          if (error) {
            reject(error);
            return;
          }

          resolve(obj);
        }
      });
    });
  },

  // 主动进行一次成员列表数据准备，后续都在成员变更通知时进行维护(两次数据合并（非游客及游客)
  getFirstMemebers() {
    return this.getChatroomMembers(false)
      .then(members => {
        console.log("获取聊天室成员(非游客)成功", members);
        let transferMember = [];
        members.forEach(member => {
          //成员列表仅追加当前在线的
          if (member.online) {
            transferMember.push(
              this.createMember4Component(
                member.type,
                member.account,
                member.avatar,
                member.nick,
                member.enterTime
              )
            );
          }

          //预加入当前创建者，用于RTC房间预占位
          if (member.type == "owner") {
            console.log("预占位老师到RTC房间");
            Storage.set("teacherAccount", member.account);

            if (member.account == NimState.account) {
              console.log("=== 老师标记位重新设置：1");
              Storage.set("isTeacher", 1);
              NetcallAction.settabindex(0)
              NetcallAction.setShareStarted(false)
              if (ChatroomState.custom) {
                ChatroomState.custom.fullScreenType = 0 //标记屏幕共享状态 不共享
                EXT_NIM.updateChatroom(ChatroomState.custom)
              }
            }

            //新增老师
            NetcallAction.addMember({
              account: member.account,
              self: member.account == NimState.account,
              offline: !member.online
            });

            if (member.account == NimState.account) {
              console.log("=== 老师标记位重新设置：1");
              Storage.set("isTeacher", 1);
            }
          }
        });

        console.log(transferMember);

        //更新聊天室(非游客)成员列表
        ChatroomAction.setMembers(transferMember);

        return this.getChatroomMembers(true);
      })
      .then(members => {
        console.log("获取聊天室成员(游客)成功", members);
        let transferMember = [];
        members.forEach(member => {
          transferMember.push(
            this.createMember4Component(
              member.type,
              member.account,
              member.avatar,
              member.nick,
              member.enterTime
            )
          );
        });

        console.log(transferMember);

        //更新聊天室(游客)成员列表
        ChatroomAction.setMembers(transferMember);
      })
      .catch(error => {
        console.error("获取聊天室成员失败", error);
      });
  }
};
