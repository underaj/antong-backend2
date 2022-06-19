module.exports = class extends think.Model {
  get relation() {
    return {
      role_tetail: {
        user: think.Model.BELONG_TO,
        model: 'role', // model name
        key: 'role_id',
        fKey: 'id'
      }
    };
  }
};
