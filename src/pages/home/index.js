/*
 * @Author: lduoduo 
 * @Date: 2018-01-24 16:06:27 
 * @Last Modified by: andyzou
 * @Last Modified time: 2018-08-30 17:27:32
 * 登录进来的首页，创建房间、加入房间的页面
 * 注：
 */
import React, { Component } from "react";
import { observer } from "mobx-react";

import { PageHeader, PageBody, PageFooter } from "layout";
import { Header } from "layout";
import { TextArea, Button, Row, Col, Input } from "component";

import { Toast, Storage, Page, Valid, CheckBroswer } from "util";
import { StoreNim, StoreChatroom, StoreNetcall } from "store";

import EXT_NIM from "ext/nim";
import EXT_CHAT from "ext/chatroom";

const NimState = StoreNim.state;
const NimAction = StoreNim;
const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NetcallAction = StoreNetcall;
const NetcallState = StoreNetcall.state;

@observer
export default class Home extends Component {
  state = {
    roomName: "",
    roomId: "",
    netDetectStatus: "",
    baseImfo: "",
    netDetectResult: null,
    netDetectStyle: {
      display:"none"
    },
    webrtcInstance: null,
    showRoomNameTip: false,
    showRoomIdTip: false,
    roomNameErrorMsg: "", //创建房间错误提示
    roomIdErrorMsg: "", //加入房间错误提示
    canCreate: false,
    canJoin: false,
    createLoading: false,
    joinLoading: false
  };

  componentDidMount() {
    CheckBroswer({
      success: this.autoLogin.bind(this)
    });

    this.startNetDetect()
  }

  startNetDetect(){
    if (this.state.netDetectResult || this.state.netDetectStatus !== ""){
      return
    }
    this.setState({
      netDetectStatus: "网络状况: 检测中..."
    });
    console.log("开始网络检测")

    let webrtcInstance = window.WebRTC.getInstance({
      debug: true,
      nim: NimState.nim,
      chromeId: 'gapafbpmfemleaplicdhhcikajbogpkf'
    })
    if (webrtcInstance && webrtcInstance.detectNetworkStatus) {
      webrtcInstance.detectNetworkStatus({detectTime: 10}).then((data) => {
        let netDetectStatus = "网络状况: 网络状况检测失败!"
        if (data) {
          console.log("网络探测完成: ", JSON.stringify(data, null, ' '));
          if (!this.state || this.state.netDetectStatus != "网络状况: 检测中...") {
            return
          }
          this.setState({
            netDetectResult: data
          })
          webrtcInstance.destroy();
          webrtcInstance = null;
          netDetectStatus = data.upload_network_status[0].network_status;
        }
        this.setState({
          netDetectStatus: netDetectStatus
        })
      }).catch((error)=>{
        console.log("网络探测出现错误: ", error);
        if (!this.state || this.state.netDetectStatus != "网络状况: 检测中...") {
          return
        }
        this.setState({
          netDetectStatus: "网络状况: 网络状况检测失败!"
        });
      });
    } else {
      this.setState({
        netDetectStatus: "网络状况: 网络状况非常好，音视频通话均流畅"
      });
    }
  }

  showNetStatus = e =>{
    let desc = "";
    if (this.state.netDetectResult && this.state.netDetectResult.upload_network_status) {
      desc = "本地IP地址：" + this.state.netDetectResult.user_ip + "\n" +
            "丢包率：" + this.state.netDetectResult.loss_rate + "\n" +
            "带宽：" + this.state.netDetectResult.upload_network_status[0].up_bwe + "kbps\n" +
            "延迟：" + this.state.netDetectResult.upload_network_status[0].up_rtt + "ms\n" +
            "帧率：" + this.state.netDetectResult.upload_network_status[0].up_framerate + "\n" +
            "分辨率：" + this.state.netDetectResult.upload_network_status[0].up_resolution            
    } else {
      desc = this.state.netDetectStatus
    }

    this.setState({
      baseImfo: desc,
      netDetectStyle: {
        display:"block"
      }
    })
  }

  hideNetStatus = e =>{
    this.setState({
      netDetectStyle: {
        display:"none"
      }
    })
  }

  autoLogin() {
    if (NimState.account) {
      this.autoLoginChatroom();
      return;
    }

    console.log("home:开始自动登录nim过程...");

    const account = Storage.get("account");
    const token = Storage.get("token");

    if (!account || !token) {
      console.error("home:自动登录nim:缺少account或token");
      Page.to("login");
      return;
    }

    //步骤1：NIM登录
    EXT_NIM.login(account, token)
      .then(() => {
        console.log("home:自动登录nim成功");

        //继续登录聊天室
        this.autoLoginChatroom();
      })
      .catch(error => {
        console.error("home:自动登录nim失败");

        Page.to("login", error);
      });
  }

  autoLoginChatroom() {
    if (ChatroomState.currChatroom) {
      console.log("home:已登录，自动切换到main");
      Page.to("main");
      return;
    }
    console.log("home:开始自动登录chatroom过程...");

    //步骤2：聊天室登录
    const roomId = Storage.get("roomId");
    if (!roomId) {
      console.warn("home:自动登录chatroom失败：缺少roomid，首次登陆请忽略！");
      this.roomIdInput.focus();
      return;
    }

    this.setState({
      showRoomIdTip: false,
      roomIdErrorMsg: "",
      joinLoading: true
    });

    EXT_CHAT.login(roomId)
      .then(() => {
        console.log("home:自动登录chatroom成功");

        //加入房间后直接跳转到白板页面
        this.preHandleRedirect();
      })
      .catch(error => {
        console.error("home:自动登录chatroom失败");

        this.setState({
          showRoomIdTip: true,
          roomIdErrorMsg: error,
          joinLoading: false
        });

        this.roomIdInput.focus();
      });
  }
  changeRoomName = e => {
    if (this.state.netDetectStatus == "网络状况: 检测中..."){
      alert("正在网络检测，请稍后创建房间")
      return
    }

    const roomName = e.target.value;
    if (Valid.isBlank(roomName)) {
      this.setState({
        roomName: "",
        canCreate: false
      });
      return;
    }

    this.setState({
      roomName: roomName.trim(),
      canCreate: true
    });
  };

  changeRoomId = e => {
    if (this.state.netDetectStatus == "网络状况: 检测中..."){
      alert("正在网络检测，请稍后加入房间")
      return
    }

    const roomId = e.target.value;
    if (Valid.isBlank(roomId)) {
      this.setState({
        roomId: "",
        canJoin: false
      });
      return;
    }

    this.setState({
      roomId: roomId.trim(),
      canJoin: true
    });
  };

  preHandleRedirect() {
    //检测当前机器的可用设备
    console.log("检测当前机器的可用设备....");
    WebRTC.checkCompatibility()
      .then(data => {
        let hasCamera = data.Camera;
        let hasMicrophone = data.Microphone;
        console.log("--- 设备状态", data);

        //设置当前用户的麦克风与摄像头的状态
        NetcallAction.setHasAudio(hasMicrophone);
        NetcallAction.setHasVideo(hasCamera);
      })
      .catch(error => {
        console.error("获取当前机器可用设备时异常: ", error);
        NetcallAction.setHasAudio(false);
        NetcallAction.setHasVideo(false);
      });

    Page.to("main");
  }
  createRoom = e => {
    console.log("submit createRoom");

    if (!this.state.canCreate || this.state.createLoading) {
      console.log("不可创建或正在创建中...");
      return;
    }

    if (Valid.isBlank(this.state.roomName)) {
      this.setState({
        showRoomNameTip: true,
        roomNameErrorMsg: "房间名称不能为空"
      });
      return;
    }

    this.setState({
      showRoomNameTip: false,
      roomNameErrorMsg: "",
      createLoading: true
    });

    //创建房间
    EXT_CHAT.create(this.state.roomName)
      .then(id => {
        console.log("创建房间成功");

        Storage.set("teacherAccount", NimState.account);

        // 创建成功后就登录聊天室
        EXT_CHAT.login(id)
          .then(() => {
            console.log("加入房间成功");

            //用于刷新自动进入
            Storage.set("roomId", id);
            Storage.set("isTeacher", 1);
            Storage.set("hasPermission", true);

            //加入房间后直接跳转到白板页面
            this.preHandleRedirect();
          })
          .catch(error => {
            console.error("加入房间失败", error);

            //错误消息无内容时的容错
            if (!error) {
              error = "加入房间失败";
            }

            this.setState({
              showRoomNameTip: true,
              roomNameErrorMsg: error,
              createLoading: false
            });
          });
      })
      .catch(error => {
        console.error("创建房间失败", error);

         //提示文案调整
         if (error == "聊天室已关闭") {
          error = "房间不存在";
        }

        this.setState({
          showRoomNameTip: true,
          roomNameErrorMsg: error,
          createLoading: false
        });
      });
  };

  joinRoom = e => {
    console.log("submit joinRoom");

    if (!this.state.canJoin || this.state.joinLoading) {
      console.log("不可加入或正在加入中...");
      return;
    }

    if (Valid.isBlank(this.state.roomId)) {
      this.setState({
        showRoomIdTip: true,
        roomIdErrorMsg: "房间ID号码不能为空"
      });
      return;
    }

//     if (!/^[0-9]{8,10}$/.test(this.state.roomId)) {
//       this.setState({
//         showRoomIdTip: true,
//         roomIdErrorMsg: "房间ID不存在"
//       });
//       return;
//     }

    this.setState({
      showRoomIdTip: false,
      roomIdErrorMsg: "",
      joinLoading: true
    });

    //加入房间
    EXT_CHAT.login(this.state.roomId)
      .then(() => {
        console.log("加入房间成功");

        //用于刷新自动进入
        Storage.set("roomId", this.state.roomId);
        Storage.set("isTeacher", 0);

        //加入房间后直接跳转到白板页面
        this.preHandleRedirect();
      })
      .catch(error => {
        console.error("加入房间失败", error);

        //提示文案调整
        if (error == "聊天室已关闭") {
          error = "房间不存在";
        }

        //错误消息无内容时的容错
        if (!error) {
          error = "加入房间失败";
        }

        this.setState({
          showRoomIdTip: true,
          roomIdErrorMsg: error,
          joinLoading: false
        });
      });
  };

  render() {
    // console.log("render home");
    const state = this.state;
    return (
      <div>
        <Header isHome={true} />
        <div className="m-home">
          <div className="net-detect"> 
            <div className="layer1">
              <div className="wifi"></div>
            </div>
            <div className="describe"> {state.netDetectStatus} </div>
            <div 
              className="u-tips-mark"
              onMouseOver={this.showNetStatus}
              onMouseOut={this.hideNetStatus}
            >
              <div className="tips-mark"></div>
            </div>
          </div>
          <div className="detectResult-tips" style={state.netDetectStyle}> 
            <TextArea id="test" className="base-imfo" value={state.baseImfo}/>
          </div>
          <div className="split-line"></div>

          <div className="part part-1">
            <div className="icon icon-createroom" />
            <div className="item item-1 f-tac">
              <Input
                placeholder="请输入房间名称"
                value={state.roomName}
                onChange={this.changeRoomName}
                domRef={input => {
                  this.roomNameInput = input;
                }}
              />
            </div>
            <div className="errortip " hidden={!state.showRoomNameTip}>
              {state.roomNameErrorMsg}
            </div>
            <div className="item item-2  f-tac">
              <Button
                className="u-btn-longer"
                onClick={this.createRoom}
                loading={state.createLoading}
                disabled={!state.canCreate}
              >
                创建房间
              </Button>
            </div>
          </div>
          <div className="part part-2">
            <div className="icon icon-joinroom" />
            <div className="item item-1 f-tac">
              <Input
                name="roomId"
                placeholder="请输入房间ID号码"
                onChange={this.changeRoomId}
                value={state.roomId}
                domRef={input => {
                  this.roomIdInput = input;
                }}
              />
            </div>
            <div className="errortip " hidden={!state.showRoomIdTip}>
              {state.roomIdErrorMsg}
            </div>
            <div className="item item-2  f-tac">
              <Button
                className="u-btn-longer"
                onClick={this.joinRoom}
                loading={state.joinLoading}
                disabled={!state.canJoin}
              >
                加入房间
              </Button>
            </div>
            <div className="tip">注：房间ID为创建房间后左上角的数字</div>
          </div>
        </div>
      </div>
    );
  }
}
