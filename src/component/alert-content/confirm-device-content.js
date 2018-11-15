import React, { Component } from "react";
import classNames from "classnames";
import { observer } from "mobx-react";

import { StoreNim, StoreChatroom, StoreNetcall } from "store";

const NimState = StoreNim.state;
const NimAction = StoreNim;
const ChatroomState = StoreChatroom.state;
const ChatroomAction = StoreChatroom;
const NetcallState = StoreNetcall.state;
const NetcallAction = StoreNetcall;

@observer
export default class extends Component {
  onToggleAudio = e => {
    NetcallAction.setAudio(!NetcallState.audio);
    console.log("切换音频:", NetcallState.audio);
  };

  onToggleVideo = e => {
    NetcallAction.setVideo(!NetcallState.video);
    console.log("切换视频:", NetcallState.video);
  };

  render() {
    return (
      <div className="u-confirm-device">
        <div className="msg">
          <div>老师已通过你的发言方式，</div>
          <div>请选择发言方式:</div>
        </div>
        <div className="fnlist">
          <div className="fn-part">
            <input
              type="checkbox"
              name="fn"
              id="audio"
              className="select-checkbox"
            />
            <label
              className={classNames(
                "select-item",
                NetcallState.audio ? "selected" : ""
              )}
              htmlFor="audio"
              onClick={this.onToggleAudio}
            >
              语音
            </label>
          </div>
          <div className="fn-part">
            <input
              type="checkbox"
              name="fn"
              id="video"
              className="select-checkbox"
            />
            <label
              className={classNames(
                "select-item",
                NetcallState.video ? "selected" : ""
              )}
              htmlFor="video"
              onClick={this.onToggleVideo}
            >
              视频
            </label>
          </div>
          <div className="fn-part fn-part-1">
            <input
              type="checkbox"
              name="fn"
              id="whiteboard"
              className="select-checkbox"
            />
            <label className="select-item disabled" htmlFor="whiteboard">
              默认互动白板
            </label>
          </div>
        </div>
      </div>
    );
  }
}
