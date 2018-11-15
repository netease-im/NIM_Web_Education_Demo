## 在线教育白板 demo

### 功能点

* Web 白板
* Web 音视频
* 聊天室
* IM

### 互动流程

* nim 登录
* 连接聊天室
* 开启音视频
* 开启白板

### 特殊约定

白板、音视频房间都以聊天室ID为房间号码

### 技术栈

* [x] webpack
* [x] 包管理：Yarn || Npm
* [x] UI 库：React
* [x] UI 组件：自写 -> 参考 antdesign 和 weui
* [x] 字体图标：iconfont
* [x] 路由：React-Router
* [x] JS：ES6 / ES7
* [x] babel
* [x] postcss
* [x] 样式：Less / CSS
* [x] 状态管理：Mobx / Mobx-React
* [x] 音视频 SDK：网易云信实时音视频 SDK
* [x] 白板 SDK: 网易云信白板 SDK


### 开发环境

```bash
# 安装依赖
npm install
# 启动开发环境
npm start
```

备注：命令行会自动打开浏览器，如果没有自动打开请手动复制 `https://localhost:8080` 至浏览器地址栏打开

### 打包部署

1. 测试环境: yarn build:test
2. 预发布环境: yarn build:pre
3. 线上环境: yarn build:prod

### 目录介绍

```js
├── demo                       临时的字体图标参考
├── sdk                        SDK引用
├── src
│   ├── assets                 静态资源
│   │   ├── css                自定义样式
│   │   └── images             图片
│   ├── component              单一组件区域，包括 `input`, `button` 等基础组件
│   ├── ext                    扩展程序，是三大功能各自的方法操作集合输出，方便模块调用
│   ├── config                 配置文件，后期填补
│   ├── module                 模块，和业务相关
│   ├── pages                  页面
│   ├── router                 路由配置
│   ├── store                  全局状态管理输出
│   ├── util                   工具组件
│   └── index.js               入口脚本
└── index.html                 主页入口
```

**请注意**

- `ext` 文件夹和 `store` 文件夹的关系:

两个文件夹内容本质都是为了三大功能的集合管理，两个文件夹各司其职，共同配合

`ext`: 逻辑输出，主要完成各大功能的逻辑流程和各种操作

`store`: 状态输出，主要管理和存储各个功能逻辑和页面模块需要共享的一些数据

- Babel装饰器插件 `transform-decorators-legacy` 要写在插件列表第一个，[参考地址](http://cn.mobx.js.org/best/decorators.html)，[问题来源](https://github.com/mobxjs/mobx-react/issues/41)

### 参考资料

1. [React](https://Reactjs.com/)
2. [Mobx](https://github.com/mobxjs/mobx)
3. [Mobx-React](https://github.com/mobxjs/mobx-preact)
4. [Preact-weui](https://github.com/afeiship/preact-weui)
5. [Parcel](https://github.com/parcel-bundler/parcel)

