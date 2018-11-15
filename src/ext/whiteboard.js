/*
 * @Author: lduoduo 
 * @Date: 2018-02-02 19:25:00 
 * @Last Modified by: qiusa
 * @Last Modified time: 2018-07-25 14:43:20
 * 连接白板的各种操作
 * 组件调用方式:
 * 1. import {BB} from 'ext'
 * 2. 注册事件完成监听，在对应的目标组件上做出对应的UI处理
 * 功能点包括:
 * 1. 加入白板房间
 * 2. 连接白板服务器
 * 3. 采集、绘制白板数据
 * 4. 会话结束，退出白板房间
 */
import { Storage } from 'util';

import { StoreWhiteBoard, StoreChatroom } from 'store';
import { Pipes } from 'util';

const WhiteBoardState = StoreWhiteBoard.state;
const ChatroomState = StoreChatroom.state;

// 挂载白板插件
//window.WhiteBoard.use(whiteboard)

export default {
  wb: null,
  info: null,
  // 是否正在白板会话中
  calling: false,
  initSDK() {
    if (this.wb) return;
    window.whiteboard = this.wb = WhiteBoard.getInstance({
      nim: window.nim,
      debug: false
    });
    
    this.bindEvent();
    // 这里注册文档上传转码通知事件
    window.nim.on('notifyTransLog', function(data) {
      console.log('notifyTransLog', data);
      // data.state = WhiteBoardState.serializeFileStateMap['TRANSCOMPLETE'];
      // data.percent = 100;
      StoreWhiteBoard.setFileState(data);
    });
    this.initDrawPlugin()
  },
  initDrawPlugin() {
    this.drawPlugin = new DrawPlugin(WhiteBoardState.node, {
      UID: this.wb.getAccount(),
      nim: window.nim
    })
    this.drawPlugin.on('data', (obj) => {
      let { toAccount = 0, data } = obj
      if (!data) return
      this.wb.sendData({ toAccount, data })
    })
  },
  bindEvent() {
    const wb = this.wb;
    const that = this;
    wb.on('signalClosed', function(obj) {
      that.hangup && that.hangup();
      console.error('on signalClosed', obj);
    });
    wb.on('error', function(obj) {
      that.hangup && that.hangup();
      console.error('on error', obj);
    });
    wb.on('joinChannel', function(obj) {
      console.log('onJoinChannel', obj)
      if (obj.account === Storage.get('teacherAccount')) {
        that.lazySync()
      }
    })
    wb.on('data', function(obj) {
      console.log('data', obj);
      that.drawPlugin && that.drawPlugin.act({ account: obj.account, data: obj.data })
    });
    wb.on('leaveChannel', function(obj) {
      console.log('onLeaveChannel', obj);
    });
    wb.on('control', function(obj) {
      // 如果不是当前通话的指令, 直接丢掉
      if (wb.notCurrentChannelId(obj)) {
        return;
      }
      console.log('onControl', obj);
    });
  },
  createChannel(roomId) {
    console.log('wb::createChannel', roomId);
    return this.wb
      .createChannel({
        channelName: roomId
      })
      .then(obj => {
        console.log('wb::createChannel success', obj);
      })
      .catch(err => {
        console.error('wb::createChannelErr', err);
        return Promise.reject(err);
      });
  },
  _startSession() {
    return this.wb.startSession();
  },
  clearAll() {
    this.wb.destroy()
    this.wb = null;
    window.whiteboard = null;
    StoreWhiteBoard.whiteboard = null;
    this.drawPlugin.destroy()
    this.drawPlugin = null
  },
  joinChannel(roomId) {
    if (!this.wb) return Promise.reject('wb::没有实例化');
    console.log('wb::joinChannel', roomId);
    this.info = {
      channelName: roomId,
      sessionConfig: {
        color: '#000'
        // backgroundUrl: '/9b4d8b1c088192bc45b29b463a456c57.svg'
      }
    };
    return Pipes(this._joinChannel.bind(this), this._startSession.bind(this))
      .then(e => {
        console.log('wb::session Started', e);
      })
      .catch(e => {
        console.error('wb::joinChannelErr', e);
        this.wb.leaveChannel();
        return Promise.reject(e);
      });
  },
  _joinChannel() {
    return this.wb.joinChannel(this.info).then(() => {
      this.lazySyncOwner()
      return Promise.resolve()
    })
  },
  leaveChannel() {
    console.log('wb::leaveChannel');
    this.wb && this.wb.leaveChannel();
    StoreWhiteBoard.reset();
  },
  // 延迟分角色加载
  lazySync() {
    setTimeout(() => {
      console.log('joinChannel SYNC', ChatroomState.type)
      if (!ChatroomState.type) {
        return this.lazySync()
      }
      if (ChatroomState.type !== 'owner') {
        const teacherAccount = Storage.get('teacherAccount')
        console.log('makeSync', teacherAccount)
        this.syncRequest(teacherAccount)
      }
    }, 50)
  },
  lazySyncOwner() {
    setTimeout(() => {
      console.log('joinChannel SYNC', ChatroomState.type)
      if (!ChatroomState.type) {
        return this.lazySyncOwner()
      }
      if (ChatroomState.type === 'owner') {
        // 如果没有数据列表，先尝试拉取
        this.getFileList()
        this.syncBegin()
      }
    }, 50)
  },
  // 设置容器
  setContainer(node) {
    console.log('wb::setContainer', node);
    StoreWhiteBoard.setContainer(node);
    this.drawPlugin && this.drawPlugin.setContainer(node);
  },
  // 设置颜色
  setColor(color) {
    this.drawPlugin && this.drawPlugin.setColor(color);
    StoreWhiteBoard.setColor(color);
  },
  // 在加入互动时，检查确认颜色
  checkColor() {
    this.setColor(WhiteBoardState.currentDrawColor)
  },
  // 观众权限:禁止绘图
  changeRoleToAudience() {
    console.log('wb::changeRoleToAudience');
    this.drawPlugin && this.drawPlugin.changeRoleToAudience();
  },
  // 互动者权限:允许绘图
  changeRoleToPlayer() {
    console.log('wb::changeRoleToPlayer');
    this.drawPlugin && this.drawPlugin.changeRoleToPlayer();
  },
  // 设置绘图模式: 激光笔
  setDrawModeFlag: function() {
    this.drawPlugin && this.drawPlugin.setDrawMode('flag');
    StoreWhiteBoard.setDrawMode('flag');
  },
  // 设置绘图模式: 自由绘图模式
  setDrawModeFree: function() {
    this.drawPlugin && this.drawPlugin.setDrawMode('free');
    StoreWhiteBoard.setDrawMode('free');
  },
  // 撤销
  undo() {
    this.drawPlugin && this.drawPlugin.undo();
  },
  // 反撤销
  redo() {
    this.drawPlugin && this.drawPlugin.redo();
  },
  // 清除
  clear() {
    this.drawPlugin && this.drawPlugin.clear();
  },
  // 文档上传
  uploadFile() {
    const fileInput = WhiteBoardState.fileInput;
    if (!fileInput) return;
    let docIdDone = null;

    console.log('uploadFile111');
    const param = {
      // 转码支持
      transcode: 'jpg',
      type: 'file',
      beginupload(data) {
        // - 如果开发者传入 fileInput, 在此回调之前不能修改 fileInput
        // - 在此回调之后可以取消图片上传, 此回调会接收一个参数 `upload`, 调用 `upload.abort();` 来取消文件上传
        const { fileInputName, transtype, docId } = data.options;
        docIdDone = docId;
        console.log('beginupload', data.options);
        console.log('fileInputName type', fileInputName, transtype);
        StoreWhiteBoard.addFile({
          docId,
          name: fileInputName,
          mime: transtype,
          state: 11,
          percent: 0,
          prefix: ''
        });
      },
      uploadprogress(data) {
        console.log('uploadprogress', data);
        const param = {
          docId: data.docId,
          percent: data.percentage
        };
        if (param.percent === 100) {
          param.state = WhiteBoardState.serializeFileStateMap['TRANSING'];
          param.percent = 0;
        }
        StoreWhiteBoard.setFileState(param);
      },
      uploaddone(error, file) {
        console.log('uploaddone', error, file, docIdDone);
        const param = {
          docId: docIdDone,
          name: file.fileInputName,
          percent: 100,
          state: 2
        };
        if (error) {
          param.state = WhiteBoardState.serializeFileStateMap['UPLOADFAIL'];
        } else {
          param.state = WhiteBoardState.serializeFileStateMap['TRANSING'];
          param.percent = 0;
        }

        StoreWhiteBoard.setFileState(param);
      },
      done(a, b) {
        console.log('send file done', a, b);
      }
    };

    if (fileInput) {
      param.fileInput = fileInput;
    }
    window.nim.previewFile(param);
  },
  // 设置背景
  setImage(index = 1, item = WhiteBoardState.currentFile) {
    console.log('setImage', item);
    const name = item.name.replace(/\.\w+$/, '');
    const url = `${item.prefix}_${item.type}_${index}.${WhiteBoardState.fileTypeMap[item.transType]}`;
    this.drawPlugin &&
      this.drawPlugin.image({
        url,
        docId: item.docId,
        pageCount: item.pageCount,
        currentPage: index
      });
    StoreWhiteBoard.setCurrentFilePage(index);
  },
  // 取消背景设置
  clearFile() {
    this.drawPlugin && this.drawPlugin.clearImage();
    // 拿掉背景文档
    StoreWhiteBoard.setCurrentFile(-1);
  },
  // 删除文件
  deleteFile(docId) {
    window.nim.deleteFile({
      docId,
      error: function(a, b) {
        console.error('deleteFile error', a, b);
      },
      success: function() {
        console.log('deleteFile success');
        //清空进度条 & 删除文件
        const param = {
          docId: docId,
          percent: 0,
          state: WhiteBoardState.serializeFileStateMap['TRANSING']
        };
        StoreWhiteBoard.setFileState(param);
        StoreWhiteBoard.deleteFile(docId);
      }
    });
  },
  // 拉取具体文件
  getFile(docId) {
    window.nim.getFile({
      docId,
      success: function(data) {
        console.log('getFile success', data);
      },
      error: function(error) {
        console.error('getFile error', error);
      }
    });
  },
  // 拉取文件列表
  getFileList() {
    console.log('getFileList');
    window.nim.getFileList({
      limit: 30,
      success: function(data) {
        console.log('getFileList success', data);
        StoreWhiteBoard.setFileList({
          list: data.list,
          count: data.totalCount
        });
      },
      error: function(error) {
        console.error('getFileList error', error);
      }
    });
  },
  // 同步准备
  syncBegin() {
    this.drawPlugin && this.drawPlugin.syncBegin();
  },
  // 同步请求
  syncRequest(account) {
    this.drawPlugin && this.drawPlugin.syncRequest(account);
  }
};
