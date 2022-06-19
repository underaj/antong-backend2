module.exports = class extends think.Model {
  get relation() {
    return {
      acls: {
        type: think.Model.MANY_TO_MANY,
        model: 'acl',
        rModel: 'role_acl', // model name
        rfKey: 'acl_id'
      }
    };
  }
};
