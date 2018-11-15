const os = require('os');

 /** 获取本机Ip */
module.exports = function getLocalIP() {
  let interObj = os.networkInterfaces();
  let address;
  for (let i in interObj) {
      // console.log('interObj', i)
    let itemArr = interObj[i];
    if (itemArr) {
      itemArr.forEach(function(item) {
        if (item.family === 'IPv4' && item.address !== '127.0.0.1') {
          address = item.address;
          return;
        }
      });
    }
    if (address) return address;
  }
};
