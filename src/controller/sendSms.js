const Base = require('./base.js');
const moment = require('moment');
const Core = require('@alicloud/pop-core');

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  async sendAction() {
    var phoneNumber = this.post('phone');
    var vcode = await this.randomChar(6);
    console.log(vcode);

    var phoneVcode = await this.model('phone_vcode').where({phone: phoneNumber}).find();
    if (think.isEmpty(phoneVcode)) {
      // 插入数据库
      await this.model('phone_vcode').where().add({
        phone: phoneNumber,
        vcode: vcode,
        create_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
      });
    } else {
      await this.model('phone_vcode').where({phone: phoneNumber}).update({
        vcode: vcode,
        create_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
      });
    }

    var client = new Core({
      accessKeyId: 'LTAI4GFerxkhsuV2zBXp5qNV',
      accessKeySecret: 'vyn3Hoo4wksJ4Hhhe4iZDPdvBpc2hJ',
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25'
    });

    var params = {
      'RegionId': 'cn-hangzhou',
      'PhoneNumbers': phoneNumber,
      'SignName': '安通驾校',
      'TemplateCode': 'SMS_193130658',
      'TemplateParam': '{"code":"' + vcode + '"}'
    };

    var requestOption = {
      method: 'POST'
    };

    client.request('SendSms', params, requestOption).then((result) => {
      console.log(JSON.stringify(result));
    }, (ex) => {
      console.log(ex);
    });
    return this.success('发送成功');
  }

  /**
 * 随机字符串
 * @param {*} l
 * @returns
 */
  async randomChar(l) {
    var x = '0123456789';
    var tmp = '';
    for (var i = 0; i < l; i++) {
      tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
    }
    return tmp;
  }
};
