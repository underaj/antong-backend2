/**
 * @author wangjie
 * @description 数据统计
 */
const Base = require('./base.js');
var moment = require('moment');
module.exports = class extends Base {

    /**
     * 数据统计页面查询
     */
    async dataShowAction() {
        //查询订单详情信息
        let data = await this.model(" orders a").field(
            "COUNT(1) AS countSize , SUM(CASE WHEN a.order_type =1 THEN 1 ELSE 0 END) appletNum, "
            +
            "SUM(CASE WHEN a.order_type =2 THEN 1 ELSE 0 END) systemNum,"
            +
            "SUM(CASE WHEN a.order_type =3 THEN 1 ELSE 0 END) welfareNum,"
            +
            "(SELECT CASE WHEN SUM(IFNULL(b.is_print,0)) IS NULL THEN 0 ELSE SUM(IFNULL(b.is_print,0)) END AS countNum  FROM order_timetable b   WHERE  a.id=b.orders_id AND a.status=1 AND b.is_print=1)AS  fill,"
            +
            "SUM(CASE WHEN a.pay_type =3 THEN 1 ELSE 0 END)  cancelNum"
        )//.where({"a.status":1})
            .find();
        //求总收入信息
        let countMoney = await this.model("orders a ")
            .field(
                "CASE WHEN SUM(IFNULL(a.total_collection,0)) IS NULL THEN 0 ELSE SUM(IFNULL(a.total_collection,0)) END  num01," //总收入
                +
                "CASE WHEN  SUM(IFNULL(a.order_rebates,0))IS NULL THEN 0 ELSE  SUM(IFNULL(a.order_rebates,0)) END  AS num02," //总返点
                +
                "CASE WHEN  (SUM(IFNULL(a.total_collection,0))-SUM(IFNULL(a.order_rebates,0))) IS NULL THEN 0 ELSE  (SUM(IFNULL(a.total_collection,0))-SUM(IFNULL(a.order_rebates,0))) END  AS num03"  //净收入
            )
            //净收入= 总收入-总返点
            /**
             * WHERE a.pay_type=1   1 已支付
                AND a.is_return=1    1 已返点
                AND a.status=0      1 未取消
             */
            .where({ "a.pay_type": 1, "a.status": 1 }).find();
        data.countMoney = countMoney;
        return this.success(data)

    }

    /**
     * 1.展示当天各科目应收、各科目已收款项
     * 2.能展示当天各科目收入、当天总收入；当月各科目收入、当月总收入
     *  各科应收款项 :   
     *    已收款: 平台下单支付的金额  平台 科二、科三每单都是80
     *    实收款项: 科目二:  平台每下一单的金额 + 100    ====》  80 + 100
     *             科目三:  平台每下一单的金额 + 200    ====》  80 + 200

     *   1.当天收款计算
     *         实收:  1.当前时间段   已预约   + 打单状态的
     *         应收:  1.当前时间段 + 状态  已预约
     *   2. 当天之前的收款计算
     *        1. 实收   订单状态为打单状态的数据
     *        2. 应收   当前有效订单数量    ===》  未取消的订单
     *   3. 当天之后的收款计算
     *        1. 实收   只查询订单状态为未取消的订单数据
     * 
     *  当月收款计算
     */


    /**
    * 按天查询应收 实收款项
    * 
    */
    async getOrdersByDayAction() {
        // 获取时间
        let selectDate = moment(this.post("selectDate")).format("YYYY-MM-DD");
        //  计算当天时间的收入信息
        let dataDay = await this.model("v_sum_orders_amount")
            .field("1 AS type,IFNULL(count(1),0) AS actule,IFNULL(SUM(CASE WHEN print = 0 THEN 1 ELSE 0 END),0) AS noprint,IFNULL(COUNT(1), 0) AS receivable, 100 AS payment")
            .where({ "order_time": selectDate, "suject": 1 })
            .union("SELECT 2 AS type,IFNULL(count(1),0) AS actule,IFNULL(SUM(CASE WHEN print = 0 THEN 1 ELSE 0 END),0) AS noprint,IFNULL(COUNT(1), 0) AS receivable,200 AS payment FROM v_sum_orders_amount WHERE order_time = '" + selectDate + "' AND suject = 2 ")
            .select();
            // 查询返点操作
            //SELECT IFNULL(SUM(order_rebates),0) AS order_rebates  FROM orders  WHERE order_time = '2020-07-31'  AND pay_type =3 AND is_return=1 AND suject =2 AND STATUS =1  AND collection_type =3  
            let returnAmount = this.model("orders").where({"pay_type" : 3,"is_return":1,"STATUS":1,"collection_type" : 2});

        // 计算当天的实收 和应收
        var dayAmount = [];
        for (let index = 0; index < dataDay.length; index++) {
            const element = dataDay[index];
            if (element.type == 1) {
                 let suject1= await this.model("orders").where({"order_time" :selectDate,"suject": element.type,"pay_type" : 3,"is_return":1,"STATUS":1,"collection_type" : 2}).field("IFNULL(SUM(order_rebates),0) AS order_rebates ").find();
                dayAmount.push({
                    "type": element.type,
                    "actule": element.noprint  * 80  +(element.receivable - element.noprint) * (80 + element.payment), // 科目二实际收款  打单数量 + 加上 未打单数量 
                    "receivable": (element.receivable * 80) + (element.receivable * element.payment),  // 科目三的应收款 
                    "order_rebates": suject1.order_rebates
                })
            } else {
                let suject2= await this.model("orders").where({"order_time" :selectDate,"suject": element.type,"pay_type" : 3,"is_return":1,"STATUS":1,"collection_type" : 2}).field("IFNULL(SUM(order_rebates),0) AS order_rebates ").find();
                dayAmount.push({
                    "type": element.type,
                    "actule": element.noprint  * 80  +(element.receivable - element.noprint) * (80 + element.payment),// 科目三实际收款
                    "receivable":  (element.actule * ( 80 + element.payment)) ,     // 科目三的应收款 
                    "order_rebates": suject2.order_rebates
                })
            }
        }
        return this.success(dayAmount);
    }
    /**
     * 按月查询应收 实收款项
     */
    async getOrdersByMonthAction() {
        // 获取时间
        let selectDate = moment(this.post("selectDate")).format("YYYY-MM-DD");
        // 获取系统当前月份第一天
        let firstDay = moment(selectDate).startOf('month').format("YYYY-MM-DD");
        // 获取系统当前月份最后一天
        let endDay = moment(selectDate).endOf('month').format("YYYY-MM-DD");
        var monthAmount = [];
        // 计算当月的实收和 应收
        let dataMonth = await this.model("v_sum_orders_amount")
            .field("1 AS type,IFNULL(count(1),0) AS actule,IFNULL(SUM(CASE WHEN print = 0 THEN 1 ELSE 0 END),0) AS noprint,IFNULL(COUNT(1), 0) AS receivable, 100 AS payment")
            .where({ "order_time": { ">=": firstDay, "<=": endDay }, "suject": 1 })
            .union("SELECT 2 AS type,IFNULL(count(1),0) AS actule,IFNULL(SUM(CASE WHEN print = 0 THEN 1 ELSE 0 END),0) AS noprint,IFNULL(COUNT(1), 0) AS receivable,200 AS payment FROM v_sum_orders_amount WHERE order_time >= '" + firstDay + "' and  order_time <= '" + endDay + "'  AND suject = 2 ")
            .select();
        for (let index = 0; index < dataMonth.length; index++) {
            const element = dataMonth[index];
            if (element.type == 1) {
                let suject1= await this.model("orders").where({"order_time" :{">=":firstDay,"<=": endDay  },"suject": element.type,"pay_type" : 3,"is_return":1,"STATUS":1,"collection_type" : 2}).field("IFNULL(SUM(order_rebates),0) AS order_rebates ").find();
                monthAmount.push({
                    "type": element.type,
                    "actule": (element.actule * 80) + (element.actule * element.payment)  + element.noprint  * 80, // 科目二实际收款
                    "receivable": (element.receivable * 80) + (element.receivable * element.payment),  // 科目三的应收款 
                    "order_rebates": suject1.order_rebates
                })
            } else {
                let suject2= await this.model("orders").where({"order_time" :{">=":firstDay,"<=": endDay  },"suject": element.type,"pay_type" : 3,"is_return":1,"STATUS":1,"collection_type" : 2}).field("IFNULL(SUM(order_rebates),0) AS order_rebates ").find();
                monthAmount.push({
                    "type": element.type,
                    "actule": (element.actule * 80) + (element.actule * element.payment)  + element.noprint  * 80,// 科目三实际收款
                    "receivable": (element.receivable * 80) + (element.receivable * element.payment),// 科目三的应收款 
                    "order_rebates": suject2.order_rebates
                })
            }
        }
        return this.success(monthAmount);
    }






}


     