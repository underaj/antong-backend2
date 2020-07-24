const Base = require('./base.js');
const moment = require('moment');

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  // 根据类型查询所有投诉建议
  async findAllByListAction() {
    var data = this.post();
    if (think.isEmpty(data.pageIndex)) {
      data.pageIndex = 1;
    }
    if (think.isEmpty(data.pageSize)) {
      data.pageSize = 0x7FFFFFFF;
    }

    if (think.isEmpty(data.type)) {
      data.type = '%%';
    }
    var detail = await this.model('feedback').where({
      type: ['like', data.type]
    }).order({create_time: 'DESC'}).page(data.pageIndex, data.pageSize).countSelect();
    return this.success(detail);
  }

  // 查询所有站内信（根据时间查询）(分页)
  async findAllInEmailAction() {
    var data = this.post();
    if (think.isEmpty(data.pageIndex)) {
      data.pageIndex = 1;
    }
    if (think.isEmpty(data.pageSize)) {
      data.pageSize = 0x7FFFFFFF;
    }

    var date1 = 0;
    var date2 = 999999999999999;

    // 时间转换时间戳
    if (!think.isEmpty(data.createTime1)) {
      date1 = moment(data.createTime1).unix();
    }
    if (!think.isEmpty(data.createTime2)) {
      date2 = moment(data.createTime2).unix();
    }

    // 已查询
    var isFind = await this.model('admin_in_mail').where(
      date1 + ' <= UNIX_TIMESTAMP(create_time)',
      'UNIX_TIMESTAMP(create_time) <= ' + date2
    ).where({is_find: 1}).order({create_time: 'DESC'}).page(data.pageIndex, data.pageSize).countSelect();

    // 未查询
    var noFind = await this.model('admin_in_mail').where(
      date1 + ' <= UNIX_TIMESTAMP(create_time)',
      'UNIX_TIMESTAMP(create_time) <= ' + date2
    ).where({is_find: 0}).order({create_time: 'DESC'}).page(data.pageIndex, data.pageSize).countSelect();
    return this.success({
      is_find: isFind,
      no_find: noFind
    });
  }

  // 点击查看（修改查看状态）
  async updateInEmailAction() {
    var idArr = JSON.parse(this.post('idArr'));

    for (var i = 0; i < idArr.length; i++) {
      await this.model('admin_in_mail').where({id: idArr[i]}).update({
        is_find: 1
      });
    }
    return this.success('已查看');
  }
};
