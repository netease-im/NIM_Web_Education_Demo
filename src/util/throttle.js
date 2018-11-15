/*
 * @Author: andyzou
 * @Date: 2018-08-31 11:50:14
 * @Last Modified by: andyzou
 * @Last Modified time: 2018-09-04 15:13:18
 * 方法节流与防抖
 */

/**
 * 函数防抖与节流
 * @param {Function} cb 回调函数
 * @param {Number} delayTime 回调函数延迟执行时间
 * @param {Number} debounceTime 节流时间
 */
export default function throttle (cb, delayTime, debounceTime) {
  var timer = null
  let previous = null
  return function () {
    let now = +new Date()
    let context = this
    let args = arguments
    if (!previous) {
      previous = now
    }
    if (debounceTime && (debounceTime < (now - previous))) {
      cb.apply(context, args)
      previous = now
      clearTimeout(timer)
    } else {
      clearTimeout(timer)
      timer = setTimeout(function () {
        cb.apply(context, args)
        previous = null
      }, delayTime)
    }
  }
}
