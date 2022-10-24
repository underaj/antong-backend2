/**
 * @author wangjie
 * @description 车辆排期管理
 */
const Base = require("./base.js");
//时间函数导入的包
var moment = require("moment");
var gettime = require("../util/convert");

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  async demoCarAction() {
    console.info("调用车辆排期查询方法。。。。。。。。。");
    //获取科目类型
    const type = this.post("type");
    // 获取车号
    const carNo = this.post("carNo");

    //先需要根据条件查询数据信息
    const query = {
      date: { ">=": moment().add(-30, "days").format("YYYY-MM-DD") },
      type,
      is_delete: 0,
    };
    const carMap = {};
    const map = {};
    const final = [];
    let data = [];
    let car = [];

    if (carNo) {
      const queryCar = await this.model("car").where({ car_no: carNo }).find();
      if (queryCar.id) {
        car = [queryCar];
      }
      query.car_id = queryCar.id;
    } else {
      car = await this.model("car").select();
    }

    car.forEach((item) => {
      carMap[item.id] = item.car_no;
    });

    data = await this.model("timetable")
      .join("timetable_detail ON timetable.id=timetable_detail.timetable_id")
      .where(query)
      .field(
        "timetable_detail.id AS id, timetable.id AS timetable_id, car_id, date, date_logo, timecode, is_available, is_delete"
      )
      .select();

    data.forEach((item) => {
      if (map[item.car_id]) {
        if (map[item.car_id][item.date]) {
          map[item.car_id][item.date].push(item);
        } else {
          map[item.car_id][item.date] = [item];
        }
      } else {
        map[item.car_id] = {
          [item.date]: [item],
        };
      }
    });

    Object.keys(map).forEach((carId) => {
      const carObj = map[carId];
      const obj = {
        carId: Number(carId),
        name: carMap[carId],
        list: [],
      };
      Object.keys(carObj).forEach((date) => {
        obj.list.push({
          date,
          list: carObj[date],
        });
      });
      obj.list.sort((a, b) => {
        return moment(b.date).valueOf() - moment(a.date).valueOf();
      });
      final.push(obj);
    });

    //判断是否有输入车号
    return this.success(final);
  }

  getTimeCode(data) {
    let code = [];
    for (let index = 0; index < data.length; index++) {
      const element = data[index];
      code.push(element.timecode);
    }
    return code;
  }

  getTimetableCode(data, date02) {
    if (think.isEmpty(date02)) {
      return data;
    }
    let timecoed = [];
    for (let i = 0; i < data.length; i++) {
      const element = data[i];
      for (let j = 0; j < date02.length; j++) {
        const va02 = date02[j];
        if (element.timecode != va02.timecode) {
          timecoed.push(element);
        }
      }
    }
    return timecoed;
  }

  getCode(num) {
    //定义一个数组
    var arr = new Array(
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45
    );
    var flag = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] == num) {
        flag = 1;
        return flag;
      }
    }
    return flag;
  }
  /**
   *
   * @param {按照时间片段来取值} key
   */
  getTime(key) {
    var time = {
      1: "28",
      2: "28",
      3: "29",
      4: "29",
      5: "30",
      6: "30",
      7: "31",
      8: "31",
      9: "32",
      10: "32",

      13: "33",
      14: "33",
      15: "34",
      16: "34",
      17: "35",
      18: "35",
      19: "36",
      20: "36",
      21: "37",
      22: "37",

      24: "38",
      25: "38",
      26: "39",
      27: "39",

      42: "40",
      43: "40",
      44: "41",
      45: "41",

      28: "1,2",
      29: "3,4",
      30: "5,6",
      31: "7,8",
      32: "9,10",
      33: "13,14",

      34: "15,16",
      35: "17,18",
      36: "19,20",
      37: "21,22",
      38: "24,25",
      39: "26,27",
      40: "42,43",
      41: "44,45",
    };
    for (var k in time) {
      if (k == key) {
        return time[k];
      }
    }
  }

  convertutil(code, type) {
    var data = "";
    var timecode;
    if (code > 27 && code < 42) {
      timecode = gettime.threeTimeCode;
    } else {
      timecode = gettime.twoTimeCode;
    }
    for (let index = 0; index < timecode.length; index++) {
      const element = timecode[index];
      if (element.code == code) {
        data = element.time;
        return data;
      }
    }
    return data;
  }
};
