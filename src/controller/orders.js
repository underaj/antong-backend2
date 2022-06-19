/**
 * @author wangjie
 * @description 订单服务类
 */
const Base = require("./base.js");
var moment = require("moment");
var utilcode = require("../util/convert");
var wxutil = require("../utils/wxUtils");
let request = require("request");
const fs = require("fs");
const path = require("path");
var gettime = require("../util/convert");

module.exports = class extends Base {
  indexAction() {
    return this.display();
  }

  /**
   * @description 订单查询
   */
  async queryOrderAction() {
    // 当前登录用户信息
    let user = await this.session();

    console.log("用户信息:" + JSON.stringify(user));
    //获取查询条件
    let studentsName = this.post("studentsName"); //学员电话
    let coachId = this.post("coachId"); //教练card
    let ordersNum = this.post("ordersNum"); //订单编号
    let coachPhone = this.post("coachPhone"); //教练电话
    let ordersType = this.post("ordersType"); //订单状态  状态 1.预约 2.取消
    let pageIndex = this.post("pageIndex");
    let pageSize = this.post("pageSize");
    let is_return = this.post("isReturn"); //是否返点
    let type = this.post("type"); //账号查看订单的类型
    let status = this.post("status"); //账号查看订单的类型
    let coachName = this.post("coachName"); // 教练姓名
    //  时间code
    let timecode = this.post("timecode");
    let orderTime = this.post("orderTime");

    const query = this.model("v_main");
    const query01 = this.model("v_main");
    // 学员电话
    if (!think.isEmpty(studentsName)) {
      query.where({
        "v_main.student_name": ["like", "%" + studentsName + "%"],
      });
      query01.where({
        "v_main.student_name": ["like", "%" + studentsName + "%"],
      });
    }
    //  教练id
    if (!think.isEmpty(coachId)) {
      query.where({ "v_main.coach_card": coachId });
      query01.where({ "v_main.coach_card": coachId });
    }
    //  教练姓名
    if (!think.isEmpty(coachName)) {
      query.where({ "v_main.coach_name": coachName });
      query01.where({ "v_main.coach_name": coachName });
    }
    // 订单编号
    if (!think.isEmpty(ordersNum)) {
      query.where({ "v_main.order_code": ordersNum });
      query01.where({ "v_main.order_code": ordersNum });
    }
    //  教练电话
    if (!think.isEmpty(coachPhone)) {
      query.where({ "v_main.phone": coachPhone });
      query01.where({ "v_main.phone": coachPhone });
    }
    // 订单类型
    if (!think.isEmpty(ordersType)) {
      query.where({ "v_main.collection_type": ordersType });
      query01.where({ "v_main.collection_type": ordersType });
    }
    //  是否取消
    if (!think.isEmpty(is_return)) {
      query.where({ "v_main.is_return": is_return });
      query01.where({ "v_main.is_return": is_return });
    }
    //  科目类型
    if (!think.isEmpty(type)) {
      query.where({ "v_main.suject": type });
      query01.where({ "v_main.suject": type });
    }

    if (!think.isEmpty(status)) {
      query.where({ "v_main.status": status });
      query01.where({ "v_main.status": status });
    }
    // 时间code
    if (!think.isEmpty(timecode)) {
      query.where({ "v_main.time_code": ["in", timecode] });
      query01.where({ "v_main.time_code": ["in", timecode] });
    }
    // 预约日期搜索
    if (!think.isEmpty(orderTime)) {
      query.where({ "v_main.order_time": orderTime });
      query01.where({ "v_main.order_time": orderTime });
    }

    let data = await query
      .field(
        "v_main.id AS id,v_main.order_code AS order_code," +
          "v_main.order_type AS order_type,v_main.order_check AS order_check,v_main.suject AS suject,v_main.coach_name AS coach_name,v_main.coach_card AS coach_card," +
          "v_main.collection_type AS collection_type,v_main.pay_type as pay_type,v_main.status as status,v_main.operate_time,v_main.operate_by, GROUP_CONCAT( DISTINCT v_main.`time_code`) AS time_code,GROUP_CONCAT( CONCAT_WS(':',v_main.student_name,v_main.tel) ORDER BY v_main.id ASC SEPARATOR ',') as students" +
          ",v_main.phone as phone,v_main.is_return as is_return,v_main.order_time as order_time,v_main.create_time as create_time,v_main.coachId"
      )
      .group("v_main.id")
      .order("v_main.id DESC")
      .page(pageIndex, pageSize)
      .countSelect();
    //统计结果数据长度 做分页统计
    let countsize = await query01.count("DISTINCT id");
    return this.success({
      data: data,
      count: countsize,
    });
  }

  /**
   * @description 创建订单
   */
  async createOrdersAction() {
    //在logic中做参数校验
    var data = this.post();
    /**
     * data.type  1  科目2  2科目3
     */
    let user = await this.session("user");
    //需要做判断 对教练三次未完成订单拉黑教练~   黑名单不允许下订单

    //收款状态
    let collection_type = "";
    /**
     * 根据ordertype来判断小程序下单还是后台下单
     * order_type 订单类型 :  1 平售  小程序下单类型     2 加时 3 福利单 后台下单类型
     */
    if (data.orderType == 1) {
      collection_type = 1;
    } else if (data.orderType == 2 || data.orderType == 3) {
      collection_type = 3;
    } else {
      return this.fail(1000, "订单类型错误");
    }
    console.log("订单check--------------------------------start");

    let students = JSON.parse(this.post("students"));
    for (let index = 0; index < students.length; index++) {
      const element = students[index];
      //遍历学生的练车时间段去数据库中查询是否有可用的车辆
      let use_car = this.model("v_orders")
        .where({
          "v_orders.date": data.date,
          "v_orders.type": data.type,
          "v_orders.timecode": ["IN", element.timecode],
          "v_orders.is_available": 0, //是否可以使用
          "v_orders.car_type": element.carType, //车型
        })
        .select();
      //如果没有则直接返回没有车辆信息
      if (think.isEmpty(use_car) || use_car.length < element.timecode.length) {
        return this.fail(1000, "当前时间段没有足够可用车辆");
      }
    }
    console.log("订单check--------------------------------end");
    //生成订单号操作
    let orderCode = "";
    //定义一个数组用来装参数信息，
    var parameter = [];
    //定义一个数组装车号信息
    var carId = [];
    //定义一个标志位
    var flag = 1;
    //遍历data.students 数组信息
    console.info("订单锁单开始-------------------》");
    for (let index = 0; index < students.length; index++) {
      const element = students[index];
      let stuId = null;
      console.log("输出信息------》element:" + JSON.stringify(element));
      //添加学生信息
      if (element.coachId == "") {
        stuId = await this.queryStudent(
          element.name,
          element.tel,
          element.carType,
          data.coachId
        );
      }
      for (let j = 0; j < element.timecode.length; j++) {
        const code = element.timecode[j];
        //查询可以满足条件的车辆 然后进行分配
        var useCar = await this.model("v_orders")
          .where({
            "v_orders.date": data.date, //日期时间
            "v_orders.type": data.type, //科目类型
            "v_orders.timecode": code, //时间code
            "v_orders.is_available": 0, //是否可以使用
            "v_orders.car_type": element.carType, //车型
          })
          .order({
            "v_orders.car_id": "ASC",
            "v_orders.timecode": "ASC",
          })
          .limit(1)
          .find();
        //判断当前查询结果是否为空，如果为空，则直接返回 预约失败
        if (think.isEmpty(useCar)) {
          flag = 0;
          // return this.fail(1000, "当前时间段内的无可用车辆，预约失败");
          break;
        }
        //先将车辆锁单
        let id = await this.model("timetable_detail")
          .where({ id: useCar.id })
          .update({ is_available: 1 });
        carId.push(useCar.id);
        //用来装车辆id信息
        parameter.push({
          car_id: useCar.car_id, //车辆id
          students_id: element.coachId == "" ? stuId : element.studetId, //学生id
          time_code: code, //时间code
          create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
          create_by: user, //创建人  从session中拿去信息
          suject_type: data.type, //科目类型
          timetable_id: useCar.id, //排班信息id
        });
      }
    }
    console.info("订单锁单结束-------------------》" + flag);
    //如果为false则释放锁单信息
    if (flag === 0) {
      //将锁单的数据改为未使用状态
      if (!think.isEmpty(carId)) {
        await this.model("timetable_detail")
          .where({ id: ["in", carId] })
          .update({ is_available: 0 });
      }
      //清空carId数据信息
      carId = "";
      parameter = "";
      return this.fail(1000, "预约失败");
    }
    console.info("预约开始-------------------》");
    //计算定金金额
    let countAmount = parameter.length * 50;
    let returnAmount;

    /**
     * 按照科目类型计算定金和返点金额
     * 科目2  定金 每30分钟 80元   返点 每30分钟40元
     * 科目3  定金 每60分钟 80元   返点 每60分钟60元
     * data.type  1  科目2  2科目3
     */
    if (data.type == 1) {
      countAmount = parameter.length * 80;
      returnAmount = parameter.length * 40;
    } else {
      countAmount = parameter.length * 80;
      returnAmount = parameter.length * 60;
    }

    //最后生成订单 返回结果信息
    let ordersCountByDate = await this.model("orders")
      .where({ order_time: data.date })
      .count("id");

    // 订单号
    let order_num = await this.random_No(ordersCountByDate);

    //添加订单
    let ordersId = await this.model("orders").add({
      order_code: order_num, //订单编号
      order_type: data.orderType, //订单类型 1 平售 2 加时 3 福利单
      order_check: 0, //审核状态 只针对福利单 0 未审核 1 已审核
      suject: data.type, //科目
      coach_id: data.coachId, //教练id或操作人id
      order_time: data.date, //订单日期
      // order_time: data.timecode,//订单时间（开始时间和结束时间）(code)(英文逗号分隔)   应该可以不要
      pay_type: 2, //支付状态：1已支付 2未支付 3已完成 3已取消
      total_collection: collection_type == 3 ? 0 : countAmount, //订单金额
      collection: collection_type == 3 ? 0 : countAmount, //定金金额
      order_rebates: collection_type == 3 ? 0 : returnAmount, //返点金额
      create_by: user, //创建人
      create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
      collection_type: collection_type,
      is_traveler: data.coachId == "" ? 1 : 0,
      status: 1,
    });
    console.log("生成订单" + ordersId);
    //循环添加订单明细数据
    for (let index = 0; index < parameter.length; index++) {
      let element = parameter[index];
      //判断如果studentsId为空则进行学生信息添加
      console.log("打印学生信息-》" + JSON.stringify(element));
      await this.model("order_timetable").add({
        orders_id: ordersId, //订单id
        car_id: this.getJson(element, "car_id"), //车辆id
        students_id: this.getJson(element, "students_id"), //学生id
        time_code: this.getJson(element, "time_code"), //时间code
        create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
        create_by: user, //创建人
        suject_type: this.getJson(element, "suject_type"),
        timetable_id: this.getJson(element, "timetable_id"),
        time: data.date,
      });
    }
    console.info("预约结束-------------------》");
    //查询订单返回结果信息
    //   orders.id = ordersId;
    return this.success(ordersId);
  }

  /**
   * @description 订单明细查询
   */
  async queryOrdersByIdAction() {
    let id = this.post("id");
    if (think.isEmpty(id)) {
      return this.fail(1000, "id不能为空");
    }
    //判断当前订单id是否存在
    //let data= await this.model("orders as a").join("coach b ON a.`coach_id`=b.`id`").field("a.*,b.`name`,b.`phone`").where({"a.id":id}).find();
    let data = await this.model("orders").where({ id: id }).find();
    //判断当前是否为空
    if (think.isEmpty(data)) {
      return this.fail(1000, "当前订单不存在");
    }
    //根据order订单号去查询学生信息
    let stu = await this.model("order_timetable as a")
      .join("student b ON a.`students_id`=b.`student_id` ")
      .join("car c ON a.`car_id`=c.`id` ")
      .field(
        "a.id,a.`orders_id`,a.`time_code`,b.`name`,b.`tel`,c.`car_type`,c.car_no,c.`car_card`, b.student_id, a.print,a.is_print,a.print_num"
      )
      .where({
        "a.orders_id": data.id,
      })
      .select();
    let coachData = await this.model("orders")
      .join("coach b ON orders.coach_id=b.id")
      .where({ "orders.id": stu[0].orders_id })
      .find();
    //返回查询结果
    data.students = stu;
    data.coach = coachData;
    return this.success(data);
  }

  /**
   * @description 福利订单查询
   */
  async queryWelfareOrderAction() {
    //获取查询条件

    //获取查询条件
    let studentsName = this.post("studentsName"); //学员姓名
    let coachId = this.post("coachId"); //教练card
    let ordersNum = this.post("ordersNum"); //订单编号
    let coachPhone = this.post("coachPhone"); //教练电话
    let pageIndex = this.post("pageIndex");
    let pageSize = this.post("pageSize");
    const query = this.model("v_main");
    const query01 = this.model("v_main");
    let type = this.post("type"); //账号查看订单的类型
    let status = this.post("status"); //账号查看订单的类型
    let coachName = this.post("coachName"); //教练姓名
    //  时间code
    let timecode = this.post("timecode");
    let orderTime = this.post("orderTime");
    //  学员姓名
    if (!think.isEmpty(studentsName)) {
      query.where({
        "v_main.student_name": ["like", "%" + studentsName + "%"],
      });
      query01.where({
        "v_main.student_name": ["like", "%" + studentsName + "%"],
      });
    }
    //  教练id
    if (!think.isEmpty(coachId)) {
      query.where({ "v_main.coach_card": coachId });
      query01.where({ "v_main.coach_card": coachId });
    }
    // 订单编号
    if (!think.isEmpty(ordersNum)) {
      query.where({ "v_main.order_code": ordersNum });
      query01.where({ "v_main.order_code": ordersNum });
    }
    // 教练电话
    if (!think.isEmpty(coachPhone)) {
      query.where({ "v_main.phone": coachPhone });
      query01.where({ "v_main.phone": coachPhone });
    }
    // 教练姓名
    if (!think.isEmpty(coachName)) {
      query.where({ "v_main.coach_name": coachName });
      query01.where({ "v_main.coach_name": coachName });
    }

    if (!think.isEmpty(type)) {
      query.where({ "v_main.suject": type });
      query01.where({ "v_main.suject": type });
    }
    if (!think.isEmpty(status)) {
      query.where({ "v_main.status": status });
      query01.where({ "v_main.status": status });
    }
    // 时间code
    if (!think.isEmpty(timecode)) {
      query.where({ "v_main.time_code": ["in", timecode] });
      query01.where({ "v_main.time_code": ["in", timecode] });
    }
    // 预约日期搜索
    if (!think.isEmpty(orderTime)) {
      query.where({ "v_main.order_time": orderTime });
      query01.where({ "v_main.order_time": orderTime });
    }

    let data = await query
      .field(
        "v_main.id AS id,v_main.order_code AS order_code," +
          "v_main.order_type AS order_type,v_main.order_check AS order_check,v_main.suject AS suject,v_main.coach_name AS coach_name,v_main.coach_card AS coach_card," +
          "v_main.collection_type AS collection_type, GROUP_CONCAT( DISTINCT v_main.`time_code`) AS time_code,GROUP_CONCAT( CONCAT_WS(':',v_main.student_name,v_main.tel) ORDER BY v_main.id ASC SEPARATOR ',') as students" +
          ",v_main.phone as phone,v_main.is_return as is_return,v_main.order_time as order_time,v_main.create_time as create_time"
      )
      .where({ "v_main.order_type": 3 })
      .group("v_main.id")
      .order("v_main.id DESC")
      .page(pageIndex, pageSize)
      .countSelect();
    //统计结果数据长度 做分页统计
    let countsize = await query01
      .where({ "v_main.order_type": 3 })
      .count("DISTINCT id");
    return this.success({
      data: data,
      count: countsize,
    });
  }

  /**
   * 根据科目 日期 时间段去选择车辆排班情况
   */
  async queryCarTimeAction() {
    //获取科目类型
    let type = this.post("type");
    //日期选择
    let dateTime = this.post("datetime");
    //时间段选择
    let timeInterval = this.post("timeInterval");
    // //时间段选择
    // let carType = this.post("carType");

    let query = this.model("timetable as a").join("car b ON a.`car_id`=b.`id`");
    if (!think.isEmpty(type)) {
      query.where({ "a.type": type });
    }
    if (!think.isEmpty(timeInterval)) {
      query.where({ "a.time_code_id": ["IN", timeInterval] });
    }
    if (!think.isEmpty(dateTime)) {
      query.where({ "a.date": dateTime });
    }
    let data = await query
      .where({ "a.is_available": 0 })
      .field("a.* ")
      .select();
    return this.success(data);
  }

  /**
   * 取消订单信息
   */
  async cancelOrderAction() {
    //获取订单信息id
    let orderId = this.post("orderId");
    console.log("打印---》" + orderId);
    //查询订单信息
    let orders = await this.model("orders").where({ id: orderId }).find();
    if (think.isEmpty(orders)) {
      return this.field(1000, "不存在的订单信息");
    }
    //查询是否付款，付款需要先退款，没有付款则取消其它数据信息 释放车辆信息

    //修改订单状态
    await this.model("orders").where({ id: orders.id }).update({ status: 2 });
    //修改订单明细信息状态
    //await this.model("order_timetable").update({ status: 2 }).where({ orders_id: orders.orders_id });
    //释放车辆信息
    let carId = await this.model("order_timetable")
      .where({ orders_id: orders.id })
      .select();
    for (let index = 0; index < carId.length; index++) {
      const element = carId[index];
      await this.model("timetable_detail")
        .where({ id: element.timetable_id })
        .update({ is_available: 0 });
    }
    return this.success("取消成功");
  }

  /**
   * 创建订单时信息查询
   */
  async queryCarScheduleAction() {
    let data = this.post();
    //获取科目
    let subject = data.subject;
    //获取日期
    let date = data.date;
    //获取时间段
    let dateloge = data.dateloge;
    //关联车辆信息查询
    let carDetail = this.model("v_orders");
    // 分组统计数据信息
    let group = this.model("timetable")
      .join("timetable_detail b  ON timetable.id = b.timetable_id ")
      .join("car ON timetable.car_id = car.id");
    // 时间过滤
    let nowDay = moment(new Date()).format("YYYY-MM-DD");
    nowDay = moment(nowDay).unix();
    // 当前时间的小时
    let nowHoure = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
    console.log("nowHoure:" + nowHoure);
    nowHoure = moment(nowHoure).unix();
    // 判断日期是否是当天日期   如果是当天日期进行数据过滤
    // 将传入的日期 转为 时间戳
    let inputDate = moment(date).unix();
    console.log(">>>>>>>>>>>>>>" + (inputDate === nowDay));
    let code;
    // 判断是否是等于今天
    if (inputDate == nowDay) {
      console.log("进入");
      var dayTime = date + " " + "12:00:00";
      dayTime = moment(dayTime).unix();
      // 晚上
      var afterTime = date + " " + "18:00:00";
      afterTime = moment(afterTime).unix();
      // 晚上
      var nightTime = date + " " + "24:00:00";
      nightTime = moment(nightTime).unix();
      // 科目二
      var eghitTime = date + " " + "20:00:00";
      eghitTime = moment(eghitTime).unix();
      let timecode;
      // 当前时间的在哪个时间范围内 并且 是上午还是下午

      // 判断获取科目二的时间code还是科目三的时间code
      let timecodeGroup;
      if (subject == 1) {
        if (nowHoure > dayTime && nowHoure < nightTime) {
          timecode = 2;
        } else {
          timecode = 1;
        }
        timecodeGroup = gettime.twoTimeCode;
      } else {
        timecodeGroup = gettime.threeTimeCode;
        if (nowHoure > dayTime && nowHoure < afterTime) {
          timecode = 2;
        } else if (nowHoure > afterTime && nowHoure < nightTime) {
          timecode = 3;
        } else {
          timecode = 1;
        }
      }
      console.log(timecode);
      for (let index = 0; index < timecodeGroup.length; index++) {
        const element = timecodeGroup[index];
        // 取出时间区间 判断当前时间在哪个时间段中
        var startTime = date + " " + element.startTime + ":00";
        var endTime = date + " " + element.endTime + ":00";
        startTime = moment(startTime).unix();
        endTime = moment(endTime).unix();

        // 科目二
        if (subject == 1) {
          // 当时间为下午时候  当前时间大于结束时间时
          if (timecode == 2 && nowHoure > eghitTime) {
            code = 47;
            break;
          } else if (
            parseInt(startTime) < parseInt(nowHoure) &&
            parseInt(endTime) > parseInt(nowHoure) &&
            timecode == element.date_logo
          ) {
            code = element.code;
            break;
          }
          // 科目三
        } else {
          // 当前时间大于结束时间 并当前时间段为晚上 则直接取最大时间段
          if (timecode == 3 && nowHoure > eghitTime) {
            code = 41;
            break;
          } else if (
            parseInt(startTime) < parseInt(nowHoure) &&
            parseInt(endTime) > parseInt(nowHoure) &&
            timecode == element.date_logo
          ) {
            code = element.code;
            break;
          }
        }
      }
    }
    let query = this.model("timetable").join(
      " timetable_detail b  ON timetable.id=b.timetable_id  "
    );
    if (!think.isEmpty(date)) {
      query.where({ "timetable.date": date });
      carDetail.where({ "v_orders.date": date });
      group.where({ "timetable.date": date });
    }
    if (!think.isEmpty(dateloge)) {
      query.where({ "b.date_logo": dateloge });
      carDetail.where({ "v_orders.date_logo": dateloge });
      group.where({ "b.date_logo": dateloge });
    }
    if (!think.isEmpty(code)) {
      query.where({ "b.timecode": [">", code] });
      carDetail.where({ timecode: [">", code] });
      group.where({ "b.timecode": [">", code] });
    }
    let msg = await query
      .where({
        "timetable.type": subject,
        "b.is_available": 0,
        "b.is_delete": 0,
      })
      .field("timetable.type,timetable.date,b.date_logo,SUM(1) AS num")
      .group("date_logo")
      .select();
    //关联车辆信息查询
    console.log("------------------->");
    let detail = await carDetail
      .where({ type: subject, is_available: 0, is_delete: 0 })
      .select();
    // 统计
    let groupCount = await group
      .where({
        "timetable.type": subject,
        "b.is_available": 0,
        "b.is_delete": 0,
      })
      .field("car.`car_type` ,b.`date_logo` ,  SUM(1) AS num ")
      .group("date_logo ,  car.`car_type` ")
      .select();

    return this.success({
      msg,
      detail,
      groupCount,
    });
  }

  /**
   * 审批福利单
   */
  async approvalOrdersAction() {
    let data = this.post();
    // 当前登录用户信息
    let user = await this.session("user");
    //获取订单号id
    let id = data.id;
    //判断该订单是否存在
    let orders_exits = await this.model("orders")
      .where({ id: ["in", id], order_type: 3 })
      .select();
    if (think.isEmpty(orders_exits)) {
      return this.fail(1000, "未找到改福利单信息");
    }
    //获取操作类型 1 为审批通过 2 为拒绝
    let type = data.type;
    if (type == 1) {
      //更改为通过
      for (let index = 0; index < orders_exits.length; index++) {
        const element = orders_exits[index];
        if (element.order_check != 0) {
          continue;
        }
        await this.model("orders")
          .where({ id: element.id })
          .update({
            order_check: 1,
            pay_type: 1,
            operate_time: moment(new Date()).format("YYYY-MM-DD"),
            operate_by: user,
          });
      }
    } else if (type == 2) {
      for (let index = 0; index < orders_exits.length; index++) {
        const element = orders_exits[index];
        if (element.order_check != 0) {
          continue;
        }
        //更改为不通过
        await this.model("orders")
          .where({ id: element.id })
          .update({
            order_check: 2,
            operate_time: moment(new Date()).format("YYYY-MM-DD"),
            operate_by: user,
          });
      }
    } else {
      return this.fail(1000, "参数错误");
    }
    return this.success("审批成功");
  }

  /**
   * 取消返点
   */
  async cancelReturnAmountAction() {
    let id = JSON.parse(this.post().id);
    // 当前登录用户信息
    let user = await this.session("user");
    //操作类型 1返点  2取消返点
    let type = this.post().type;
    let query = this.model("orders");
    //首先查询是否是已经取消的返点状态
    // let is_return = await query.where({ id: ["in",[id]] }).select();
    // if(think.isEmpty(is_return)){
    //     return this.fail(1000,"订单信息有误");
    // }
    var returnCode = [];
    for (let index = 0; index < id.length; index++) {
      const element = id[index];
      let data = await query
        .join("order_timetable b ON orders.id=b.orders_id")
        .where({ "orders.id": element, "b.print": 1 })
        .find();
      //如果不为空 则说明有未打单的
      if (think.isEmpty(data)) {
        returnCode.push(element);
        continue;
      }
      //确定是否所有的订单已打单 才能进行返点
      //更新主表字段is_return
      if (type == 2) {
        //取消返点
        await this.model("orders")
          .where({ id: element })
          .update({
            is_return: 2,
            update_time: moment(new Date()).format("YYYY-MM-DD"),
            update_by: user,
          });
      } else {
        // 加时单  后台下单操作
        // if(data.order_type ==2){
        await this.model("orders")
          .where({ id: element })
          .update({
            is_return: 1,
            update_time: moment(new Date()).format("YYYY-MM-DD"),
            update_by: user,
          });
        //小程序订单
        // }else if(data.order_type ==1){
        //     console.log("返点状态更新-------------")
        //     let msg = await this.returnAmountAction(element);
        //     //等于0表示成功进行返点操作  再更新表字段信息
        //     if (msg != 1) {
        //         //已返点
        //         await this.model("orders").where({ id: element }).update({ is_return: 1 });
        //     }
        // }
      }
    }
    return this.success(returnCode);
  }

  /**
   * 打单和补单
   */
  async printOdersAction() {
    // 当前登录用户信息
    let user = await this.session();

    console.log("用户信息:" + JSON.stringify(user));
    //获取id
    let id = JSON.parse(this.post("id"));
    let type = this.post("type");
    console.log(type);

    //主订单id
    let orderId = this.post("orderId");
    console.log(id);
    //判断该条信息是否存在
    let data = await this.model("order_timetable")
      .where({ id: ["in", id] })
      .select();
    if (think.isEmpty(data)) {
      return this.fail(1000, "不存在学生信息");
    }
    // 获取系统当前月份第一天
    let firstDay = moment(new Date()).startOf("month").format("YYYY-MM-DD");
    // 获取系统当前月份最后一天
    let endDay = moment(new Date()).endOf("month").format("YYYY-MM-DD");
    let orderCode = "";
    if (type == 1) {
      //打单 完成
      for (let index = 0; index < id.length; index++) {
        const element = id[index];
        // let countSize=await this.model("order_timetable").where({ orders_id: orderId, print: 1 }).count();
        let ordersCountByDate = await this.model("order_timetable")
          .where(
            "DATE_FORMAT(update_time,'%Y-%m-%d')" +
              ">= DATE_FORMAT('" +
              firstDay +
              "','%Y-%m-%d')  and  DATE_FORMAT(update_time,'%Y-%m-%d')" +
              "<= DATE_FORMAT('" +
              endDay +
              "','%Y-%m-%d') and print = 1"
          )
          .count();

        let order_num = await this.random_No(ordersCountByDate);

        orderCode = "A" + order_num;
        await this.model("order_timetable")
          .where({ id: element })
          .update({
            print: 1,
            print_num: orderCode, //打印的订单号
            update_by: user,
            update_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
          });
        //根据ordersId查询该订单下是否已完成打单  完成之后更新主表中的字段
        let is_all_print = await this.model("order_timetable")
          .where({ orders_id: orderId, print: 0 })
          .select();
        //如果为空 则表示都已完成打单  更新主表的字段收据
        if (think.isEmpty(is_all_print)) {
          await this.model("orders")
            .where({ id: orderId })
            .update({
              collection_type: 2,
              operate_by: user,
              pay_type: 1,
              operate_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
            });
        } else {
          await this.model("orders")
            .where({ id: orderId })
            .update({
              collection_type: 3,
              operate_by: user,
              operate_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
            });
        }
      }
    } else if (type == 2) {
      //判断是否已补单
      let orders_is_print = await this.model("order_timetable")
        .where({ id: ["in", id] })
        .find();
      for (let index = 0; index < orders_is_print.length; index++) {
        const element = orders_is_print[index];
        //如果is_print等于1 则表示已完成打单
        if (element.is_print == 1) {
          continue;
        }
        //补单
        await this.model("order_timetable")
          .where({ id: element.id })
          .update({
            is_print: 1,
            update_by: user,
            update_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
          });
      }
      orderCode = orders_is_print.print_num;
    } else {
      return this.fail(1000, "参数错误");
    }
    return this.success(orderCode);
  }
  /**
   * 查询最大时间和最小时间
   *  创建订单的时候进行查询
   * @param type 科目
   * @param date 日期
   * @returns 返回当天每个时间段的最小时间和最大时间
   */
  async queryMaxTimeAndMinTimeAction() {
    //type
    let type = this.post("type");
    //date
    let date = this.post("date");
    let data = await this.model("timetable")
      .join("timetable_detail b ON timetable.id=b.timetable_id ")
      .where({ "timetable.date": date, "timetable.type": type })
      .group("b.date_logo")
      .field("MIN(b.timecode),MAX(b.timecode),date_logo")
      .select();
    return this.success(data);
  }

  /**
   * 小程序查询所有订单信息
   */
  async queryCoachOrdersByIdAction() {
    let data = this.post();
    //获取教练id
    let coachId = data.coachId;
    let pageIndex = this.post("pageIndex");
    let pageSize = this.post("pageSize");
    let type = data.type;
    if (think.isEmpty(coachId)) {
      return this.fail(1000, "教练id不能为空");
    }
    let coach_ = await this.model("coach").where({ id: coachId }).find();
    if (think.isEmpty(coach_)) {
      return this.fail(1099, "GET_ERROR");
    }

    //  ["全部订单", "待支付", "已支付定金", "已支付尾款"],0，1，2，3
    let ordersModeld = this.model("v_main");
    let or = this.model("v_main");

    if (!think.isEmpty(type)) {
      if (type == 1) {
        //待支付
        ordersModeld.where({
          pay_type: 2,
          collection_type: ["in", "1,4"],
          status: 1,
        });
        or.where({ pay_type: 2, collection_type: 1, status: 1 });
      } else if (type == 2) {
        //已支付定金
        ordersModeld.where({ pay_type: 1, collection_type: 1, status: 1 });
        or.where({ pay_type: 1, collection_type: 1, status: 1 });
      } else if (type == 3) {
        //已支付尾款
        ordersModeld.where({ pay_type: 1, collection_type: 2, status: 1 });
        or.where({ pay_type: 1, collection_type: 2, status: 1 });
      }
    }

    //status  0 未知  1 待支付  2 已支付尾款  3 已支付
    let orders = await ordersModeld
      .join("car ON v_main.car_id=car.id")
      .where({ "v_main.coachId": coachId })
      .field(
        "v_main.id,v_main.order_code,v_main.suject ,v_main.order_time as order_time,v_main.pay_type,v_main.collection_type,GROUP_CONCAT( CONCAT_WS(':',v_main.student_name,v_main.tel,car.car_no,car.car_type,v_main.student_id,v_main.time_code)ORDER BY v_main.id ASC SEPARATOR ',') as students ,v_main.create_time as create_time" +
          ",(CASE WHEN v_main.pay_type=1 AND v_main.collection_type=1  AND v_main.status=1 THEN 2 WHEN  v_main.pay_type=2 AND v_main.collection_type=1  AND v_main.status=1 THEN 1 WHEN  v_main.pay_type=2 AND v_main.collection_type=4  AND v_main.status=1 THEN 1 WHEN  v_main.pay_type=1 AND v_main.collection_type=2 AND v_main.status=1 THEN 3 WHEN  v_main.pay_type=3 AND v_main.collection_type=1  AND v_main.status=2  THEN 4 WHEN v_main.pay_type=1 AND v_main.collection_type=3 AND v_main.status=1 THEN 6   WHEN v_main.status=2 THEN 5 ELSE 0 END) AS STATUS"
      )
      .group("v_main.id")
      .order("v_main.create_time DESC")
      .page(pageIndex, pageSize)
      .countSelect();

    let countsize = await or
      .where({ "v_main.coachId": coachId })
      .count("DISTINCT id");
    return this.success({
      data: orders,
      count: countsize,
    });
  }

  /**
   * @description 创建订单
   */
  async createOrdersByXiaoChengxuAction() {
    //在logic中做参数校验
    var data = this.post();
    /**
     * data.type  1  科目2  2科目3
     */

    //需要做判断 对教练三次未完成订单拉黑教练~   黑名单不允许下订单
    if (!think.isEmpty(data.coachId)) {
      let is_true = await this.checkCoachBlackList(data.coachId);
      if (is_true) {
        console.log("更新为黑名单数据信息------------》");
        await this.model("coach")
          .where({ id: data.coachId })
          .update({ is_blacklist: 1 });
      }
    }
    let coachInfor = await think
      .model("coach")
      .where({ id: data.coachId })
      .find();
    if (coachInfor.status_flag != 1) {
      return this.fail(1000, "该教练账号还未通过审核,暂时无法使用下单功能");
    }
    if (coachInfor.is_blacklist == 1) {
      return this.fail(1000, "该教练账号未完成订单较多,已拉入黑名单~");
    }
    //收款状态
    let collection_type = "";
    /**
     * 根据ordertype来判断小程序下单还是后台下单
     * order_type 订单类型 :  1 平售  小程序下单类型     2 加时 3 福利单 后台下单类型
     */
    if (data.orderType == 1) {
      collection_type = 1;
    } else if (data.orderType == 2 || data.orderType == 3) {
      collection_type = 3;
    } else {
      return this.fail(1000, "订单类型错误");
    }
    console.log("订单check--------------------------------start");

    let students = JSON.parse(this.post("students"));
    console.log("学生信息====》" + students);
    for (let index = 0; index < students.length; index++) {
      const element = students[index];
      //遍历学生的练车时间段去数据库中查询是否有可用的车辆
      let use_car = this.model("v_orders")
        .where({
          "v_orders.date": data.date,
          "v_orders.type": data.type,
          "v_orders.timecode": ["IN", element.timecode],
          "v_orders.is_available": 0, //是否可以使用
          //   "v_orders.car_type": element.carType  //车型
        })
        .select();
      //如果没有则直接返回没有车辆信息
      if (think.isEmpty(use_car) || use_car.length < element.timecode.length) {
        return this.fail(1000, "当前时间段没有足够可用车辆");
      }
    }
    console.log("订单check--------------------------------end");
    //生成订单号操作

    //定义一个数组用来装参数信息，
    var parameter = [];
    //定义一个数组装车号信息
    var carId = [];
    //定义一个标志位
    var flag = 1;
    //遍历data.students 数组信息
    console.info("订单锁单开始-------------------》");
    for (let index = 0; index < students.length; index++) {
      const element = students[index];
      let stuId = null;
      console.log("输出信息------》element:" + JSON.stringify(element));
      //添加学生信息
      if (element.coachId == "") {
        stuId = await this.queryStudent(
          element.name,
          element.tel,
          element.carType,
          data.coachId
        );
      }
      for (let j = 0; j < element.timecode.length; j++) {
        const code = element.timecode[j];
        //查询可以满足条件的车辆 然后进行分配
        var useCar = await this.model("v_orders")
          .where({
            "v_orders.date": data.date, //日期时间
            "v_orders.type": data.type, //科目类型
            "v_orders.timecode": code, //时间code
            "v_orders.is_available": 0, //是否可以使用
            "v_orders.car_type": element.carType, //车型
          })
          .order({
            "v_orders.car_id": "ASC",
            "v_orders.timecode": "ASC",
          })
          .limit(1)
          .find();
        //判断当前查询结果是否为空，如果为空，则直接返回 预约失败
        if (think.isEmpty(useCar)) {
          flag = 0;
          // return this.fail(1000, "当前时间段内的无可用车辆，预约失败");
          break;
        }
        //先将车辆锁单
        let id = await this.model("timetable_detail")
          .where({ id: useCar.id })
          .update({ is_available: 1 });
        carId.push(useCar.id);
        //用来装车辆id信息
        parameter.push({
          car_id: useCar.car_id, //车辆id
          students_id: element.coachId == "" ? stuId : element.studetId, //学生id
          time_code: code, //时间code
          create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
          create_by: "admin", //创建人  从session中拿去信息
          suject_type: data.type, //科目类型
          timetable_id: useCar.id, //排班信息id
        });
      }
    }
    console.info("订单锁单结束-------------------》" + flag);
    //如果为false则释放锁单信息
    if (flag === 0) {
      //将锁单的数据改为未使用状态
      if (!think.isEmpty(carId)) {
        await this.model("timetable_detail")
          .where({ id: ["in", carId] })
          .update({ is_available: 0 });
      }
      //清空carId数据信息
      carId = "";
      parameter = "";
      return this.fail(1000, "预约失败");
    }
    console.info("预约开始-------------------》");
    //计算定金金额
    let countAmount = parameter.length * 50;
    let returnAmount;

    /**
     * 按照科目类型计算定金和返点金额
     * 科目2  定金 每30分钟 80元   返点 每30分钟40元
     * 科目3  定金 每60分钟 80元   返点 每60分钟60元
     *
     *
     *
     * 2021年5月28日版本
     * 科目2  定金 每30分钟 100元   返点 每30分钟40元
     *
     * 2021年6月1日修改  科目二返点修改为50元
     *
     * 2021年6月30日修改
     * 科目3 定金 每一个小时 120元  返点 每一个小时80元
     *
     * data.type  1  科目2  2科目3
     */
    console.log("订单类型:" + data.type);
    if (data.type == 1) {
      countAmount = parameter.length * 100;
      returnAmount = parameter.length * 50;
    } else {
      countAmount = parameter.length * 120;
      returnAmount = parameter.length * 80;
    }

    console.log(
      "订单价格:" + countAmount + "------------------->" + returnAmount
    );
    //最后生成订单 返回结果信息
    let ordersCountByDate = await this.model("orders")
      .where({ order_time: data.date })
      .count("id");

    let order_num = await this.random_No(ordersCountByDate);
    //添加订单
    let ordersId = await this.model("orders").add({
      order_code: order_num, //订单编号
      order_type: data.orderType, //订单类型 1 平售 2 加时 3 福利单
      order_check: 0, //审核状态 只针对福利单 0 未审核 1 已审核
      suject: data.type, //科目
      coach_id: data.coachId, //教练id或操作人id
      order_time: data.date, //订单日期
      // order_time: data.timecode,//订单时间（开始时间和结束时间）(code)(英文逗号分隔)   应该可以不要
      pay_type: 2, //支付状态：1已支付 2未支付 3已完成 3已取消
      total_collection: countAmount, //订单金额
      collection: countAmount, //定金金额
      order_rebates: returnAmount, //返点金额
      create_by: "admin", //创建人
      create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
      collection_type: 4,
      is_traveler: data.coachId == "" ? 1 : 0,
      status: 1,
    });
    console.log("生成订单" + ordersId);
    //循环添加订单明细数据
    for (let index = 0; index < parameter.length; index++) {
      let element = parameter[index];
      //判断如果studentsId为空则进行学生信息添加
      console.log("打印学生信息-》" + JSON.stringify(element));
      await this.model("order_timetable").add({
        orders_id: ordersId, //订单id
        car_id: this.getJson(element, "car_id"), //车辆id
        students_id: this.getJson(element, "students_id"), //学生id
        time_code: this.getJson(element, "time_code"), //时间code
        create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
        create_by: "admin", //创建人
        suject_type: this.getJson(element, "suject_type"),
        timetable_id: this.getJson(element, "timetable_id"),
        time: data.date,
      });
    }
    console.info("预约结束-------------------》");
    //查询订单返回结果信息
    //   orders.id = ordersId;
    //发送站内信信息
    let detail =
      "您预约的考试时间为 " +
      data.date +
      "的订单已成功保留车位，请在15分钟内完成支付";
    await this.model("user_in_mail").add({
      detail: detail,
      create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
      coach_id: data.coachId,
      is_find: 0,
      delete_flag: 0,
    });
    return this.success(ordersId);
  }

  /**
   *
   */
  async returnAmountAction(orderId) {
    //获取订单号

    if (think.isEmpty(orderId)) {
      return this.fail(1000, "orderId 订单不能为空");
    }
    //根据订单号查询订单数据获取订单金额
    let order = await this.model("orders")
      .where({ id: orderId, pay_type: 1, collection_type: 2, is_return: 0 })
      .find();

    if (think.isEmpty(order)) {
      return 1;
    }
    let coach = await this.model("coach").where({ id: order.coach_id }).find();
    if (think.isEmpty(coach)) {
      return 1;
    }

    //根据订单号去查询支付订单里面的商户号ID
    let out_trade_no = await this.model("payment")
      .where({ orders_id: orderId })
      .find();
    if (think.isEmpty(out_trade_no)) {
      return 1;
    }
    //商家退款订单号
    let out_return_trade_no = wxutil.guid();
    //组装退款参数信息
    var refund_orders = {
      appid: "wxedecb11f0d2bd76e", //小程序id
      mch_id: "1602216256", //商户号id
      nonce_str: wxutil.randomChar(32), //随机字符串
      out_trade_no: out_trade_no.out_trade_no, // 商户订单号
      total_fee: order.collection * 100, //order.collection * 100, //订单定金金额
      out_refund_no: out_return_trade_no, //退款订单号
      refund_fee: order.order_rebates * 100, //退款返点金额
    };
    console.log("生成订单参数组装:" + JSON.stringify(refund_orders));
    //调用支付统一下单api() 微信后台
    let data = await wxutil.refundOrder(refund_orders);
    var refund = null;
    let remoteCall = () => {
      let deferred = think.defer();
      request(
        {
          url: "https://api.mch.weixin.qq.com/secapi/pay/refund",
          agentOptions: {
            pfx: fs.readFileSync(
              path.resolve(process.cwd(), "././src/wx_api/apiclient_cert.p12")
            ),
            //fs.readFileSync("D:/Progame Files/vscode/vscode-workspace/practice-car/src/wx_api/apiclient_cert.p12"),
            passphrase: "1602216256",
          },
          method: "POST",
          body: data,
        },
        function (err, data) {
          let rusult = wxutil.parserXml(JSON.parse(JSON.stringify(data)).body);
          let xml = JSON.parse(JSON.stringify(rusult)).xml;
          refund = {
            xml: xml,
            out_return_trade_no: out_return_trade_no,
            out_trade_no: out_trade_no.out_trade_no,
          };
          deferred.resolve(refund);
        }
      );
      return deferred.promise;
    };
    //拿到调用的返回值进行数据取值
    let result = await remoteCall();
    console.log(result);
    if (result.xml.return_code == "SUCCESS") {
      await this.model("orders")
        .where({ id: out_trade_no.orders_id })
        .update({ pay_type: 3 });
      //添加退款记录信息
      await this.model("refund").add({
        out_trade_no: out_trade_no.out_trade_no, //商户订单号
        amount: out_trade_no.amount, //退款金额
        response: JSON.stringify(data), //返回响应
        create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
        status: result.xml.return_code, //返回状态信息
        order_timetable_id: out_trade_no.orders_id, //订单id
      });
      return 0;
    } else {
      //添加退款记录信息
      await this.model("refund").add({
        out_trade_no: out_trade_no.out_trade_no, //商户订单号
        amount: out_trade_no.amount, //退款金额
        response: JSON.stringify(data), //返回响应
        create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
        status: result.xml.return_code, //返回状态信息
        order_timetable_id: out_trade_no.orders_id, //订单id
      });
      return 1;
    }
  }

  /**
   * 自动返点操作
   */
  async autoReturnAmountAction() {
    console.log("开始返点任务~~~~~~~");
    //然后根据教练信息查询所有订单数据订单   条件:  订单状态为已支付  全款  未返点 体验时间后24小时
    let orders = await this.model("orders")
      .join(" `coach` b ON orders.coach_id = b.id ")
      .where(
        "b.status_flag = 1 AND b.wx_open_id IS NOT NULL AND orders.pay_type = 1  AND orders.is_return = 0 AND orders.collection_type = 2  and DATE_FORMAT(NOW(),'%Y-%m-%d') = DATE_ADD(STR_TO_DATE(orders.`order_time`,'%Y-%m-%d'),INTERVAL 1 DAY)"
      )
      // .where("b.status_flag = 1 AND b.wx_open_id IS NOT NULL AND orders.pay_type = 1  AND orders.is_return = 0 AND orders.collection_type = 2 ")
      .field("orders.*")
      .select();
    //如果没有订单则不继续执行下去
    if (think.isEmpty(orders)) {
      return;
    }
    for (let i = 0; i < orders.length; i++) {
      //拿到订单数据进行退款操作
      const element = orders[i];
      console.log("订单编号为:" + element.id + "开始" + element);
      //查询付款记录拿到商户订单号
      let payment = await this.model("payment")
        .where({ orders_id: element.id, status: "SUCCESS" })
        .find();
      if (think.isEmpty(payment)) {
        continue;
      }
      //商家退款订单号
      let out_return_trade_no = wxutil.guid();

      //组装退款参数信息
      var refund_orders = {
        appid: "wxedecb11f0d2bd76e", //小程序id
        mch_id: "1602216256", //商户号idunz
        nonce_str: wxutil.randomChar(32), //随机字符串
        out_trade_no: payment.out_trade_no, // 商户订单号
        total_fee: element.collection * 100, //order.collection * 100, //订单定金金额
        out_refund_no: out_return_trade_no, //退款订单号
        refund_fee: element.order_rebates * 100, //退款金额 orders.order_rebates
        // "notify_url": "https://mmantong.com/practice/pay/returnRefund"  // 微信退款回调地址 https://mmantong.com/practice/pay/returnRefund
      };
      console.log("生成订单参数组装:" + JSON.stringify(refund_orders));
      //调用支付统一下单api() 微信后台
      let data = await wxutil.refundOrder(refund_orders);
      var refund = null;
      //捕获异常  当某一个订单调用的时候发生异常

      let remoteCall = () => {
        let deferred = think.defer();
        request(
          {
            url: "https://api.mch.weixin.qq.com/secapi/pay/refund",
            agentOptions: {
              pfx: fs.readFileSync(
                path.resolve(process.cwd(), "././src/wx_api/apiclient_cert.p12")
              ), //fs.readFileSync("D:/Progame Files/vscode/vscode-workspace/practice-car/src/wx_api/apiclient_cert.p12"),
              passphrase: "1602216256",
            },
            method: "POST",
            body: data,
          },
          function (err, data) {
            let rusult = wxutil.parserXml(
              JSON.parse(JSON.stringify(data)).body
            );
            let xml = JSON.parse(JSON.stringify(rusult)).xml;
            refund = {
              xml: xml,
              out_return_trade_no: out_return_trade_no,
              out_trade_no: payment.out_trade_no,
            };
            deferred.resolve(refund);
          }
        );
        return deferred.promise;
      };

      console.log("获取回调·································");
      //拿到调用的返回值进行数据取值
      let result = await remoteCall();
      console.log(result);
      // 判断result返回的code是否成功，成功则对payment表进行数据插入
      if (result.xml.result_code == "SUCCESS") {
        //更新主表的状态
        await this.model("orders")
          .where({ id: payment.orders_id })
          .update({ is_return: 1 });
        //添加退款记录信息
        await this.model("refund").add({
          out_trade_no: payment.out_trade_no, //商户订单号
          amount: payment.amount, //退款金额
          response: "", //返回响应
          create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
          status: "", //返回状态信息
          order_timetable_id: payment.orders_id, //订单id
          out_refund_no: result.xml.refund_id, // 微信退款单号
        });
      } else {
        // //添加退款记录信息
        // await this.model("refund").add({
        //     out_trade_no: payment.out_trade_no,//商户订单号
        //     amount: payment.amount,//退款金额
        //     response: JSON.stringify(data),//返回响应
        //     create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建时间
        //     status: result.xml.return_code,//返回状态信息
        //     order_timetable_id: payment.orders_id //订单id
        // });
      }
    }
  }

  /**
   * 订单号生成
   */
  async random_No(num) {
    let amountNum;
    if (think.isEmpty(num) || num == "null") {
      amountNum = 5;
      num = 0;
    } else {
      amountNum = 6 - (num + "").length;
    }

    let td = await this.random(amountNum);

    console.log("td-------------》" + td);

    let orders_num = td + (num + "");

    let month = moment().month() + 1;
    let day = moment().date();
    return (
      moment().year().toString() +
      (month.toString().length < 2
        ? "0" + month.toString()
        : month.toString()) +
      (day.toString().length < 2 ? "0" + day.toString() : day.toString()) +
      orders_num
    );
  }

  /**
   *
   * @param {对象} data
   * @param {键值} key
   */
  getJson(data, key) {
    for (var k in data) {
      if (k == key) {
        return data[k];
      }
    }
  }

  async queryStudent(name, tel, carType, coachId) {
    console.log("学生添加开始====");
    let students = await think
      .model("student")
      .where({ name: name, tel: tel })
      .find();
    let s_id = null;
    if (think.isEmpty(students)) {
      s_id = await this.model("student").add({
        name: name,
        car_stuatus: carType,
        tel: tel,
        coach_id: coachId == "" ? "" : coachId,
        create_by: "admin",
        create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
      });
      console.info(s_id);
      return s_id;
    } else {
      return students.student_id;
    }
  }

  // 判断是否黑名单
  async isBlackList(coachId) {
    var coach = await this.model("coach")
      .where({ id: coachId, delete_flag: 0 })
      .find();
    if (think.isEmpty(coach)) {
      return false;
    }
    var isBlacklistUpdateTime = coach.is_blacklist_update_time; // 黑名单修改时间
    if (think.isEmpty(isBlacklistUpdateTime)) {
      var orderList = await this.model("orders")
        .where({ coach_id: coachId })
        .select();
      if (think.isEmpty(orderList)) {
        return false;
      } else {
        var orderTimetableCountNumber = 0;

        for (var i = 0; i < orderList.length; i++) {
          var ordersId = orderList[i].id;
          var orderTimetableList = await this.model("order_timetable")
            .where({ orders_id: ordersId, print: 0 })
            .select();
          if (orderTimetableList.length !== 0) {
            orderTimetableCountNumber++;
          }
        }
        if (orderTimetableCountNumber >= 3) {
          return true;
        } else {
          return false;
        }
      }
    } else {
      // 黑名单修改时间不为空
      var updateTime = moment(isBlacklistUpdateTime).unix();
      var orderListByUpdateTime = await this.model("orders")
        .where(
          updateTime + " <= UNIX_TIMESTAMP(create_time)",
          "coach_id = " + coachId
        )
        .select();
      if (think.isEmpty(orderListByUpdateTime)) {
        return false;
      } else {
        var orderTimetableCountNumberByUpdateTime = 0;

        for (var j = 0; j < orderListByUpdateTime.length; j++) {
          var ordersIdByUpdateTime = orderListByUpdateTime[j].id;

          var orderTimetableListByUpdateTime = await this.model(
            "order_timetable"
          )
            .where({ orders_id: ordersIdByUpdateTime, print: 0 })
            .select();
          if (orderTimetableListByUpdateTime.length !== 0) {
            orderTimetableCountNumberByUpdateTime++;
          }
        }
        if (orderTimetableCountNumberByUpdateTime >= 3) {
          return true;
        } else {
          return false;
        }
      }
    }
  }
  /**
   * 判断教练是否是黑名单
   * @param {教练id} coachId
   */
  async checkCoachBlackList(coachId) {
    //判断当前账号不是黑名单 则去判断在当前时间之前预约的数据是否满足3个未打单
    //获取当前时间信息
    // time  0黑名单之前计算统计未打单次数   1解除黑名单之后不做统计
    // await this.model("orders").where({coach_id:coachId,"DATE_FORMAT(NOW(),'%Y-%m-%d %H:%i::%s')":[ "<", "CONCAT("+order_time+","+22:00:00+")"] })
    let countSize = await this.model("orders")
      .join("order_timetable b ON  orders.id=b.orders_id")
      .where({
        coach_id: coachId,
        "orders.order_time": { "<": moment().format("YYYY-MM-DD") },
        "b.print": 0,
        "b.is_black": 0,
        STATUS: 1,
      })
      .select();
    console.log("统计次数----------》" + countSize.length);
    if (countSize.is_blacklist == 0) {
      //如果未打单的数据为空或者 数量小于3 则放行
      if (think.isEmpty(countSize) || countSize.length < 3) {
        return false;
      } else {
        return true;
      }
    } else {
      //返回是黑名单的
      return false;
    }
  }

  /**
   * 十五分钟未支付订单自动取消
   */
  async autoCancelOrdersByTimeCronAction() {
    //按照时间查询 所有订单数据信息  拿创建时间 +15分钟与当前时间做比较  超出15分钟则自动取消订单 释放资源信息
    let data = await this.model("orders")
      .where({ status: 1, pay_type: 2 })
      .select();
    if (think.isEmpty(data)) {
      console.log("未有超时待支付订单信息~");
      return this.success("未有超时待支付订单信息~");
    }

    for (let index = 0; index < data.length; index++) {
      const element = data[index];
      var createTime = moment(element.create_time)
        .add(15, "minute")
        .format("YYYY-MM-DD HH:mm:ss"); // 15分钟
      var newDate = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
      console.log(moment(newDate).isAfter(createTime));
      if (moment(newDate).isAfter(createTime)) {
        let orders = await this.model("orders")
          .where({ id: element.id })
          .find();
        if (think.isEmpty(orders)) {
          continue;
        }
        //查询是否付款，付款需要先退款，没有付款则取消其它数据信息 释放车辆信息

        //修改订单状态
        await this.model("orders")
          .where({ id: orders.id })
          .update({ status: 2 });
        //修改订单明细信息状态
        //await this.model("order_timetable").update({ status: 2 }).where({ orders_id: orders.orders_id });
        //释放车辆信息
        let carId = await this.model("order_timetable")
          .where({ orders_id: orders.id })
          .select();
        for (let index = 0; index < carId.length; index++) {
          const ss = carId[index];
          await this.model("timetable_detail")
            .where({ id: ss.timetable_id })
            .update({ is_available: 0 });
        }
        //发送站内信 通知订单已取消
        let detail =
          "您预约的考试时间为 " +
          element.order_time +
          "的订单未在15分钟内完成支付,已取消该订单";
        await this.model("user_in_mail").add({
          detail: detail,
          create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
          coach_id: orders.coach_id,
          is_find: 0,
          delete_flag: 0,
        });
      }
    }
    console.log("超时订单取消成功~~~~~~~~");
    return this.success();
  }

  async random(l) {
    var x = "ABCDEFGHLMPQRTUVWYZ";
    var tmp = "";
    for (var i = 0; i < l; i++) {
      tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
    }

    return tmp;
  }
};
