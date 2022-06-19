module.exports = class extends think.Model {
  get relation() {
    return {
      acl_module_detail: {
        type: think.Model.HAS_MANY,
        model: 'acl_module',
        fKey: 'id',
        key: 'acl_module_id'
      }
    };
  }
};
