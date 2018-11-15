/*
 * @Author: lduoduo 
 * @Date: 2018-01-26 20:12:09 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-27 23:06:46
 * toast控制器
 */

import Toast from './toast';

export default class ToastCtrl {
  static _instance = null;

  static createInstance(inProps) {
    this._instance = this._instance || Toast.newInstance(inProps);
    return this._instance;
  }

  static show(inOptions) {
    const { time = 3 } = inOptions;
    console.log('Toast show inOptions', inOptions);
    if (!this._instance) {
      this.createInstance(inOptions);
    }
    this._instance.show(inOptions);
    if (time) {
      setTimeout(() => {
        this.hide();
      }, time * 1000);
    }
  }

  static hide() {
    return this._instance.hide();
  }

  static destory() {
    this._instance.destory();
    this._instance = null;
  }
}
