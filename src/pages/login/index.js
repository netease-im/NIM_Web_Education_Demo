/*
 * @Author: lduoduo 
 * @Date: 2018-01-24 16:06:27 
 * @Last Modified by: andyzou
 * @Last Modified time: 2018-08-30 17:28:33
 * 登录页面
 */

import React, { Component } from 'react';
import { observer } from 'mobx-react';

import { Button, Row, Col, Input } from 'component';

import { Alert, Valid, Storage, MD5, Page, CheckBroswer } from 'util';

import { StoreNim } from 'store';

import EXT_NIM from 'ext/nim';

const NimState = StoreNim.state;
const NimAction = StoreNim;

@observer
export default class Login extends Component {
  state = {
    account: '',
    pwd: '',
    errorTip: '', //登录错误消息
    showErrorTip: false,
    canLogin: false, //是否可登录
    hasAccount: false,
    hasPwd: false,
    loginLoading: false //登录中状态
  };

  componentDidMount() {
    CheckBroswer({
      success: this.autoLogin.bind(this)
    })
  }

  autoLogin() {
    if (NimState.account) {
      console.log('已登录，自动切换到home');
      Page.to('home');
      return;
    }

    console.log('login:开始自动登录nim过程...');

    const account = Storage.get('account');
    const token = Storage.get('token');
    if (!account || !token) {
      console.warn('login:自动登录nim:缺少account或token，首次登陆请忽略！');
      this.accountInput.focus();
      return;
    }

    this.setState({
      showErrorTip: false,
      errorTip: '',
      loginLoading: true
    });

    //NIM自动登录
    EXT_NIM.login(account, token)
      .then(() => {
        console.log('login:自动登录nim成功');

        Page.to('home');
      })
      .catch(error => {
        console.error('login:自动登录nim失败');

        this.setState({
          showErrorTip: true,
          errorTip: error,
          loginLoading: false
        });

        this.accountInput.focus();
      });
  }

  changeAccount = e => {
    const account = e.target.value;
    if (Valid.isBlank(account)) {
      this.setState({
        hasAccount: false,
        account: '',
        canLogin: false
      });
      return;
    }

    this.setState((prevState, props) => ({
      hasAccount: true,
      account: account.trim(),
      canLogin: prevState.hasPwd
    }));
  };

  changePwd = e => {
    const pwd = e.target.value;
    if (Valid.isBlank(pwd)) {
      this.setState({
        hasPwd: false,
        pwd: '',
        canLogin: false
      });
      return;
    }

    this.setState((prevState, props) => ({
      hasPwd: true,
      pwd: pwd.trim(),
      canLogin: prevState.hasAccount
    }));
  };

  submit = () => {
    if (!this.state.canLogin || this.state.loginLoading) {
      console.log('不可点击登录或正在登录中...');
      return;
    }

    //预防性控制
    if (Valid.isBlank(this.state.account)) {
      this.setState({
        showErrorTip: true,
        errorTip: '账号不能为空'
      });
      return;
    }

    if (Valid.isBlank(this.state.pwd)) {
      this.setState({
        showErrorTip: true,
        errorTip: '密码不能为空'
      });
      return;
    }

    this.setState({
      showErrorTip: false,
      errorTip: '',
      loginLoading: true
    });

    //NIM登录
    this.requestLogin({
      account: this.state.account,
      pwd: this.state.pwd
    });
  };

  regist() {
    console.log('跳转到注册页...');

    Page.to('regist');
  }

  requestLogin(data) {
    const account = data.account;
    const token = MD5(data.pwd);

    //直接登录
    EXT_NIM.login(account, token)
      .then(() => {
        console.log('登录成功');

        //用于在非登录页面登录
        Storage.set('account', data.account);
        Storage.set('token', token);

        Page.to('home');
      })
      .catch(error => {
        console.error('登录失败', error);
        
        this.accountInput.focus();

        this.setState({
          showErrorTip: true,
          errorTip: error,
          loginLoading: false
        });
      });
  }

  render() {
    // console.log('render login');
    const state = this.state;
    return (
      <div className="m-login">
        <div className="form-part">
          <div className="form-part-inner">
            <div className="title">在线教育</div>
            <div className="subtitle">Web Demo</div>
            <div className="box">
              <div className="form-item">
                <label className="form-label">请输入账号</label>
                <Input
                  value={state.account}
                  onChange={this.changeAccount}
                  domRef={input => {
                    this.accountInput = input;
                  }}
                />
              </div>
              <div
                className={
                  state.showErrorTip ? 'form-item form-item-1' : 'form-item'
                }
              >
                <label className="form-label">请输入密码</label>
                <Input
                  type="password"
                  value={state.pwd}
                  onChange={this.changePwd}
                  domRef={input => {
                    this.pwdInput = input;
                  }}
                />
              </div>
              <div className="form-item f-tar">
                <div className="errortip" hidden={!state.showErrorTip}>
                  {state.errorTip}
                </div>
                <div>
                  <Button
                    onClick={this.submit}
                    loading={state.loginLoading}
                    disabled={!state.canLogin}
                  >
                    登录
                  </Button>
                </div>
                <div>
                  <Button className="u-btn-none" onClick={this.regist}>
                    注册
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="banner" />
      </div>
    );
  }
}
