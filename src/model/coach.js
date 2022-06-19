module.exports = class extends think.Model {
  get relation() {
    return {
      orders: {
        type: think.Model.HAS_MANY, // relation type
        model: 'orders', // model name
        name: 'orders', //
        key: 'id',
        fKey: 'coach_id'
      }
    };
  }
};
