const Base = require('./base.js');
const XLSX = require("xlsx");
//时间函数导入的包
var moment = require('moment');
module.exports = class extends Base {

    // /**
    //  * 导入车辆信息数据信息
    //  */
    // async importExcelAction() {

    //     var startTime = new Date().getTime();

    //     var file = this.file("file");
    //     //获取session
    //    // var user = await this.session("home_user");
    //    // var batch_user = user.username;

    //     var data = [];
    //     var err = null;
    //     try {
    //         // Everything went fine
    //         var workbook = XLSX.readFile(file.path);　//整个　excel　文档
    //         var sheetNames = workbook.SheetNames; //获取所有工作薄名

    //         //console.log(sheetNames);

    //         //解析
    //         var sheet1 = workbook.Sheets[sheetNames[0]]; //根据工作薄名获取工作薄

    //         /*
    //          sheet1['!ref']　获取工作薄的有效范围　'A1:C20'
    //          XLSX.utils.decode_range 将有效范围转为　range对象
    //          range: {s: {r:0, c:0}, e: {r:10, 3}}
    //          */
    //         var range = XLSX.utils.decode_range(sheet1['!ref']);

    //         //循环获取单元格值
    //         for (var R = range.s.r; R <= range.e.r; ++R) {
    //             var row = [], flag = false;
    //             for (var C = range.s.c; C <= range.e.c; ++C) {
    //                 var row_value = null;
    //                 var cell_address = { c: C, r: R }; //获取单元格地址
    //                 var cell = XLSX.utils.encode_cell(cell_address); //根据单元格地址获取单元格
    //                 if (sheet1[cell]) //获取单元格值
    //                     row_value = sheet1[cell].v;
    //                 else
    //                     row_value = '';
    //                 row.push(row_value);
    //             }
    //             //判断整行是否都为空，是则去掉
    //             for (var i = 0; i < row.length; i++) {
    //                 if (row[i] != '') {
    //                     flag = true;
    //                     break;
    //                 }
    //             }
    //             if (flag) data.push(row);
    //         }
    //     } catch (e) {
    //         err = '解析出错' + e.toString();
    //     }
    //     console.log(JSON.stringify(data));
    //     //------------------------------等待调试-----------------------------------
    //     //数据存入car_driving表中
    //     for (let index = 0; index < array.length; index++) {
    //         const element = array[index];

    //         //做参数校验
    //         let carInfo = await this.module("car").where({ car_no: element[index].car_no }).find();
    //         //如果车辆信息没有找到，则不进行插入数据信息
    //         if (think.isEmpty(carInfo)) {
    //             continue
    //         }
    //         //计算里程数据 
    //         let orderCar=await this.module("v_car_orders").where({car_id:carInfo.car_id}).find();
    //         //定义里程数据变量
    //         let countMile=0;
    //         if(!think.isEmpty(orderCar)){
    //             countMile=element.mili -(orderCar.two * 3 + orderCar.three *3);
    //         }
    //         var car_Driving = {
    //             car_id: carInfo.car_no,
    //             date: element.date,
    //             car_driving_mileage: element.mili,
    //             create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
    //             create_by: "admin" ,//从session中拿取用户信息
    //             overflow_mile:countMile,//里程数据
    //             is_overflow:countMile >0?2:1  //1 正常 2 超出
    //         }
    //         //执行添加数据信息
    //         await this.module("car_driving").add(car_Driving);
    //     }

    //     return this.success("导入成功")
    // }


}