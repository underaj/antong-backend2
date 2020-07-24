/**
 * @author wangjie
 * @description 数据统计
 */
const Base = require('./base.js');
module.exports = class extends Base {

    /**
     * 数据统计页面查询
     */
    async dataShowAction(){
            //查询订单详情信息
          let data= await this.model(" orders a").field(
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
            let countMoney=await this.model("orders a ")
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
            .where({"a.pay_type":1,"a.status":1}).find();
            data.countMoney=countMoney;
             return this.success(data)   

    }



}