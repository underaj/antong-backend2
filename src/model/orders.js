module.exports = class extends think.Model {
    get relation() {
        return {
            students: {
            type: think.Model.HAS_MANY, // relation type
            model: 'order_timetable', // model name
            name: 'students', //
            key: 'id',
            fKey: 'orders_id'
          }

          
        };
      }


};
