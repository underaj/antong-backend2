module.exports = class extends think.Controller {
  __before() {
    console.info("来自"+this.ip+"访问..........");
  }
  /**
   * 处理当方法不存在的时候执行的
   */
  __call(){
    return this.fail("请求方法ERROR:"+this.ctx.href);
  }

};
