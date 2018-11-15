/*
 * @Author: lduoduo 
 * @Date: 2018-02-05 20:34:31 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-02-07 21:46:44
 * 对Alert的再封装，因为这个loading使用很频繁！！
 */

import Alert from './alert';

window.Alert = Alert
export default {
  show() {
    Alert.open({
      msg: '<i className="u-loading" ></i>请稍后...',
      isHtml: true,
      confirm: false
    });
  },
  hide() {
    Alert.close();
  }
};
