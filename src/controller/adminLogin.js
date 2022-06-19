const Base = require('./base.js');
const md5 = require('../util/md5Utils.js');

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  // 管理系统登录
  async loginAction() {
    var data = this.post();

    if (think.isEmpty(data.username) || think.isEmpty(data.password)) {
      return this.fail('账号或密码不能为空');
    }

    // 密码加密
    var encode = md5.md5(data.password);

    var user = await this.model('account').where({username: data.username, password: encode, is_delete: 0}).find();
    if (think.isEmpty(user)) {
      return this.fail('账号或密码错误');
    }

    await this.session(); // 清空session
    // await this.session({ // 设置session
    //   'loginId': user.id,
    //   'loginName': user.name,
    //   'loginCode': user.code
    // });

    await this.session('user',user.username+"");

 let id =  await this.session("user");

    console.log("存入session----->" + user.username  +":::"+id);

    return this.success(user);
  }

//   // 找回密码
//   async retrievePassword() {
//     var data = this.post();

//     if (think.isEmpty(data.username) || think.isEmpty(data.vcode)) {
//       return this.fail('账号和验证码不能为空');
//     }

//     var vcode = await this.model('auth_code').where({
//       phone: data.phone,
//       vcode: data.vcode
//     }).find();
//     if (think.isEmpty(vcode)) {
//       return this.fail('验证码错误');
//     }
//     if (moment().unix() - vcode.create_time > 5 * 60) {
//       await this.model('auth_code').where({phone: data.phone}).delete(); // 删除之前的验证码
//       return this.fail('验证码已失效，请重新获取');
//     }

//     var user = await this.model('account').where({
//       username: data.username,
//       phone: data.phone
//     }).find();
//     if (think.isEmpty(user)) {
//       return this.fail('账号和邮箱不匹配');
//     }
//   }
};
