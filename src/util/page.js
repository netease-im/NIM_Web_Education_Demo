/*
 * @Author: lduoduo 
 * @Date: 2018-02-06 13:01:25 
 * @Last Modified by: lduoduo
 * @Last Modified time: 2018-02-09 11:22:05
 * 前往第几页之后显示toast消息
 */
import Toast from "./toast";

export default {
  page: "",
  message: "",
  pageDone: false,

  to(page, message) {
    console.log("page to", page, message);
    this.message = message;

    if (page === this.page) {
      return this.done();
    }
    this.page = page;

    location.href = `#/${page}`;
  },

  back(message) {
    console.log("page back", message);
    this.message = message;
    history.back();
  },

  done() {
    this.page = location.hash.replace("#/", "");
    console.log("page done", this.message);
    if (!this.message) return;
    setTimeout(() => {
      Toast({
        time: 5,
        msg: this.message
      });
      this.message = "";
    }, 500);
  }
};
