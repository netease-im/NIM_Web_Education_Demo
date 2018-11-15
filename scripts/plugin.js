class WebPackLifeHook {
  constructor (callbackObj) {
    this.beforeRunCallback = callbackObj.beforeRun || null
    this.runCallback = callbackObj.run || null
    this.doneCallback = callbackObj.done || null
    this.failCallback = callbackObj.fail || null
  }
  apply (compiler) {
    compiler.hooks.compile.tap('beforeRun', compiler => {
      this.runCallback && this.beforeRunCallback(compiler)
    })
    compiler.hooks.compile.tap('run', compiler => {
      this.runCallback && this.runCallback(compiler)
    })
    compiler.hooks.compile.tap('done', stats => {
      this.doneCallback && this.doneCallback(stats)
    })
    compiler.hooks.compile.tap('failed', error => {
      this.failCallback && this.failCallback(error)
    })
  }
}

module.exports = WebPackLifeHook
