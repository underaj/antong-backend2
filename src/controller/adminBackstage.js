const Base = require('./base.js');
const moment = require('moment');

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  // 教练信息审核
  async auditAction() {
    var data = this.post();
    var loginName = this.session('loginName');

    var user = await this.model('coach').find({id: data.id, delete_flag: 0});
    if (think.isEmpty(user)) {
      return this.fail('账户不存在');
    }

    await this.model('coach').where({id: data.id}).update({
      status_flag: data.statusFlag,
      update_user: loginName,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    });
    return this.success('审核成功');
  }

  // 添加/解除黑名单
  async isBlacklistAction() {
    var data = this.post();
    var loginName = this.session('loginName');

    var user = await this.model('coach').find({id: data.id, delete_flag: 0});
    if (think.isEmpty(user)) {
      return this.fail('账户不存在');
    }

    // new Date 之前的订单，的timeable全部改成1
    if (data.isBlacklist == 0) {
      var newDateTime = moment(new Date()).unix();// 此时

      var ordersAllList = await this.model('orders').where({coach_id: data.id, status: ['NOTIN', [2]]}).select();
      if (!think.isEmpty(ordersAllList)) {
        for (let i = 0; i < ordersAllList.length; i++) {
          var orders = ordersAllList[i];
          var ordersId = orders.id;

          var orderDate = orders.order_time;
          var dateArr = (orderDate || '').split('-');

          var date = new Date(dateArr[0], dateArr[1] - 1, dateArr[2]);
          var dataUnix = moment(date).unix();
          if (newDateTime >= dataUnix) {
            var orderTimetableList = await this.model('order_timetable').where({orders_id: ordersId, print: 0}).select();

            if (!think.isEmpty(orderTimetableList)) {
              await this.model('order_timetable').where({orders_id: ordersId, print: 0}).update({
                is_black: 1
              });
            }
          }
        }
      }
    }
    await this.model('coach').where({id: data.id}).update({
      is_blacklist: data.isBlacklist,
      update_user: loginName,
      is_blacklist_update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    });
    return this.success('修改成功');
  }

  // 搜索教练列表(教练查询)(不带分页的)
  async findAllAction() {
    var result = await this.model('coach').where({
      status_flag: 1,
      delete_flag: 0,
      is_blacklist: 0
    }).select();
    return this.success(result);
  }

  // 根据id查询教练详情
  async findByIdAction() {
    var coachId = this.post('coachId');
    var result = await this.model('coach').where({
      id: coachId,
      delete_flag: 0
    }).find();

    // 查询未打单数量
    var noPrintOrders = await this.model('orders').join('order_timetable ON orders.id = order_timetable.orders_id')
      .where({'orders.coach_id': coachId, 'orders.pay_type': 1, 'order_timetable.print': 0, 'order_timetable.is_delete': 1})
      .select();

    // 订单待返点
    var noOrderRebates = await this.model('orders').where({coach_id: coachId, pay_type: 1, is_return: 0}).getField('order_rebates');
    var noOrderRebatesNumber = 0;
    for (let i = 0; i < noOrderRebates.length; i++) {
      noOrderRebatesNumber += noOrderRebates[i];
    }

    // 订单已返点
    var isOrderRebates = await this.model('orders').where({coach_id: coachId, pay_type: 1, is_return: 1}).getField('order_rebates');
    var isOrderRebatesNumber = 0;
    for (let i = 0; i < isOrderRebates.length; i++) {
      isOrderRebatesNumber += isOrderRebates[i];
    }

    // 已付尾款单
    var finalPayment = await this.model('orders').where({coach_id: coachId, pay_type: 1, collection_type: 2}).select();

    return this.success({
      data: result,
      orders_number: result.orders.length, // 全部订单数量
      no_print_orders: noPrintOrders.length, // 未打单订单数量
      no_order_rebates_number: noOrderRebatesNumber, // 订单待返点
      is_order_rebates_number: isOrderRebatesNumber, // 订单已返点
      final_payment: finalPayment.length // 尾款单数量
    });
  }

  // 搜索教练列表(教练查询)
  async findByListAction() {
    var data = this.post();
    if (think.isEmpty(data.name)) {
      data.name = '%%';
    } else {
      data.name = '%' + data.name + '%';
    }
    if (think.isEmpty(data.phone)) {
      data.phone = '%%';
    } else {
      data.phone = '%' + data.phone + '%';
    }
    if (think.isEmpty(data.code)) {
      data.code = '%%';
    } else {
      data.code = '%' + data.code + '%';
    }

    if (think.isEmpty(data.statusFlag)) {
      data.statusFlag = '%%';// 默认查询全部的
    }

    var coachListByPage = await this.model('coach').where({
      name: ['like', data.name],
      phone: ['like', data.phone],
      code: ['like', data.code],
      status_flag: ['like', data.statusFlag],
      delete_flag: 0
    }).order("coach.create_time desc")
    .page(data.pageIndex, data.pageSize).countSelect();

    var coachList = coachListByPage.data;

    var result = [];
    if (!think.isEmpty(coachList)) {
      for (let i = 0; i < coachList.length; i++) {
        var coachId = coachList[i].id;

        // 查询未打单数量
        var noPrintOrders = await this.model('orders').join('order_timetable ON orders.id = order_timetable.orders_id')
          .where({'orders.coach_id': coachId, 'orders.pay_type': 1, 'order_timetable.print': 0, 'order_timetable.is_delete': 1})
          .select();

        var newCoachList = {
          data: coachList[i],
          orders_number: coachList[i].orders.length, // 全部订单数量
          no_print_orders: noPrintOrders.length // 未打单订单数量
        };
        result.push(newCoachList);
      }
    }
    return this.success({
      data: result,
      count: coachListByPage.count,
      totalPages: coachListByPage.totalPages,
      pageSize: coachListByPage.pageSize,
      currentPage: coachListByPage.currentPage
    });
  }

  // 删除教练
  async deleteAction() {
    var coachId = JSON.parse(this.post('coachId'));// 教练id
    console.info(coachId)
    for (let index = 0; index < coachId.length; index++) {
      const element = coachId[index];
      var coach = await this.model('coach').where({id: element, delete_flag: 0}).find();
        if (think.isEmpty(coach)) {
          continue;
        }
        await this.model('coach').where({id: element}).update({
          delete_flag: 1
        });
    }
    return this.success('删除成功');
  }

  // 修改教练信息
  async updateAction() {
    var data = this.post();
    var loginName = this.session('loginName');

    var coach = await this.model('coach').where({id: data.coachId, delete_flag: 0}).find();
    if (think.isEmpty(coach)) {
      return this.fail('账户不存在');
    }
    await this.model('coach').where({id: data.coachId}).update({
      name: data.name,
      gender: data.gender,
      driving_school: data.drivingSchool,
      coach_card: data.coachCard,
      phone : data.phone,
      driving_license_reverse: data.drivingLicenseReverse, // 驾驶证反面
      driving_license_front: data.drivingLicenseFront, // 驾驶证正面
      update_user: loginName,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    });
    return this.success('修改成功');
  }
};
