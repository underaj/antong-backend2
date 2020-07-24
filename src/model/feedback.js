module.exports = class extends think.Model {
  get relation() {
    return {
      coach_tetail: {
        user: think.Model.BELONG_TO,
        model: 'coach', // model name
        key: 'coach_id',
        fKey: 'id'
      }
    };
  }
};
