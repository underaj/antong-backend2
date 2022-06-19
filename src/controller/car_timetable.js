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
  /**
   * @description 车辆排期查询
   */
  async queryCarTimeTableAction() {
    console.info("调用车辆排期查询方法。。。。。。。。。");
    //获取科目类型
    let type = this.post("type");
    // 获取车号
    let id = this.post("carNo");

    let pageIndex = this.post("pageIndex");
    let pageSize = this.post("pageSize");

    let querySql = this.model("car").join({
      table: "v_timetable_detail",
      join: "inner",
      as: "b",
      on: ["id", "car_id"],
    });
    //判断是否有输入车号
    if (!think.isEmpty(id)) {
      querySql.where({ "car.id": id });
    }
    let data = await querySql
      .where({ "b.type": type, "car.is_delete": 1 })
      .page(pageIndex, pageSize)
      .countSelect(); //.page(pageIndex, pageSize).countSelect();

    return this.success(data);
  }

  /**
   * @description 添加车辆排期
   */
  async addCarTimeTableAction() {
    console.info(
      "调用添加车辆排期方法。。。。。。。。。" + JSON.stringify(this.post())
    );
    //获取排班日期 是一个数组对象
    var detail = this.post("detail");
    var carId = this.post("carId");
    var date = this.post("date");
    var type = this.post("type");
    //车辆id
    carId = JSON.parse(carId);
    //排班明细id
    detail = JSON.parse(detail);
    console.log("----------------->明细:=" + JSON.stringify(detail));
    //时间信息
    date = JSON.parse(date);
    //----------------------------------------------
    //定义时间函数
    var day = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    //定义timetable对象
    const addTimetable = this.model("timetable");
    //定义查询
    let query_car_timetable = this.model("timetable");
    //定义返回数据信息
    let return_msg = [];

    //carId为一个数组  date日期为一个数组 detail是一个数组
    for (let i = 0; i < carId.length; i++) {
      //拿到车辆id
      const car_Id = carId[i];
      //根据车辆id查询车号
      let car_no = await this.model("car")
        .where({ id: car_Id })
        .field("car_no")
        .find();
      //拿到日期数组做循环遍历
      for (let j = 0; j < date.length; j++) {
        const date01 = date[j];
        //根据车辆id 日期查询是否已经存在该日期的数据信息
        let is_ture = await this.model("timetable")
          .where({ date: date01, car_id: car_Id, type: type })
          .find();
        let id = null;
        if (think.isEmpty(is_ture)) {
          //添加排班数据到主表中
          id = await addTimetable.add({
            date: date01,
            car_id: car_Id,
            type: type,
            create_time: day,
            create_by: "admin", //从session中获取用户信息
          });
        } else {
          id = is_ture.id;
        }

        //如果type是科目二  那么就去查询科目三  反之
        let use_car = await query_car_timetable
          .where({ date: date01, car_id: car_Id, type: type == 1 ? 2 : 1 })
          .find();
        let time_code = this.model("timetable_detail");
        //做一个明细数组插入
        for (let index = 0; index < detail.length; index++) {
          const element = detail[index];
          //根据车辆id  日期 上下午时间 还有timecode进行取值判断  过滤掉已经排期的数据
          //用于做判断是否已经排过相同的时间排期了
          let aaa_ = await this.model("timetable")
            .join(
              "timetable_detail   ON timetable.id=timetable_detail.timetable_id"
            )
            .where({
              "timetable.id": id,
              "timetable_detail.date_logo": element.datelogo,
              "timetable_detail.timecode": element.timecode,
              "timetable_detail.is_delete": 0,
            })
            .find();
          if (!think.isEmpty(aaa_)) {
            continue;
          }

          //如果查询为空 那么说明还没有进行排期可以放行不做判断
          if (!think.isEmpty(use_car)) {
            //只存在上下午中会有时间重叠的现象
            // if (element.datelogo == 2 || element.datelogo == 1) {
            console.info("取出的时间code=============>" + element.timecode);
            let is_exit = this.getCode(element.timecode);
            console.log("取出的时间为:" + is_exit);
            //如果等于1 说明时间值存在在定义的数组里面
            if (is_exit == 1) {
              //跟时间值取相应的时间段
              let infomation = await time_code
                .where({
                  timetable_id: use_car.id,
                  //date_logo: element.datelogo,
                  timecode: ["in", this.getTime(element.timecode)],
                })
                .find();
              //如果不等于空说明有时间重合的部分
              if (!think.isEmpty(infomation)) {
                var _msg = {
                  date: date01,
                  car_no: car_no.car_no,
                  date_logo: element.datelogo,
                  timecode: element.timecode,
                  type: type == 1 ? 2 : 1,
                };
                return_msg.push(_msg);
                console.log("打印重合的数据信息" + JSON.stringify(_msg));
                continue;
              }
            }
            //  }
          }
          //循环执行添加
          await this.model("timetable_detail").add({
            timetable_id: id,
            timecode: element.timecode,
            date_logo: element.datelogo,
            create_time: day,
            is_available: 0,
          });
        }
      }
    }
    let mm = "";
    if (think.isEmpty(return_msg)) {
      return this.success(0, "排班成功");
    } else {
      for (let i = 0; i < return_msg.length; i++) {
        const element = JSON.parse(JSON.stringify(return_msg[i]));
        //科目类型
        let type = element.type == 1 ? "二" : "三";
        //上下午
        let date_logo =
          element.date_logo == 1
            ? "上午"
            : element.date_logo == 2
            ? "下午"
            : "晚上";
        //时间段
        let timecode = this.convertutil(element.timecode, type);
        console.log("打印时间段信息----》" + timecode);
        //拼接字符串
        mm =
          mm +
          element.date +
          ",车号:" +
          element.car_no +
          "与科目" +
          type +
          date_logo +
          "时间段(" +
          timecode +
          ")排期存在冲突;";
      }
      return this.success(mm);
    }
  }
  /**
   *@description 通过车号去查询哪些日期已排
   */
  async selectCarTimeTableByCarNo() {
    console.info(
      "调用车辆已排期(selectCarTimeTableByCarNo)查询方法。。。。。。。。。"
    );
    //车类型
    let cartype = this.post("cartype");
    //车号
    let carNo = this.post("carNo");
    //科目
    let project = this.post("project");
    //组装sql语句
    let query = this.model("car as a").join(
      "timetable as b on a.`id`=b.`car_id` "
    );
    if (!think.isEmpty(carNo)) {
      query.where({ "a.car_id": carNo });
    }
    //查询出当前车的排期时间数据
    let data = await query
      .where({ "b.type": project, "a.car_type": cartype })
      .field("a.`id`,a.`car_type`,b.`date`,b.`is_available`,b.`time_code_id`")
      .select();
    return this.success(data);
  }
  /**
   * 删除车辆排期updateCarTimeTable
   */
  async deleteCarTimeTableAction() {
    let id = this.post();
    let data = await this.model("timetable").where({ id: id }).find();
    if (think.isEmpty(data)) {
      return this.field(1000, "该排班数据不存在");
    }
    //删除明细表数据信息
    await this.model("timetable_detail")
      .where({ timetable_id: data.id })
      .delete();
    //删除主排班表数据信息
    await this.model("timetable").where({ id: carId }).delete();
    return this.success("删除成功");
  }

  /**
   * 根据id查询排班信息数据
   */
  async queryCarTimeTableByIdAction() {
    let id = this.post();
    let data = await this.model("v_timetable_detail").where({ id: id }).find();
    if (think.isEmpty(data)) {
      return this.field(1000, "该排班数据不存在");
    }
    // let detail = await this.model("timetable_detail").where({ timetable_id: data.id }).
    //     group("date_logo,timetable_id").
    //     field("timetable_id,date_logo,MIN(timecode) AS strat, MAX(timecode) AS END")
    //     .select();
    // data.detailDate = detail;

    return this.success(data);
  }

  /**
   * 修改排班数据信息 如果有预约数据则不能删除
   */
  async updateCarTimeAction() {
    var timedate = this.post();
    //定义时间函数
    var day = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    //根据id去查询是否有预约数据
    let is_use = await this.model("timetable a ")
      .join("timetable_detail b ON timetable.id=b.timetable_id")
      .where({ "a.id": timedate.id, "b.is_available": 1 })
      .select();
    if (is_use.length > 0) {
      return this.fail(1000, "已存在预约，请勿修改");
    }

    //定义timetable对象
    const addTimetable = this.model("timetable");
    //添加信息数据
    let id = await addTimetable
      .update(
        (cartime = {
          date: timedate.date,
          car_id: timedate.carId,
          is_available: 1,
          type: timedate.type,
          create_time: day,
          create_by: "admin", //从session中获取用户信息
        })
      )
      .where({ id: timedate.id });
    //删除明细数据 然后重新生成
    await this.model("timetable_detail")
      .where({ timetable_id: data.id })
      .delete();
    //生成明细数据信息
    //明细排班数据
    for (let i = 0; i < timedate.detail.length; i++) {
      const element = timedate.detail[i];
      console.info("车辆排班数据:" + element);
      //循环执行添加
      await this.model("timetable_detail").add(
        (cardetail = {
          timetable_id: id,
          timecode: element.code,
          date_logo: element.dateLogo,
          create_time: day,
        })
      );
    }
    return this.success("修改成功");
  }

  //查询所有车辆信息
  async selectCarAction() {
    console.info("调用car查询方法。。。。。。。。。");
    const querycar = this.model("car");
    let data = await querycar
      .where({ is_delete: 1 })
      .field("id,car_no,car_card,car_type")
      .select();
    return this.success(data);
  }

  async demoCarAction() {
    console.info("调用车辆排期查询方法。。。。。。。。。");
    //获取科目类型
    let type = this.post("type");
    // 获取车号
    let id = this.post("carNo");

    //先需要根据条件查询数据信息
    var demo = this.model("timetable")
      .join("car b ON timetable.car_id=b.id")
      .order("date DESC");
    
    //判断是否有输入车号
    if (!think.isEmpty(id)) {
      demo.where({ "b.car_no": id });
    }
    var str = [];
    //得到一个集合数据   "timetable.date": ["between", startTime, endTime],
    let tt = await demo
      .where({ "timetable.type": type, "b.is_delete": 1 })
      .field("DISTINCT b.id,b.car_no,timetable.car_id")
      .select();

    console.info("checking demo list length", tt.length);
    //如果查询数据为空则直接返回
    if (think.isEmpty(tt)) {
      return this.success(str);
    }
    //用来组装返回数据
    var returnData = [];
    //明细数据查询
    let car_detail_query = this.model("timetable_detail");
    for (let index = 0; index < tt.length; index++) {
      const element = tt[index];
      //组装数据 获取车号 、日期时间 以及id 去查询明细数据信息
      let car_detail = await this.model("timetable")
        .join("timetable_detail  ON timetable.id=timetable_detail.timetable_id")
        .where({
          "timetable.car_id": element.id,
          "timetable_detail.is_delete": 0,
          "timetable.type": type,
        })
        .order("date DESC")
        .limit(5)
        .field(
          "DISTINCT timetable.date,timetable.id,GROUP_CONCAT(timetable_detail.id)AS str"
        )
        .group("timetable.id")
        .select();
      if (think.isEmpty(car_detail)) {
        continue;
      }
      //遍历数据得到
      var name = element.car_no;
      var lists = [];
      for (let j = 0; j < car_detail.length; j++) {
        //得到日期和明细数据ID
        const _detail = car_detail[j];
        //查询出明细数据封装
        let _carDetail = await car_detail_query
          .where({ id: ["in", _detail.str] })
          .select();
        let date_car = {
          date: _detail.date,
          list: _carDetail,
        };
        lists.push(date_car);
      }
      var _msg = {
        name: name,
        carId: element.car_id,
        list: lists,
      };
      returnData.push(_msg);
    }
    return this.success(returnData);
  }

  /**
   * 修改或添加排期数据信息
   */
  async updateCarTimeTableAction() {
    //获取 汽车id
    let carId = this.post("carId");
    //获取日期
    let date = this.post("date");
    //科目类型
    let type = this.post("type");
    console.info("科目类型==》" + type);
    //获取要修改的数组
    let updateList = JSON.parse(this.post("idlist"));
    //获取要插入的数据数组
    let insertList = JSON.parse(this.post("vals")); //this.post("vals");
    //获取汽车名字
    let carNo = this.post("name");
    //定义一个记录修改 和新增的字段做记录
    let insetCount = 0;
    let updateCount = 0;
    //判断修改列表是否为空
    console.log("开始修改-------------》");
    if (!think.isEmpty(updateList)) {
      let updateStr = [];
      //判断可修改数组是否为空，  为空则是都已经预约了 不允许修改
      for (let i = 0; i < updateList.length; i++) {
        const element = updateList[i];
        //查询是否有过预订数据
        let car_time = await this.model("order_timetable")
          .where({ car_id: carId, timetable_id: element })
          .select();
        if (!think.isEmpty(car_time)) {
          continue;
        }
        updateStr.push(element);
      }
      //直接修改为已开放的状态
      await this.model("timetable_detail")
        .where({ id: ["in", updateStr] })
        .update({ is_delete: 1 });
      updateCount = updateStr.length;
    }
    console.log("开始新增-------------》");
    let query_car_timetable = this.model("timetable");
    let time_code = this.model("timetable_detail");
    //判断新增的数组是否为空
    if (!think.isEmpty(insertList)) {
      var insertAyya = [];
      var is_str = [];
      //根据是时间  类型 车号
      let timetableId = await this.model("timetable")
        .where({ date: date, car_id: carId, type: type })
        .find();
      if (!think.isEmpty(timetableId)) {
        //查询出所有code
        for (let index = 0; index < insertList.length; index++) {
          const element = insertList[index];
          console.log("-------1------------->" + JSON.stringify(element));
          let is_exite = await this.model("timetable")
            .join("timetable_detail  b ON timetable.id=b.timetable_id")
            .where({
              "timetable.date": date,
              "timetable.car_id": carId,
              "timetable.type": type,
              "b.timecode": element.timecode,
              "b.date_logo": element.date_logo,
            })
            .find();
          //查询是否重复
          let use_car = await query_car_timetable
            .where({ date: date, car_id: carId, type: type == 1 ? 2 : 1 })
            .find();
          if (!think.isEmpty(use_car)) {
            //只存在上下午中会有时间重叠的现象
            //  if (element.date_logo == 2 || element.date_logo == 1) {
            let is_exit = this.getCode(element.timecode);
            //如果等于1 说明时间值存在在定义的数组里面
            if (is_exit == 1) {
              //跟时间值取相应的时间段
              let infomation = await time_code
                .where({
                  timetable_id: use_car.id,
                  // date_logo: element.date_logo,
                  timecode: ["in", this.getTime(element.timecode)],
                  is_delete: 0,
                })
                .find();
              //如果不等于空说明有时间重合的部分
              if (!think.isEmpty(infomation)) {
                continue;
              }
            }
            //}
          }
          //如果为空则需要添加
          if (think.isEmpty(is_exite)) {
            insertAyya.push(element);
          } else {
            is_str.push(is_exite.id);
          }
        }
        if (!think.isEmpty(insertAyya)) {
          //循环进行添加
          for (let i = 0; i < insertAyya.length; i++) {
            const element = insertAyya[i];
            console.log("id" + timetableId.id);
            await think.model("timetable_detail").add({
              timetable_id: timetableId.id,
              timecode: element.timecode,
              date_logo: element.date_logo,
              is_available: 0,
              create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
            });
          }
        }
        if (!think.isEmpty(is_str)) {
          await this.model("timetable_detail")
            .where({ id: is_str })
            .update({ is_delete: 0 });
        }
      }
      insetCount = insertList.length;
    }
    return this.success("修改:" + updateCount + "条,新增:" + insetCount + "条");
  }

  /**
   * 删除车辆排期数据 按天进行删除
   */
  async deleteCarTimetableAction() {
    //拿到日期信息
    let date = this.post("date");
    //科目类型
    let type = this.post("type");
    //查询出该日期下所有的排班信息
    let allTimetable = await this.model("timetable")
      .where({ date: date, type: type })
      .field("id")
      .select();
    if (!think.isEmpty(allTimetable)) {
      let codeArray = [];
      for (let index = 0; index < allTimetable.length; index++) {
        const element = allTimetable[index];
        codeArray.push(element.id);
      }
      await this.model("timetable_detail")
        .where({ timetable_id: ["in", codeArray] })
        .delete();
      await this.model("timetable").where({ date: date, type: type }).delete();
    }
    return this.success("成功");
  }
  /**
   * 查询当天有哪些车辆已经做了排期
   */
  async queryTimeCarAction() {
    //拿到日期信息
    let date = this.post("date");
    //科目类型
    let type = this.post("type");
    //查询出该日期下所有的排班信息
    let allTimetable = await this.model("timetable")
      .join("timetable_detail b ON timetable.id=b.timetable_id")
      .where({ date: date, type: type, "b.is_available": 1 })
      .field("DISTINCT car_id")
      .select();
    let codeArray = [];
    if (!think.isEmpty(allTimetable)) {
      for (let index = 0; index < allTimetable.length; index++) {
        const element = allTimetable[index];
        let car_ = await this.model("car").where({ id: element.car_id }).find();
        codeArray.push(car_.car_no);
      }
    }
    return this.success(codeArray);
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
