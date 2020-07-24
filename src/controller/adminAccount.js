const Base = require('./base.js');
const moment = require('moment');
const md5 = require('../util/md5Utils.js');

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  // 添加账户
  async addAccountAction() {
    var data = this.post();
    var loginName = await this.session('loginName');

    if (think.isEmpty(data.phone)) {
      return this.fail('手机号不能为空');
    }
    var accountByPhone = await this.model('account').where({
      phone: data.phone,
      is_delete: 0
    }).find();
    if (!think.isEmpty(accountByPhone)) {
      return this.fail('手机号已注册');
    }

    if (think.isEmpty(data.username)) {
      return this.fail('账户不能为空');
    }
    var accountByUsername = await this.model('account').where({
      username: data.username,
      is_delete: 0
    }).find();
    if (!think.isEmpty(accountByUsername)) {
      return this.fail('账户已存在');
    }

    // 密码加密
    var encode = md5.md5(data.password);

    // 添加
    await this.model('account').add({
      username: data.username,
      password: encode,
      name: data.name,
      department: data.department,
      role_id: data.roleId,
      phone: data.phone,
      email: data.email,
      create_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      create_by: loginName,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_by: loginName,
      status: 0,
      is_delete: 0,
      type:data.type
    });
    return this.success('创建成功');
  }

  // 重置密码
  async updatePasswordAction() {
    var data = this.post();
    var loginName = this.session('loginName');
    var user = await this.model('account').where({
      id: data.id,
      is_delete: 0
    }).find();

    if (think.isEmpty(user)) {
      return this.fail('账户不存在');
    }

    // 密码加密
    var encode = md5.md5(data.password);

    await this.model('account').where({
      id: data.id
    }).update({
      password: encode,
      update_by: loginName,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
    });
    return this.success('修改成功');
  }

  // 删除账户
  async deleteAccountAction() {
    var loginName = this.session('loginName');
    var idArr = JSON.parse(this.post('idArr'));

    for (var i = 0; i < idArr.length; i++) {
      var id = idArr[i];

      var user = await this.model('account').where({
        id: id,
        is_delete: 0
      }).find();
      if (think.isEmpty(user)) {
        return this.fail('账户不存在');
      }
      if (user.username === 'admin') {
        return this.fail('admin账户不能删除');
      }
      await this.model('account').where({id: id}).update({
        is_delete: '1',
        update_by: loginName,
        update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
      });
    }
    return this.success('已删除');
  }

  // 修改账户信息
  async updateAccountAction() {
    var data = this.post();
    var loginName = this.session('loginName');
    var user = await this.model('account').where({
      id: data.id,
      is_delete: 0
    }).find();
    if (think.isEmpty(user)) {
      return this.fail('账户不存在');
    }

    // var userByUsername = await this.model('account').where({username: data.username, id: ['NOTIN', [data.id]]}).select();
    // if (!think.isEmpty(userByUsername)) {
    //   return this.fail('账户名重复');
    // }

    var userByPhone = await this.model('account').where({phone: data.phone, id: ['NOTIN', [data.id]]}).select();
    if (!think.isEmpty(userByPhone)) {
      return this.fail('手机号重复');
    }

    if (!think.isEmpty(data.password)) {
      // 密码加密
      var encode = md5.md5(data.password);
      var detail = await this.model('account').where({
        id: data.id
      }).update({
        username: data.username,
        password: encode,
        name: data.name,
        department: data.department,
        role_id: data.roleId,
        phone: data.phone,
        email: data.email,
        update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
        update_by: loginName,
        type: data.type
      });
      return this.success(detail);
    } else {
      var result = await this.model('account').where({
        id: data.id
      }).update({
        username: data.username,
        name: data.name,
        department: data.department,
        role_id: data.roleId,
        phone: data.phone,
        email: data.email,
        update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
        update_by: loginName
      });
      return this.success(result);
    }
  }

  // 查询账户信息（姓名，订单状态）
  async selectAccountAction() {
    var data = this.post();

    if (think.isEmpty(data.name)) {
      data.name = '%%';
    } else {
      data.name = '%' + data.name + '%';
    }

    if (think.isEmpty(data.roleId)) {
      data.roleId = '%%';// 默认查询账户
    }

    var result = await this.model('account').where({
      name: ['like', data.name],
      role_id: ['like', data.roleId],
      is_delete: 0,
      id: ['NOTIN', [1]]
    }).page(data.pageIndex, data.pageSize).countSelect();
    return this.success(result);
  }
};
