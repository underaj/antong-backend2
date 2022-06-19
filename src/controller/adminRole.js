const Base = require('./base.js');
const moment = require('moment');

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  // 角色管理（职位管理）

  // 添加角色
  async addRoleAction() {
    // 权限列表[],数组
    var aclArr = JSON.parse(this.post('aclArr'));
    var roleName = this.post('roleName');// 职务
    var loginName = this.session('loginName');

    if (think.isEmpty(roleName)) {
      return this.fail('职务不能为空');
    }
    if (think.isEmpty(aclArr)) {
      return this.fail('权限不能为空');
    }
    var roleBySql = await this.model('role').where({name: roleName, delete_flag: 0}).find();
    if (!think.isEmpty(roleBySql)) {
      return this.fail('职务名已存在');
    }

    await this.model('role').add({
      name: roleName,
      create_user: loginName,
      create_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_user: loginName,
      status_flag: 1,
      delete_flag: 0// 默认未删除
    });

    var role = await this.model('role').where({name: roleName, delete_flag: 0}).find();

    if (!think.isEmpty(aclArr)) {
      for (var i = 0; i < aclArr.length; i++) {
        await this.model('role_acl').add({
          role_id: role.id,
          acl_id: aclArr[i]
        });
      }
    }
    return this.success('添加成功');
  }

  // 修改角色
  async updateRoleAction() {
    // 权限列表[],数组
    // 权限列表[],数组
    var roleId = this.post('roleId');
    var aclArr = JSON.parse(this.post('aclArr'));
    var roleName = this.post('roleName');// 职务
    var loginName = this.session('loginName');

    if (think.isEmpty(roleName)) {
      return this.fail('职务名不能为空');
    }
    if (think.isEmpty(aclArr)) {
      return this.fail('权限不能为空');
    }
    var roleBySql = await this.model('role').where({name: roleName, delete_flag: 0, id: ['NOTIN', [roleId]]}).find();
    if (!think.isEmpty(roleBySql)) {
      return this.fail('职务名已存在');
    }

    var role = await this.model('role').where({id: roleId, delete_flag: 0}).find();
    if (think.isEmpty(role)) {
      return this.fail('职务不存在');
    }

    await this.model('role').where({id: roleId, delete_flag: 0}).update({
      name: roleName,
      update_time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      update_user: loginName
    });

    // 清除之前的绑定的权限
    await this.model('role_acl').where({role_id: roleId}).delete();

    if (!think.isEmpty(aclArr)) {
      for (var i = 0; i < aclArr.length; i++) {
        await this.model('role_acl').add({
          role_id: role.id,
          acl_id: aclArr[i]
        });
      }
    }
    return this.success('修改成功');
  }

  // 删除角色(多选)
  async deleteRoleAction() {
    // 角色id
    var roleIdArr = JSON.parse(this.post('roleIdArr'));

    for (var i = 0; i < roleIdArr.length; i++) {
      var roleId = roleIdArr[i];
      var role = await this.model('role').where({id: roleId, delete_flag: 0}).find();
      if (think.isEmpty(role)) {
        return this.fail('角色不存在');
      }
      if (roleId === 1) {
        return this.fail('此角色不能删除');
      }
      // 删除角色对应关联权限
      var accountRole = await this.model('account').where({role_id: roleId, is_delete: 0}).select();
      if (!think.isEmpty(accountRole)) {
        return this.fail('有账户绑定此角色，不能进行删除操作');
      }
      // 删除角色权限关联表
      await this.model('role_acl').where({role_id: roleId}).delete();

      // 删除角色
      await this.model('role').where({id: roleId}).delete();
    }
    return this.success('删除成功');
  }

  // 查询所有角色的所有权限
  async findRoleAclAction() {
    var data = this.post();
    var roleList = await this.model('role').where({delete_flag: 0, id: ['NOTIN', [1]]}).page(data.pageIndex, data.pageSize).countSelect();

    for (var i = 0; i < roleList.data.length; i++) {
      var roleId = roleList.data[i].id;
      var role = await this.model('role').where({delete_flag: 0, id: roleId}).find();
      roleList.data[i].remark = await this.commont(role);
    }
    return this.success(roleList);
  }

  // 查询所有角色
  async findRoleListAction() {
    var result = await this.model('role').where({delete_flag: 0, id: ['NOTIN', [1]]}).select();
    return this.success(result);
  }

  // 查询所有权限(权限列表)
  async findAclAction() {
    var acls = await this.model('acl').select();

    var aclModuleList = await this.model('acl_module').select();

    for (var i = 0; i < aclModuleList.length; i++) {
      var moduleId = aclModuleList[i].id;

      var moduleDetail = [];

      for (var j = 0; j < acls.length; j++) {
        var aclModuleId = acls[j].acl_module_id;
        if (moduleId === aclModuleId) {
          moduleDetail.push(acls[j]);
        }
      }
      aclModuleList[i].acls = moduleDetail;
    }
    return this.success(aclModuleList);
  }

  // 根据角色ID查询该角色的模块、权限
  async findAclModuleIdByRoleIdAction() {
    var roleId = this.post('roleId');
    var role = await this.model('role').where({delete_flag: 0, id: roleId}).find();
    if (think.isEmpty(role)) {
      return this.fail('职务不存在');
    }
    var result = await this.commont(role);
    return this.success(result);
  }

  // 根据角色查询模块和权限的公共方法
  async commont(role) {
    var acls = role.acls;

    var aclModuleList = await this.model('acl_module').select();

    for (var i = 0; i < aclModuleList.length; i++) {
      var moduleId = aclModuleList[i].id;

      var number = 0;
      var moduleDetail = [number];

      for (var j = 0; j < acls.length; j++) {
        var aclModuleId = acls[j].acl_module_id;
        if (moduleId === aclModuleId) {
          number++;
          moduleDetail[number - 1] = acls[j];
        }
      }
      aclModuleList[i].acls = moduleDetail;
    }
    role.remark = aclModuleList;
    return role;
  }
};
