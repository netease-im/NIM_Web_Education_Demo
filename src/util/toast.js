/*
 * @Author: lduoduo 
 * @Date: 2018-01-27 22:17:19 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-01-27 23:01:36
 * toast封装成普通js方法
 */

import { ToastCtrl } from 'component/toast';

/**
 * option.msg toast内容
 * option.time 停留时间: 默认2s，设置null: 无限期显示
 * option.close 是否展示关闭按钮
 * @param {*} option
 */
export default function(option = {}) {
  const { msg, time, close } = option;

  const param = {
    message: msg.constructor === String ? msg : JSON.stringify(msg),
    time,
    close
  };
  ToastCtrl.show(param);
}
