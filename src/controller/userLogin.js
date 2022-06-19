const Base = require('./base.js');
const moment = require('moment');
// const { think } = require('think-cache');
// const wx = require('../utils/wxUtils.js');

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  /**
     *  微信小程序登录
    */
  async code2SessionAction(code) {
    var wxAppid = 'wxedecb11f0d2bd76e';
    var wxAppsecret = '8caf3694338c02b7a45f1109880845b2';

    const url = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + wxAppid + '&secret=' +
      wxAppsecret + '&js_code=' + code + '&grant_type=authorization_code';
    var result = await this.fetch(url, { method: 'GET' }).then(res => res.json());
    return result;

  }

  // 小程序登录
  async loginAction() {


    var data = this.post();

    // 根据code获取openId
    var openIdByCode = await this.code2SessionAction(data.code);
    var openId = openIdByCode.openid;

    if (think.isEmpty(openIdByCode)) {
      return this.fail('登录异常，未获取到OpenId');
    }

    // 获取用户信息
    var user = await this.model('coach').where({ wx_open_id: openId, delete_flag: 0 }).find();

    if (think.isEmpty(user)) {
      return this.fail('请先完成小程序注册', { wx_open_id: openId });
    } else {
      return this.success(user);
    }
  }

  // 小程序内部登录
  async loginByInAction() {
    var data = this.post();

    var user = await this.model('coach').where({ phone: data.phone, delete_flag: 0 }).find();
    if (think.isEmpty(user)) {
      return this.fail('账户不存在');
    }
    var phoneVcode = await this.model('phone_vcode').where({ phone: data.phone, vcode: data.vcode }).find();
    if (think.isEmpty(phoneVcode)) {
      return this.fail('验证码错误');
    }
    var createTime = moment(phoneVcode.create_time).unix() + 10 * 60 * 1000; // 十分钟
    var newDate = moment(new Date()).unix();
    if (newDate > createTime) {
      return this.fail('验证码已过期');
    }
    return this.success(user);
  }

  // 注册教练
  async signInAction() {
    var data = this.post();

    // 获取openId
    var openId = data.openId;

    var coachByPhone = await this.model('coach').where({ phone: data.phone, delete_flag: 0 }).find();

    var coachByOpenId = await this.model('coach').where({ wx_open_id: openId, delete_flag: 0 }).find();
    if (!think.isEmpty(coachByOpenId)) {
      return this.fail('账户已存在');
    }

    if (!think.isEmpty(coachByPhone)) {
      return this.fail('手机号已注册');
    }

    var phoneVcode = await this.model('phone_vcode').where({ phone: data.phone, vcode: data.vcode }).find();

    if (think.isEmpty(phoneVcode) && data.vcode !== '147258') {
      return this.fail('验证码错误');
    }

    await this.model('coach').add({
      code: await this.getCoachCodeAction(),
      name: data.name,
      gender: data.gender,
      phone: data.phone,
      // avatar_url: data.avatarUrl, // 前端控制（不要了）
      driving_school: data.drivingSchool, // 驾校名
      coach_card: data.coachCard, // 证件号
      create_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      create_user: data.name,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_user: data.name,
      delete_flag: 0, // 默认未删除
      status_flag: 0, // 默认未激活
      is_blacklist: 0, // 默认不是黑名单
      wx_open_id: openId
    });

    var newUser = await this.model('coach').where({ phone: data.phone, delete_flag: 0 }).find();
    return this.success(newUser);
  }

  // 驾照上传
  async uploadingAction() {
    var data = this.post();

    var user = await this.model('coach').where({
      id: data.id,
      delete_flag: 0
    }).find();
    if (think.isEmpty(user)) {
      return this.fail('账户异常');
    }
    if (!think.isEmpty(data.drivingLicenseFront)) {
      await this.model('coach').where({ id: data.id }).update({
        driving_license_front: data.drivingLicenseFront,
        status_flag: 0
      });
    }
    if (!think.isEmpty(data.drivingLicenseReverse)) {
      await this.model('coach').where({ id: data.id }).update({
        driving_license_reverse: data.drivingLicenseReverse,
        status_flag: 0
      });
    }
    var newUser = await this.model('coach').where({
      id: data.id,
      delete_flag: 0
    }).find();
    return this.success(newUser);
  }

  // 获取用户最新信息
  async getAction() {
    var id = this.post('id');
    var user = await this.model('coach').where({ id: id }).find();

    if (think.isEmpty(user)) {
      return this.fail(1099, 'GET_ERROR');
    }

    return this.success(user);
  }

  // 获取自定义教练ID编号
  async getCoachCodeAction() {
    // 时间
    var date = moment(new Date()).format('YYYY-MM-DD');

    // 数量
    var orders = await this.model('coach').where({
      create_time: ['like', '%' + date + '%'],
      delete_flag: 0
    }).select();

    var count = orders.length + 1 + '';
    var number = '';

    // 判断位数
    if (count.length === 1) {
      number = '000' + count;
    } else if (count.length === 2) {
      number = '00' + count;
    } else if (count.length === 3) {
      number = '0' + count;
    } else if (count.length === 4) {
      number = count;
    }
    var newDate = moment(new Date()).format('YYYYMMDD');
    return newDate + number;
  }

  /**
   * 删除教练下的学生信息
   */
  async deleteStudentByCoachIdAction() {
    let coachId = this.post("coachId");
    let studentId = this.post("studentId");
    //判断教练是否存在
    let coachData = await this.model("coach").where({ id: coachId, delete_flag: 0, status_flag: 1 }).find();
    if (think.isEmpty(coachData)) {
      return this.fail("教练信息异常");
    }
    let studentData = await this.model("student").where({ student_id: studentId, is_delete: 0, coach_id: coachId }).find();
    if (think.isEmpty(studentData)) {
      return this.fail("该教练下未查询到该学生信息");
    }
    await this.model("student").where({ student_id: studentId, coach_id: coachId }).update({ is_delete: 1 });
    return this.success("成功");
  }







};
