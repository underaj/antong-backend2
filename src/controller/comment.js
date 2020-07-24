const Base = require('./base.js');
const moment = require('moment');
const oss = require('../util/ossUtils.js');

module.exports = class extends Base {
  // OSS文件上传
  async upFileAction() {
    var result = await oss.signature();
    return this.success(result);
  }

  // 获取自定义订单编号
  async getOrdersCodeAction() {
    // 时间
    var date = moment(new Date()).format('YYYYMMDD');

    // 数量
    var count = await this.model('orders').where({
      create_time: ['like', '%' + date + '%']
    }).count();
    if (think.isEmpty(count)) {
      count = '0';
    };
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
    return this.success(date + number);
  }

  // 获取自定义教练ID编号
  async getCoachCodeAction() {
    // 时间
    var date = moment(new Date()).format('yyyyMMdd');

    // 数量
    var count = await this.model('orders').where({
      create_time: ['like', date]
    }).count();
    if (think.isEmpty(count)) {
      count = '0';
    }
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
    return date + number;
  }

  // 微信支付
  async raw(args) {
    var keys = Object.keys(args);
    keys = keys.sort();
    var newArgs = {};
    keys.forEach(function(key) {
      newArgs[key] = args[key];
    });
    var string = '';
    for (var k in newArgs) {
      string += '&' + k + '=' + newArgs[k];
    }
    string = string.substr(1);
    return string;
  }

  // 判断是否黑名单
  async isBlackList(coachId) {
    var coach = await this.model('coach').where({id: coachId, delete_flag: 0}).find();
    if (think.isEmpty(coach)) {
      return false;
    }

    var isBlacklistUpdateTime = coach.is_blacklist_update_time; // 黑名单修改时间
    if (think.isEmpty(isBlacklistUpdateTime)) {
      var orderList = await this.model('orders').where({coach_id: coachId}).select();
      if (think.isEmpty(orderList)) {
        return false;
      } else {
        var orderTimetableCountNumber = 0;

        for (var i = 0; i < orderList.length; i++) {
          var ordersId = orderList[i].id;

          var orderTimetableList = await this.model('order_timetable').where({orders_id: ordersId, is_print: 0}).select();
          if (orderTimetableList.length !== 0) {
            orderTimetableCountNumber++;
          }
        }
        if (orderTimetableCountNumber >= 3) {
          return true;
        } else {
          return false;
        }
      }
    } else { // 黑名单修改时间不为空
      var updateTime = moment(isBlacklistUpdateTime).unix();
      var orderListByUpdateTime = await this.model('orders').where(updateTime + ' <= UNIX_TIMESTAMP(create_time)', 'coach_id = ' + coachId).select();
      if (think.isEmpty(orderListByUpdateTime)) {
        return false;
      } else {
        var orderTimetableCountNumberByUpdateTime = 0;

        for (var j = 0; j < orderListByUpdateTime.length; j++) {
          var ordersIdByUpdateTime = orderListByUpdateTime[j].id;

          var orderTimetableListByUpdateTime = await this.model('order_timetable').where({orders_id: ordersIdByUpdateTime, is_print: 0}).select();
          if (orderTimetableListByUpdateTime.length !== 0) {
            orderTimetableCountNumberByUpdateTime++;
          }
        }
        if (orderTimetableCountNumberByUpdateTime >= 3) {
          return true;
        } else {
          return false;
        }
      }
    }
  }
};
