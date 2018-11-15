/*
 * @Author: lduoduo 
 * @Date: 2018-01-28 15:42:40 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-03-07 10:12:58
 * IM状态保持
 */

import { observable, computed, action, useStrict } from 'mobx';
useStrict(true);

import defaultConfig from '../config';

import { Logger } from 'util';

console.log('Storage', Storage);
console.log('Logger', Logger);
export default class {
  @observable
  state = {
    account: '',
    token: '',
    nim: null, //NIM SDK对象
    hasReceiveHostMsg: false //是否已收到主持人发送的有权限成员列表的消息
  };

  @action
  setHasReceiveHostMsg(hasReceiveHostMsg) {
    this.state.hasReceiveHostMsg = hasReceiveHostMsg;
    console.log('store --> nim --> setHasReceiveHostMsg', hasReceiveHostMsg);
  }

  @action
  setNim(nim) {
    console.log('store --> nim --> setNim', nim);
    this.state.nim = nim;
  }

  @action
  setUid(uid) {
    console.log('store --> nim --> setUid', uid);
    this.state.uid = uid;
  }

  @action
  setAccount(account) {
    console.log('store --> nim --> setAccount', account);
    this.state.account = account;
  }

  @action
  setToken(token) {
    console.log('store --> nim --> setToken', token);
    this.state.token = token;
  }
}
