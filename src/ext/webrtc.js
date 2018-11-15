import env from "../env";
import { StoreNim, StoreNetcall, StoreChatroom, StoreEventPool } from "store";
import { Netcall } from "../module";
import { Alert, Toast, Loading, Storage, Ajax } from "util";

import EXT_NIM from "ext/nim";
import EXT_CHAT from "ext/chatroom";
import EXT_NETCALL from "ext/webrtc";
import EXT_EVENTPOOL from "ext/eventpool";

const NimState = StoreNim.state;
const NimAction = StoreNim;
const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;
const EventPoolAction = StoreEventPool;
const EventPoolState = StoreEventPool.state;

export default {
  initSDK() {
    console.log('无WEBRTC实例，进行初始化...')
    NIM.use(WebRTC)

    window.webrtcIns = window.WebRTC.getInstance({
      debug: true,
      nim: NimState.nim,
      chromeId: 'gapafbpmfemleaplicdhhcikajbogpkf'
    })

    //设置当前已有RTC对象（后续操作要用）
    NetcallAction.setWebRtc(window.webrtcIns)

    //通知事件接收绑定
    this.switchEventListener(true)
  },

  switchEventListener(add) {
    const webrtc = NetcallState.webrtc
    const op = add ? 'on' : 'removeListener'
    webrtc[op]('joinChannel', this.onJoinChannel.bind(this))
    webrtc[op]('leaveChannel', this.onLeaveChannel.bind(this))
    webrtc[op]('deviceStatus', this.onDeviceStatus.bind(this))
    webrtc[op]('deviceAdd', this.onDeviceAdd.bind(this))
    webrtc[op]('deviceRemove', this.onDeviceRemove.bind(this))
    webrtc[op]('audioVolume', this.onAudioVolume.bind(this))
    webrtc[op]('remoteSignalClosed', this.onRemoteSignalClosed.bind(this))
    webrtc[op]('signalClosed', this.onSignalClosed.bind(this))
    webrtc[op]('remoteTrack', this.onRemoteTrack.bind(this))
    webrtc[op]('control', this.onControlTrack.bind(this))
  },

  onJoinChannel(obj) {
    console.log('==== webrtc房间有人加入了', obj)
  },
  onLeaveChannel(obj) {
    console.log('==== webrtc房间有人离开了', obj)

    //清理原房间成员昵称
    const teacherAccount = Storage.get('teacherAccount')
    if (teacherAccount != obj.account) {
      console.log('学生下线，清理房间占位')
      NetcallAction.delMember(obj.account)
    } else {
      console.log('老师下线，不清理房间占位')
      NetcallAction.setTeacherStatus(obj.account, true)
    }

    // 需要重新调整房间内成员的显示
    EXT_NETCALL.reDrawVideos()

    //清理自己的互动标记位
    if (obj.account == NimState.account) {
      Storage.set('hasPermission', false)
    }
  },
  onDeviceStatus(data) {
    console.log('==== webrtc 设备变更: ', data)
  },

  onDeviceAdd(data) {
    console.log('==== webrtc设备新增', data)
    // 
    data.forEach(obj => {
      if (obj.type == 'video') {
        NetcallAction.setHasVideo(true)
        // 屏幕共享下不再操作摄像头
        if (NetcallState.tabIndex == 0) {
          this.doStartCamera()
        }
      } else if (obj.type == 'audioIn') {
        this.doStartMicro()
      }
    })
  },
  onDeviceRemove(data) {
    console.log('==== webrtc设备移除', data)
    data.forEach(obj => {
      if (obj.type == 'video') {
        NetcallState.webrtc
          .getDevicesOfType(WebRTC.DEVICE_TYPE_VIDEO)
          .then(devices => {
            if (devices.length > 0) {
              this.doStartCamera()
            } else {

              NetcallAction.setHasVideo(false)
              EXT_NETCALL.stopLocalStream()
            }
          })
      } else if (obj.type == 'audioIn') {
        NetcallState.webrtc
          .getDevicesOfType(WebRTC.DEVICE_TYPE_AUDIO_IN)
          .then(devices => {
            if (devices.length > 0) {
              this.doStartMicro()
            } else {
              NetcallAction.setHasAudio(false)
            }
          })
      }
    })
  },

  onAudioVolume(obj) {
    // console.log("==== audioVolume", obj);
    const keys = Object.keys(obj)
    // console.log("keys:", keys);
    keys.forEach(key => {
      if (key == 'self') {
        ChatroomAction.setMemberAudioVolume(NimState.account, obj[key].status)
      } else {
        ChatroomAction.setMemberAudioVolume(key, obj[key].status)
      }
    })
  },

  onRemoteSignalClosed(obj) {
    console.log('==== remoteSignalClosed ', obj)
  },
  onSignalClosed(obj) {
    console.log('==== signalClosed ', obj)
    const teacherAccount = Storage.get('teacherAccount')

    //自己是老师
    if (NimState.account == teacherAccount) {
      NetcallAction.setTeacherStatus(teacherAccount, true)
    } else {
      //自己是学生
      NetcallAction.delMember(NimState.account)
      NetcallAction.setHasPermission(false)
    }
    ChatroomAction.delMember(NimState.account)
  },

  onRemoteTrack(obj) {
    console.log('==== 收到远程轨道', obj)
    const account = obj.account
    console.log('remote account：', account)

    if (obj.track.kind == 'video') {
      //设置互动video轨道已开
      EventPoolAction.addRemoteTrackNotification(account)

      //触发管道：remoteTrack标记+(老师权限通知|有权限成员)点对点消息
      EXT_EVENTPOOL.handleRtcPermissionAndDraw(account)
    } else if (obj.track.kind == 'audio') {
      //播放全部
      EXT_NETCALL.startPlayRemoteAudio()
    }
  },
  onControlTrack(obj) {
    console.log('触发控制', obj)
  },
  doStartCamera() {
    NetcallAction.setHasVideo(true)

    //有可用设备则直接尝试开启
    if (NetcallState.video) {
      console.log('当前需要开启摄像头...')
      const findIdx = NetcallState.members.findIndex(item => {
        return item.account == NimState.account
      })
      if (findIdx == -1) {
        console.error('未找到当前RTC房间互动者:', NimState.account)
        return
      }

      const dom = NetcallState.doms[findIdx]
      if (!dom) {
        console.error('@@@@ 不存在的节点，忽略渲染本地流')
        return
      }
      console.log('当前人员加入节点：', dom)

      //启用新设备并渲染画面
      EXT_NETCALL.startCamera()
        .then(() => {
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
      console.log('当前不需要开启摄像头...')
    }
  },

  doStartMicro() {
    NetcallAction.setHasAudio(true)

    //有可用设备则直接尝试开启
    if (NetcallState.audio) {
      console.log('当前需要开启麦克风...')
      const findIdx = NetcallState.members.findIndex(item => {
        return item.account == NimState.account
      })
      if (findIdx == -1) {
        console.error('未找到当前RTC房间互动者:', NimState.account)
        return
      }

      //启用新设备并渲染画面
      EXT_NETCALL.startMicro()
        .then(() => {
          console.log('其他【麦克风】设备自动开启成功：')
        })
        .catch(error => {
          console.error('其他【麦克风】设备自动开启失败：', error)

          //禁用状态识别
          //chrome
          if (error == 'NotAllowedError') {
            NetcallAction.setHasAudio(false)
          }
        })
    } else {
      console.log('当前不需要开启麦克风...')
    }
  },

  //创建房间
  createChannel(roomId) {
    console.log('createChannel -> ', roomId)

    return NetcallState.webrtc.createChannel({
      channelName: roomId,
      webrtcEnable: true
    })
  },

  //加入房间
  joinChannel(roomId) {
    console.log('joinChannel -> ', roomId)
    const sessionConfig = {
      videoQuality: WebRTC.CHAT_VIDEO_QUALITY_HIGH,
      videoFrameRate: WebRTC.CHAT_VIDEO_FRAME_RATE_25,
      highAudio: false
    }

    return NetcallState.webrtc.joinChannel({
      channelName: roomId,
      type: WebRTC.NETCALL_TYPE_VIDEO,
      sessionConfig: sessionConfig
    })
  },
  //离开房间
  leaveChannel() {
    console.log('leaveChannel')
    return NetcallState.webrtc.leaveChannel()
  },

  //离开房间后清理全局状态
  clear() {
    //连接与设备
    // this.stopLocalStream()
    // this.stopRemoteStream()
    // if (NetcallState.audio) {
    //   this.stopMicro()
    //     .then(() => {
    //       console.log('=== 离开房间后清理：关闭麦克风成功')
    //     })
    //     .catch(error => {
    //       console.error('=== 离开房间后清理：关闭麦克风失败', error)
    //     })
    // }

    // if (NetcallState.video) {
    //   this.stopCamera()
    //     .then(() => {
    //       console.log('=== 离开房间后清理：关闭摄像头成功')
    //     })
    //     .catch(error => {
    //       console.error('=== 离开房间后清理：关闭摄像头失败', error)
    //     })
    // }

    //状态清理
    this.switchEventListener(false)

    //销毁原有单例
    window.WebRTC.destroy()

    window.webrtcIns = null
    NetcallAction.setWebRtc(null)
    NetcallAction.setVideo4ScreenShareing(false)
    NetcallAction.setScreenShareing4Local(false)
    NetcallAction.clearDoms()
    NetcallAction.setFromCreate(false)
    NetcallAction.setHasPermission(false)
    NetcallAction.setShowStatus(0)
    NetcallAction.clearMembers()
    NetcallAction.setVideo(true)
    NetcallAction.setAudio(true)

    //全局通知状态清理
    EventPoolAction.clearRemoteTrackNotifications()

    //重新检测当前机器的可用设备
    WebRTC.checkCompatibility()
      .then(data => {
        let hasCamera = data.Camera
        let hasMicrophone = data.Microphone
        console.log(data)

        //设置当前用户的麦克风与摄像头的状态
        NetcallAction.setHasAudio(hasMicrophone)
        NetcallAction.setHasVideo(hasCamera)
      })
      .catch(error => {
        console.error('获取当前机器可用设备时异常: ', error)
        NetcallAction.setHasAudio(false)
        NetcallAction.setHasVideo(false)
      })

    Storage.remove('hasPermission')
    Storage.remove('teacherAccount')
  },

  //重新渲染画面
  reDrawVideos() {
    NetcallState.members.forEach((item, index) => {
      const account = item.account
      if (account == '') {
        console.log('ignore Unknown account', index)
        return
      }
      //自已
      if (account == NimState.account) {
        console.log('重新渲染自己本地画面', account)
        EXT_NETCALL.startLocalStream(NetcallState.doms[index])
        EXT_NETCALL.setVideoViewSize()
      } else {
        //他人
        console.log('重新渲染远程画面', account)
        EXT_EVENTPOOL.handleRtcPermissionAndDraw(account, index)
      }
    })
  },
  //开启麦克风
  startMicro() {
    return NetcallState.webrtc.startDevice({
      type: WebRTC.DEVICE_TYPE_AUDIO_IN
    })
  },
  //开启摄像头
  startCamera() {
    return NetcallState.webrtc.startDevice({
      type: WebRTC.DEVICE_TYPE_VIDEO
    })
  },
  //开启chrome屏幕共享
  startChromeShareScreen() {
    return NetcallState.webrtc.startDevice({
      type: WebRTC.DEVICE_TYPE_DESKTOP_CHROME_SCREEN
    })
  },
  //停止麦克风
  stopMicro() {
    return NetcallState.webrtc.stopDevice(WebRTC.DEVICE_TYPE_AUDIO_IN)
  },
  //停止摄像头
  stopCamera() {
    return NetcallState.webrtc.stopDevice(WebRTC.DEVICE_TYPE_VIDEO)
  },

  //预览本地摄像头
  startLocalStream(node) {
    NetcallState.webrtc.startLocalStream(node)
  },

  //停止预览本地摄像头
  stopLocalStream(node) {
    NetcallState.webrtc.stopLocalStream(node)
  },
  stopLocalStream() {
    NetcallState.webrtc.stopLocalStream()
  },
  //角色切换(切为互动者)
  changeRoleToPlayer() {
    return NetcallState.webrtc.changeRoleToPlayer()
  },
  //角色切换(切为观众)
  changeRoleToAudience() {
    return NetcallState.webrtc.changeRoleToAudience()
  },
  //开启rtc
  startRtc() {
    NetcallState.webrtc.startRtc()
  },
  //预览远程视频流
  startRemoteStream(account, node) {
    NetcallState.webrtc.startRemoteStream({
      account: account,
      node: node
    })
  },

  //停止预览远程视频流
  stopRemoteStream(account) {
    NetcallState.webrtc.stopRemoteStream(account)
  },

  stopRemoteStream() {
    NetcallState.webrtc.stopRemoteStream()
  },

  //播放本地音频
  startPlayLocalAudio() {
    return NetcallState.webrtc.startDevice({
      type: WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL
    })
  },
  //停止播放本地音频
  stopPlayLocalAudio() {
    return NetcallState.webrtc.stopDevice(WebRTC.DEVICE_TYPE_AUDIO_OUT_LOCAL)
  },
  //播放远程音频
  startPlayRemoteAudio(account) {
    return NetcallState.webrtc.startDevice({
      type: WebRTC.DEVICE_TYPE_AUDIO_OUT_CHAT,
      account: account
    })
  },
  //播放远程音频
  startPlayRemoteAudio() {
    return NetcallState.webrtc.startDevice({
      type: WebRTC.DEVICE_TYPE_AUDIO_OUT_CHAT
    })
  },
  //停止播放远程音频
  stopPlayRemoteAudio(account) {
    NetcallState.webrtc.stopDevice({
      type: WebRTC.DEVICE_TYPE_AUDIO_OUT_CHAT,
      account: account
    })
  },

  //设置本地视频画面大小
  setVideoViewSize() {
    // 延时处理 避免未取到流的情况下无法获取videoWidth和videoHeight
    setTimeout(() => {
      NetcallState.webrtc.setVideoViewSize({
        width: 139,
        height: 104,
        cut: true
      })
    }, 200);
  },

  //设置远程视频画面大小
  setVideoViewRemoteSize(account, width = 139, height = 104) {
    NetcallState.webrtc.setVideoViewRemoteSize({
      account: account,
      width: width,
      height: height,
      cut: true
    })
  }
}
