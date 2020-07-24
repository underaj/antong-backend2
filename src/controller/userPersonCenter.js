const Base = require('./base.js');
const moment = require('moment');

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  // 添加学员
  async createStudentAction() {
    var data = this.post();
    var loginName = data.loginName;
    var loginId = data.loginId;

    if (think.isEmpty(data.name)) {
      return this.fail('学员姓名不能为空');
    }
    if (think.isEmpty(data.tel)) {
      return this.fail('手机号不能为空');
    }
    if (think.isEmpty(data.carStatus)) {
      return this.fail('车型不能为空');
    }

    var userBySql = await this.model('student').where({tel: data.tel}).find();
    if (!think.isEmpty(userBySql)) {
      return this.fail('手机号已绑定');
    }

    var studentId = await this.model('student').add({
      name: data.name,
      tel: data.tel,
      car_status: data.carStatus,
      coach_id: loginId,
      is_delete: 0,
      create_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      create_by: loginName,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_by: loginName
    });
    var student = await this.model('student').where({student_id: studentId}).find();
    return this.success(student);
  }

  // 学员修改
  async updateStudentAction() {
    var data = this.post();
    var loginName = data.loginName;
    var loginId = data.loginId;

    var userBySql = await this.model('student').where({student_id: ['NOTIN', [data.id]], tel: data.tel, is_delete: 0}).find();
    if (!think.isEmpty(userBySql)) {
      return this.fail('手机号已绑定');
    }

    var student = await this.model('student').where({student_id: data.id}).update({
      name: data.name,
      tel: data.tel,
      car_status: data.carStatus,
      coach_id: loginId,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_by: loginName
    });
    return this.success(student);
  }

  // 根據教练id查询学员列表
  async findStudentAction() {
    var coachId = this.post('coachId');
    if (think.isEmpty(coachId)) {
      return this.success();
    }
    if (coachId === 0) {
      return this.success();
    }

    var user = await this.model('coach').where({id: coachId}).find();

    if (think.isEmpty(user)) {
      return this.fail(1099, 'GET_ERROR');
    }

    var studentList = await this.model('student').where({coach_id: coachId, is_delete: 0}).select();
    return this.success(studentList);
  }

  // 教练更新个人资料（姓名，性别，教练证号）
  async updateMySelfAction() {
    var data = this.post();

    // 查询手机号是否注册
    var coach = await this.model('coach').where({id: data.coachId}).update({
      name: data.name,
      gender: data.gender,
      coach_card: data.coachCard,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_user: data.name
    });
    return this.success(coach);
  }

  // 查询站内信列表
  async selectInMailAction() {
    var data = this.post();
    if (think.isEmpty(data.pageIndex)) {
      data.parseInt = 1;
    }
    if (think.isEmpty(data.pageSize)) {
      data.pageSize = 0x7FFFFFFF;
    }
    var detail = await this.model('user_in_mail').where({
      coach_id: data.coachId,
      delete_flag: 0
    }).order({create_time: 'DESC'}).page(data.pageIndex, data.pageSize).countSelect();
    return this.success(detail);
  }

  // 修改站内信查看状态
  async updateInMailAction() {
    var data = this.post();
    var detail = await this.model('user_in_mail').where({
      id: data.id,
      delete_flag: 0
    }).update({
      is_find: 1
    });
    return this.success(detail);
  }

  // 查询是否有新的站内信
  async selectNewInMailAction() {
    var data = this.post();
    var detail = await this.model('user_in_mail').where({
      is_find: 0,
      coach_id: data.coachId,
      delete_flag: 0
    }).select();
    if (think.isEmpty(detail)) {
      return this.success(0);
    } else {
      return this.success(detail.length);
    }
  }

  // 根据站内信id查询站内信
  async selectInMailByIdAction() {
    var data = this.post();
    var detail = await this.model('user_in_mail').where({
      id: data.id,
      delete_flag: 0
    }).find();
    return this.success(detail);
  }

  // 发送投诉建议
  async sendComplainAction() {
    var data = this.post();
    var loginName = this.post('loginName');
    var loginId = this.post('loginId');

    if (think.isEmpty(data.type)) {
      return this.fail('建议类型不能为空');
    }
    if (think.isEmpty(data.content)) {
      return this.fail('内容描述不能为空');
    }
    await this.model('feedback').add({
      coach_id: loginId,
      type: data.type,
      content: data.content,
      image: data.image, // 多张图片使用7个-隔开
      create_user: loginName,
      create_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    });
    return this.success('发送成功');
  }
};
