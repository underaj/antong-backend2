/**
 * @author wangjie
 * @description 派车预览
 */
const Base = require('./base.js');

module.exports = class extends Base {

    /**
     * 查看派车预览
     */
    async querySendCarAction(){
         let date=this.post("date");
         //科目类型 1 科目二  2科目三
         let type=this.post("type");
        //首先查询出订单表中的时间字段
       let data=  await this.model("orders").join(" order_timetable b ON orders.id=b.orders_id ")
       .join(" car ON b.car_id=car.id ")
         .where({"orders.order_time":date,"orders.suject":type,"orders.status":1,"car.is_delete":1}).field("DISTINCT b.car_id,car.car_no ").select();
        if(think.isEmpty(data)){
            return this.success();
        }
        console.log(data.length)
        var info=[];
        //拿到时间code进行数据拼接
         for (let index = 0; index < data.length; index++) {
             const element = data[index];
             //拿到时间code 循环查询组装 [code：1 data:{1,2,3}]
             let sms=await this.model("v_sho")
             .where({"car_id":element.car_id,"order_time":date,"sbject":type,"ordertype":2,"statusd":1}).field("name,time_code,name AS coachName")
             .union("SELECT name,time_code,v_sho.coachName AS coachName  from v_sho where car_id ="+element.car_id +" and order_time='"+date+"' and sbject='"+type +"' and ordertype=1 and statusd =1  and typed= 1")
            .union("SELECT name,time_code,v_sho.coachName AS coachName  from v_sho where car_id ="+element.car_id +" and order_time='"+date+"' and sbject='"+type +"' and ordertype=3 and statusd =1  and order_check= 1")

            .select();
            var mag={
                code:element.car_no,
                student:sms
            }
             info.push(mag);
         }
         return this.success(info);
    }


      



}