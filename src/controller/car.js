/**
 * 车辆管理
 */
const Base = require('./base.js');
//时间函数导入的包
var moment = require('moment');
//引入模型层
const Model = require("../model/car.js");
const XLSX = require("xlsx");

module.exports = class extends Base {
    indexAction() {
        return this.display();
    }
    //添加车辆信息
    async addCarAction() {
        console.info("调用car添加方法。。。。。。。。。");
        //获取前端传过来的车辆信息入参   
        let data = this.post();
        //查询是否存在相同的车牌和车号信息
        const exitCar = await this.model("car").where({ car_no: data.carNo, car_card: data.carCard, is_delete: 1 }).find();
        if (!think.isEmpty(exitCar)) {
            console.info(data.carNo + "和" + data.carCard + "车辆信息已存在");
            return this.fail(1, "车牌号" + data.carNo + "或车号" + data.carCard + "已经存在");
        }
        //如果不存在则进行添加信息
        var car = {
            car_no: data.carNo, //车号
            car_card: data.carCard,//车牌号
            car_type: data.type, //车类型 1：c1   2：c2
            create_by: "admin", //创建人  登录账号之后从session中取用户信息
            create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //创建时间
            car_number: data.carNumber, //车架号
            car_time: data.carTime  //车险时间
        }
        //执行添加
        await this.model("car").add(car);

        return this.success("添加成功");
    }


    //查询所有车辆信息 根据条件查询车辆数据
    async queryCarAction() {
        console.info("调用car查询方法。。。。。。。。。");
        let carNo = this.post("carNo"); //车号
        let carCard = this.post("carCard"); //车牌号

        let pageIndex = this.post("pageIndex");
        let pageSize = this.post("pageSize");

        const querycar = this.model("car");
        if (!think.isEmpty(carNo)) {
            querycar.where({ car_no: carNo });
        }
        if (!think.isEmpty(carCard)) {
            querycar.where({ car_card: carCard });
        }
        let data = await querycar.where({ is_delete: 1 }).page(pageIndex, pageSize).countSelect();
        return this.success(data);
    }


    //编辑车辆数据信息
    async updateCarAction() {
        console.info("调用car修改方法。。。。。。。。。");
        //获取前端传过来的车辆信息入参   
        let data = this.post();
        //判断当前车辆信息是否存在
        const msg = await this.model("car").where({ id: data.id, is_delete: 1 }).select();
        if (think.isEmpty(msg)) {
            return this.fail(1, "车辆数据信息有误，不存在的车联信息");
        }
        var car = {
            car_no: data.carNo, //车号
            car_card: data.carCard,//车牌号
            car_type: data.type, //车类型 1：c1   2：c2
            update_by: "admin", //修改人信息  登录账号之后从session中取用户信息
            update_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//修改时间
            car_number: data.carNumber, //车架号
            car_time: data.carTime  //车险时间
        }
        await this.model("car").where({ id: data.id }).update(car);

        return this.success(0, "修改成功");
    }

    //删除车辆信息
    async deleteCarAction() {
        console.info("调用car删除方法。。。。。。。。。");
        let id = this.post("id");
        if (think.isEmpty(id)) {
            return this.fail(1000, "数据信息不能为空");
        }
        //查询车辆信息是否存在
        const data = await this.model("car").where({ id: ['in', id], is_delete: 1 }).select();
        if (think.isEmpty(data) && data.length !== id.length) {
            return this.fail(1, "车辆数据信息有误，不存在的车辆信息");
        }
        //删除车辆信息
        await this.model("car").where({
            id: ["in", id]
        }).update({
            update_by: "admin", //修改人信息  登录账号之后从session中取用户信息
            update_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), //修改时间
            is_delete: 0
        });
        return this.success(0, "删除成功");
    }

    /**
     * 查询车辆行驶数据信息
     */
    async queryCardrivingInformationAction() {
        let data = this.post();
        //获取状态
        let carType = data.carType;
        //获取车号
        let carNo = data.carNo;
        //组装sql语句
        var query = this.model("car_driving").join("car b  ON car_driving.car_id=b.id ").join("v_car_orders c ON car_driving.car_id=c.car_id");
        //如果车号不为空
        if (!think.isEmpty(carNo)) {
            query.where({ "b.car_no": carNo });
        }
        if (!think.isEmpty(data.date)) {
            query.where({ "car_driving.date": data.date });
        }
        if (!think.isEmpty(carType)) {
            query.where({ "car_driving.is_overflow": carType });
        }
        //执行查询
        let msg = await query.field("car_driving.id,b.car_no,c.two,c.three,car_driving.car_driving_mileage,car_driving.date,car_driving.is_overflow,car_driving.overflow_mile").select();
        return this.success(msg);
    }
    /**
     * 发送站内信息
     */
    async sendStationAction() {
        let data = this.post();
        //获取行驶数据信息的id
        let msg = await this.model("car_driving").where({ id: data.id }).find();
        if (think.isEmpty(msg)) {
            return this.fail(1000, "未查询到该数据信息");
        }
        //组装发送信息到站内信息 向admin_in_mail 表中插入数据信息
        let carInfor = await this.model("car_driving ").join("car b ON car_driving.car_id=b.id").where({ "car_driving.id": data.id })
            .field("car_driving.*,b.car_type,b.car_no").find();

        //添加信息到站内信息表中
        await this.model("admin_in_mail").add({
            create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
            deatil: "车型:" + carInfor.car_type + "的" + carInfor.car_no + "于" + carInfor.date + "行驶里程超标标" + carInfor.overflow_mile + "km",
            is_find: 0
        });
        return this.success("发送成功");
    }

    /**
         * 导入车辆信息数据信息
         */
    async importExcelAction() {

        var startTime = new Date().getTime();

        var file = this.file("file");
        //获取session
        // var user = await this.session("home_user");
        // var batch_user = user.username;

        var data = [];
        var err = null;
        try {
            // Everything went fine
            var workbook = XLSX.readFile(file.path);　//整个　excel　文档
            var sheetNames = workbook.SheetNames; //获取所有工作薄名

            //console.log(sheetNames);

            //解析
            var sheet1 = workbook.Sheets[sheetNames[0]]; //根据工作薄名获取工作薄

            /*
             sheet1['!ref']　获取工作薄的有效范围　'A1:C20'
             XLSX.utils.decode_range 将有效范围转为　range对象
             range: {s: {r:0, c:0}, e: {r:10, 3}}
             */
            var range = XLSX.utils.decode_range(sheet1['!ref']);

            //循环获取单元格值
            for (var R = range.s.r; R <= range.e.r; ++R) {
                var row = [], flag = false;
                for (var C = range.s.c; C <= range.e.c; ++C) {
                    var row_value = null;
                    var cell_address = { c: C, r: R }; //获取单元格地址
                    var cell = XLSX.utils.encode_cell(cell_address); //根据单元格地址获取单元格
                    if (sheet1[cell]) //获取单元格值
                        row_value = sheet1[cell].v;
                    else
                        row_value = '';
                    row.push(row_value);
                }
                //判断整行是否都为空，是则去掉
                for (var i = 0; i < row.length; i++) {
                    if (row[i] != '') {
                        flag = true;
                        break;
                    }
                }
                if (flag) data.push(row);
            }
        } catch (e) {
            err = '解析出错' + e.toString();
        }
        //------------------------------等待调试-----------------------------------
        //数据存入car_driving表中
        for (let index = 2; index < data.length; index++) {
            const element = data[index];
            for (let j = 0; j < element.length; j++) {
                //做参数校验
                let carInfo = await this.model("car").where({ car_no: element[1] }).find();
                console.log(carInfo);
                //如果车辆信息没有找到，则不进行插入数据信息
                if (think.isEmpty(carInfo)) {
                    break;
                }
                console.log("时间----》" + moment(new Date()).format("YYYY-MM-DD"))
                //查询当天是否已经存在导入的数据 删除掉
                let carDriving = await this.model("car_driving").where({ car_id: carInfo.id, date: moment(new Date()).format("YYYY-MM-DD") }).find();
                console.log(carDriving);
                if (!think.isEmpty(carDriving)) {
                    await this.model("car_driving").where({ id: carDriving.id }).delete();
                }

                console.log(carInfo);
                //计算里程数据 
                let orderCar = await this.model("v_car_orders").where({ "car_id": carInfo.id }).find();
                if (think.isEmpty(orderCar)) {
                    break;
                }
                //定义里程数据变量
                let countMile = 0;
                if (!think.isEmpty(orderCar)) {
                    countMile = element[6] - (orderCar.two * 3 + orderCar.three * 3);
                }
                //执行添加数据信息
                await this.model("car_driving").add({
                    car_id: carInfo.id,
                    date: moment(new Date()).format("YYYY-MM-DD"),
                    car_driving_mileage: element[6],
                    create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
                    create_by: "admin",//从session中拿取用户信息
                    overflow_mile: countMile,//里程数据
                    is_overflow: countMile > 0 ? 2 : 1  //1 正常 2 超出
                });
                break;
            }
        }
        return this.success("导入成功")
    }

    /**
     * 根据车辆类型获取车辆信息
     */
    async getCarByTypeAction() {
        var type = this.post("type");

        var suject = this.post("suject");
        var queryCarByType = this.model("car").where({ is_delete: 1 });
        if (!think.isEmpty(type)) {
           
            queryCarByType.where({ car_type: type });
        }

        if(!think.isEmpty(suject)){
            if(suject == 1){
                queryCarByType.where({"car_no":["NOTLIKE","K3_%"] });
            }else{
                queryCarByType.where({"car_no":["NOTLIKE","K2_%"] });
            }
        }

        var data = await queryCarByType.select();
        return this.success(data);

    }


};