const Base = require('./base.js');
var moment = require('moment');
var wxutil = require("../utils/wxUtils");
let request = require('request');
const fs = require("fs");
const path = require("path");
var crypto = require('crypto');
var gettime = require('../util/convert');
/**
 * @author wangjie
 * @description 支付模块
 */
module.exports = class extends Base {



    indexAction() {
        return this.display();
    }

    /**
     * @description 主动请求支付，调用微信接口
     *   1. 小程序发起支付调用， 本接口请求微信服务 拿到返回结果 给到前端  前端唤起支付界面进行支付
     *   2. 支付成功之后，微信会给接收的接口发送成功信息 拿到成功信息更新订单支付状态
     */
    async getPaymentAction() {
        //获取微信用户openid();
        let openid = this.post("openid");
        if (think.isEmpty(openid)) {
            return this.fail(1000, "openid 参数缺失");
        }
        //获取订单号
        let orderId = this.post("orderId");
        if (think.isEmpty(orderId)) {
            return this.fail(1000, "orderId 订单不能为空");
        }
        //根据订单号查询订单数据获取订单金额
        let order = await this.model("orders").where({ id: orderId }).find();
        if (think.isEmpty(order)) {
            return this.fail(1000, "不存在的订单信息");
        }
        //商家订单号
        let out_trade_no = wxutil.guid();
        // 生成商户订单  https://mmantong.com/
        var orders = {
            "appid": "wxedecb11f0d2bd76e", //小程序id
            "mch_id": "1550213571",//商户号id
            "nonce_str": wxutil.randomChar(32),//随机字符串
            "body": "预约退款",//order.id, //商品描述
            "out_trade_no": out_trade_no, // 商户订单号
            "total_fee": order.collection * 100,//order.collection * 100, //订单定金金额
            "spbill_create_ip": "127.0.0.1",//调用微信支付api的机器IP地址
            "trade_type": "JSAPI",
            "notify_url": "https://mmantong.com/practice/pay/returnWeixin",  // 微信回调地址  https://mmantong.com/practice/pay/returnWeixin
            "openid": openid, //"oa7Ya43TUMTPk5MA_hJ5-OYZIPN4",  //付款人的openid
            "sign_type": "MD5"
        }
        console.log("生成订单参数组装:" + JSON.stringify(orders))
        //调用支付统一下单api() 微信后台
        let data = await wxutil.getOrder(orders);
        console.log("请求一下:" + JSON.stringify(data))
        //转化统一下单的返回参数
        //获取到返回值进行解析
        //微信返回预付订单信息 prepay_id
        //组合数据再次进行签名 返回给到前端   5个参数和sign
        //返回上述信息给到前端  支付调用结束
        var result = await wxutil.getPaysign(data);
        //判断result返回的code是否成功，成功则对payment表进行数据插入
        let msg = JSON.parse(JSON.stringify(data.xml));
        if (msg.return_code == "SUCCESS") {
            await this.model("payment").add({
                orders_id: order.id,//订单号
                out_trade_no: out_trade_no,//商户订单号
                amount: order.collection,    //订单金额 order.collection
                response: "",//返回响应
                create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建日期
                status: "", //状态
                openid: openid ,//用户id
                formid: msg.prepay_id
            });
            return this.success(result);
        } else {
            // //返回错误信息
            // await this.model("payment").add({
            //     orders_id: order.id,//订单号
            //     out_trade_no: out_trade_no,//商户订单号
            //     amount: order.collection,    //订单金额
            //     response: "",//返回响应
            //     create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建日期
            //     status: "" //状态
            // });
            return this.fail(1000, msg.return_msg);
        }


    }

    /**
     * 微信支付回调地址信息
     */
    async returnWeixinAction() {
        var data = this.post()
        console.info("----------->" + JSON.stringify(data));
        let msg = JSON.parse(JSON.stringify(data.xml));
        console.log("打印出"+msg)
        if (msg.result_code == "SUCCESS") {
            //通过商户订单号查询订单信息
            let orders = await this.model("payment").where({ out_trade_no: msg.out_trade_no[0] }).find();
            if (think.isEmpty(orders)) {
                return think.fail(1000, "订单有误");
            }
             //保留返回信息
             var returnmsg = {
                "return_code": "SUCCESS",
                "return_msg": "OK"
            }
            // 判断订单状态是否改变
            let exiteOrders= await this.model("orders").where({id: orders.orders_id}).find();
             // 查询订单是否已完成 
            if(exiteOrders.pay_type == 1 && exiteOrders.collection_type == 1) {
                return this.success(wxutil.getXml(returnmsg));
            };
            //更新订单信息
            await this.model("orders").where({ id: orders.orders_id }).update({ pay_type: 1, collection_type: 1 });
            // 更新支付表信息
            await this.model("payment").where({ id: orders.id }).update({
                status: JSON.parse(JSON.stringify(data.xml)).result_code[0],
                response: JSON.stringify(msg),
                transaction_id : JSON.parse(JSON.stringify(data.xml)).transaction_id[0]
            });
            //查询订单信息
            let ordersInfo = await this.model("orders").join("coach on orders.coach_id=coach.id").where({ "orders.id": orders.orders_id }).find();
            // 预约项目
            let project = ordersInfo.suject == 1 ? '科目二' : '科目三';
            // 查询预约的学生信息
            //ELECT st.`name`  FROM orders od LEFT JOIN order_timetable ot ON od.`id`=ot.`orders_id` LEFT JOIN student st ON ot.`students_id`=st.`student_id`
            //WHERE od.`id`=131 GROUP BY st.`name`
            let studentname = await this.model("orders").
                join("order_timetable ot ON orders.id=ot.orders_id").
                join("student st ON ot.students_id=st.student_id")
                .where({ "orders.id": orders.orders_id })
                .field("GROUP_CONCAT(DISTINCT st.name)AS name ,GROUP_CONCAT( DISTINCT(CASE WHEN st.`car_status` = 1 THEN 'C1' ELSE 'C2' END)) AS car_status ")
                .find();
            // 拼接名字
            let student = (studentname.name + "").replace(",", "/");
            // 备注
            let cartype = (studentname.car_status + "").replace(",", "/");
            //获取支付id
            let ssssss =orders.formid  ;// JSON.parse(JSON.parse(JSON.stringify(orders.response)));
            //微信服务通知
            //需要参数  发送模板消息需要用到accesstoken、formId 模板id 和openID 用户ID  
            //获取access_token
            var wxAppid = 'wxedecb11f0d2bd76e';
            var wxAppsecret = '8caf3694338c02b7a45f1109880845b2';
            const url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + wxAppid + "&secret=" + wxAppsecret;
            var result = await think.fetch(url, { method: 'GET' }).then(res => res.json());
            console.log("------>" + JSON.stringify(result));
            var returndata = {
                touser: orders.openid,//openid,//openId 用户的id    
                template_id: 'Jqxyse3tfFuLNaql3dueo7CoZUQ1mO_ID6DKEQp8okw',//'04H5kvgUzBJczi2S1psHZmmzaPMprgNnYwqJh7ikAz8',//模板消息id，  
                page: 'pages/entrance/tabOrder/index',//点击详情时跳转的主页
                form_id: ssssss.prepay_id,//formid,//formID
                miniprogram_state: "formal", //跳转小程序类型：developer为开发版；trial为体验版；formal为正式版；默认为正式版
                data: {//下面的keyword*是设置的模板消息的关键词变量  
                    //预约状态  20个以内字符  可汉字、数字、字母或符号组合
                    "phrase4": {
                        "value": "预约成功",
                        "color": "#4a4a4a"
                    },
                    //  预约项目                  订单编号 字符串	32位以内数字、字母或符号	可数字、字母或符号组合
                    "thing3": {
                        "value": project,
                        "color": "#9b9b9b"
                    },
                    //预约人   20个以内字符  可汉字、数字、字母或符号组合
                    "thing9": {
                        "value": student,
                        "color": "red"
                    },
                    //预约时间段    24小时制时间格式（支持+年月日），支持填时间段，两个时间点之间用“~”符号连接     例如：15:01，或：2019年10月1日 15:01
                    "character_string10": {
                        "value": ordersInfo.order_time,
                        "color": "red"
                    },
                    //   备注                预约费用  1个币种符号+10位以内纯数字，可带小数，结尾可带“元” 可带小数
                    "thing7": {
                        "value": cartype,
                        "color": "red"
                    }
                }
                //,
                //emphasis_keyword: 'thing9.DATA'//需要着重显示的关键词  
            };
            var tt = await think.fetch("https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=" + result.access_token, { method: 'POST', body: JSON.stringify(returndata) }).then(res => res.text());
            console.log("打印服务通知发送结果" + tt);
            // 更新支付信息
      
            return this.success(wxutil.getXml(returnmsg));
        } else {
            var returnmsg = {
                "return_code": "FAIL",
                "return_msg": "异常错误"
            };
            // 更新支付信息
            return this.success(wxutil.getXml(returnmsg));
        }
    }


    /**
     * 微信申请退款操作
     */
    async refundAmountAction() {
        //获取微信用户openid();
        let openid = this.post("openid");
        if (think.isEmpty(openid)) {
            return this.fail(1000, "openid 参数缺失");
        }
        //获取订单号
        let orderId = this.post("orderId");
        if (think.isEmpty(orderId)) {
            return this.fail(1000, "orderId 订单不能为空");
        }
        //根据订单号查询订单数据获取订单金额
        let order = await this.model("orders").where({ id: orderId }).find();
        if (think.isEmpty(order)) {
            return this.fail(1000, "不存在的订单信息");
        }
        if (order.pay_type == 2) {
            return this.fail(1000, "该订单还未进行付款操作");
        } else if (order.pay_type == 3) {
            return this.fail(1000, "该订单已退款");
        }
        //根据订单号去查询支付订单里面的商户号ID  
        let out_trade_no = await this.model("payment").where({ orders_id: orderId }).find();
        if (think.isEmpty(out_trade_no)) {
            return this.fail(1000, "未找到该订单支付信息");
        }
        //查询订单明细数据信息
        let ordersDetail = await this.model("order_timetable").where({ orders_id: order.id }).select();
        for (let index = 0; index < ordersDetail.length; index++) {
            const element = ordersDetail[index];
            //退款操作 1 付款时间在24小时以内   练车前1个小时   timetable_detail  timetable_id=   AND timecode
            let timecode = await this.model("timetable_detail").where({ id: element.timetable_id, timecode: element.time_code }).find();
            var day = moment(out_trade_no.create_time).add(1, "day").unix();
            var time = moment(new Date()).unix();
            if (day < time) {
                return this.fail(1000, "支付时间已超过24小时，暂不支持退款操作");
            }
            //取出时间code时间比较  日期+时间段
            var hour = moment(order.order_time + this.convertutil(timecode.time_code)).add(1, "hours").unix();
            var nowTime = moment(new Date()).unix();
            if (hour < nowTime) {
                return this.fail(1000, "练车前1小时暂不支持退款操作");
            }
        }


        //商家退款订单号
        let out_return_trade_no = wxutil.guid();
        //组装退款参数信息
        var refund_orders = {
            "appid": "wxedecb11f0d2bd76e", //小程序id
            "mch_id": "1550213571",//商户号id
            "nonce_str": wxutil.randomChar(32),//随机字符串
            "out_trade_no": out_trade_no.out_trade_no, // 商户订单号
            "total_fee": order.collection * 100,//order.collection * 100, //订单定金金额
            "out_refund_no": out_return_trade_no,
            "refund_fee": order.collection * 100 // 退款金额  order.collection * 100
         //   "notify_url": "https://msc.trackin.me/practice/pay/returnRefund" // 退款回调地址   https://mmantong.com/practice/pay/returnRefund
        }
        console.log("生成订单参数组装:" + JSON.stringify(refund_orders))
        //调用支付统一下单api() 微信后台
        let data = await wxutil.refundOrder(refund_orders);
        console.log("------------->" + JSON.stringify(data))
        // //获取返回参数信息
        // let result = JSON.parse(JSON.stringify(data)).xml;
        // //表示退款成功 ，更新主表信息
        // ////判断result返回的code是否成功，成功则对payment表进行数据插入
        var refund = null;
        let remoteCall = () => {
            let deferred = think.defer();
            request({
                url: "https://api.mch.weixin.qq.com/secapi/pay/refund",
                agentOptions: {
                    pfx: fs.readFileSync(path.resolve(process.cwd(), "././src/wx_api/apiclient_cert.p12")),
                    //"D:/Progame Files/vscode/vscode-workspace/practice-car/src/wx_api/apiclient_cert.p12"),
                    passphrase: "1550213571"
                },
                method: 'POST',
                body: data
            }, function (err, data) {
                let rusult = wxutil.parserXml(JSON.parse(JSON.stringify(data)).body);
                let xml = JSON.parse(JSON.stringify(rusult)).xml;
                refund = {
                    "xml": xml,
                    "out_return_trade_no": out_return_trade_no,
                    "out_trade_no": out_trade_no.out_trade_no
                }
                deferred.resolve(refund);
            });
            return deferred.promise;
        }
        //拿到调用的返回值进行数据取值
        let result = await remoteCall();
        console.log("路径---》" + path.resolve(process.cwd(), "././src/wx_api/apiclient_cert.p12"))
        console.log(result);
        if (result.xml.result_code == "SUCCESS") {
            await this.model("orders").where({ id: out_trade_no.orders_id }).update({ pay_type: 3 });
            //添加退款记录信息
            await this.model("refund").add({
                out_trade_no: out_trade_no.out_trade_no,//商户订单号
                amount: out_trade_no.amount,//退款金额
                response: JSON.stringify(result),//返回响应
                create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建时间
                status: result.xml.return_code,//返回状态信息
                order_timetable_id: out_trade_no.orders_id ,//订单id
                out_refund_no: result.xml.refund_id // 微信退款单号 
            });
            return this.success(result.xml.return_msg);
        } else {
            // //添加退款记录信息
            // await this.model("refund").add({
            //     out_trade_no: out_trade_no.out_trade_no,//商户订单号
            //     amount: out_trade_no.amount,//退款金额
            //     response: JSON.stringify(data),//返回响应
            //     create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建时间
            //     status: result.xml.return_code,//返回状态信息
            //     order_timetable_id: out_trade_no.orders_id //订单id
            // });
            return this.fail(1000, result.xml.err_code_des);
        }
    }

    /**
     * 微信退款回调
     */
    async returnRefundAction(){
        var data = this.post()
        console.info("----------->" + JSON.stringify(data));

        let msg = JSON.parse(JSON.stringify(data.xml));

        console.log("打印出" + msg);

        // 错误返回状态码
        var returnErrormsg = {
            "return_code": "FAIL",
            "return_msg": "异常错误"
        };

        // 成功时进入
        if (msg.return_code == "SUCCESS") {
            //通过商户订单号查询订单信息
            let orders = await this.model("refund").where({ out_trade_no: msg.out_trade_no[0] }).find();

            // 未找到该订单
            if (think.isEmpty(orders)) {
                return this.success(wxutil.getXml(returnErrormsg));
            }

             //保留返回信息
             var returnmsg = {
                "return_code": "SUCCESS",
                "return_msg": "OK"
            }

            // 判断订单状态是否改变
            let exiteOrders= await this.model("orders").where({id: orders.order_timetable_id}).find();
             // 查询订单是否已完成 
            if(exiteOrders.pay_type == 3) {
                return this.success(wxutil.getXml(returnmsg));
            };

            //更新订单信息
            await this.model("orders").where({ id: orders.order_timetable_id }).update({ pay_type: 3 });

            // 更新支付表信息
            await this.model("refund").where({ id: orders.id }).update({
                status: msg.result_code[0],
                response: JSON.stringify(data),
                out_refund_no : msg.transaction_id[0]
            });
            return this.success(wxutil.getXml(returnmsg));
        }else {
            // 退款操作失败
            return this.fail(wxutil.getXml(returnErrormsg));
        }    
    }

    /**
        * 返点操作
        */
    async returnAmountAction() {
        //获取微信用户openid();
        let openid = this.post("openid");
        if (think.isEmpty(openid)) {
            return this.fail(1000, "openid 参数缺失");
        }
        //获取订单号
        let orderId = this.post("orderId");
        if (think.isEmpty(orderId)) {
            return this.fail(1000, "orderId 订单不能为空");
        }
        //根据订单号查询订单数据获取订单金额
        let order = await this.model("orders").where({ id: orderId }).find();
        if (think.isEmpty(order)) {
            return this.fail(1000, "不存在的订单信息");
        }
        if (order.pay_type == 2) {
            return this.fail(1000, "该订单还未进行付款操作");
        } else if (order.pay_type == 3) {
            return this.fail(1000, "该订单已退款");
        }
        //根据订单号去查询支付订单里面的商户号ID  
        let out_trade_no = await this.model("payment").where({ orders_id: orderId }).find();
        if (think.isEmpty(out_trade_no)) {
            return this.fail(1000, "未找到该订单支付信息");
        }
        //商家退款订单号
        let out_return_trade_no = wxutil.guid();
        //组装退款参数信息
        var refund_orders = {
            "appid": "wxedecb11f0d2bd76e", //小程序id
            "mch_id": "1550213571",//商户号id
            "nonce_str": wxutil.randomChar(32),//随机字符串
            "out_trade_no": out_trade_no.out_trade_no, // 商户订单号
            "total_fee": order.collection * 100,//order.collection * 100, //订单定金金额
            "out_refund_no": out_return_trade_no, //退款订单号
            "refund_fee": order.order_rebates * 100   //退款金额
        }
        console.log("生成订单参数组装:" + JSON.stringify(refund_orders))
        //调用支付统一下单api() 微信后台
        let data = await wxutil.refundOrder(refund_orders);
        console.log("------------->" + JSON.stringify(data))
        // //获取返回参数信息
        // let result = JSON.parse(JSON.stringify(data)).xml;
        // //表示退款成功 ，更新主表信息
        // ////判断result返回的code是否成功，成功则对payment表进行数据插入
        var refund = null;
        let remoteCall = () => {
            let deferred = think.defer();
            request({
                url: "https://api.mch.weixin.qq.com/secapi/pay/refund",
                agentOptions: {
                    pfx: fs.readFileSync("D:/Progame Files/vscode/vscode-workspace/practice-car/src/wx_api/apiclient_cert.p12"),
                    passphrase: "1550213571"
                },
                method: 'POST',
                body: data
            }, function (err, data) {
                let rusult = wxutil.parserXml(JSON.parse(JSON.stringify(data)).body);
                let xml = JSON.parse(JSON.stringify(rusult)).xml;
                refund = {
                    "xml": xml,
                    "out_return_trade_no": out_return_trade_no,
                    "out_trade_no": out_trade_no.out_trade_no
                }
                deferred.resolve(refund);
            });
            return deferred.promise;
        }
        //拿到调用的返回值进行数据取值
        let result = await remoteCall();
        console.log(result);
        if (result.xml.return_code == "SUCCESS") {
            await this.model("orders").where({ id: out_trade_no.orders_id }).update({ pay_type: 3 });
            //添加退款记录信息
            await this.model("refund").add({
                out_trade_no: out_trade_no.out_trade_no,//商户订单号
                amount: out_trade_no.amount,//退款金额
                response: JSON.stringify(data),//返回响应
                create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建时间
                status: result.xml.return_code,//返回状态信息
                order_timetable_id: out_trade_no.orders_id //订单id
            });
            return 0;
        } else {
            //添加退款记录信息
            await this.model("refund").add({
                out_trade_no: out_trade_no.out_trade_no,//商户订单号
                amount: out_trade_no.amount,//退款金额
                response: JSON.stringify(data),//返回响应
                create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建时间
                status: result.xml.return_code,//返回状态信息
                order_timetable_id: out_trade_no.orders_id //订单id
            });
            return 1;
        }
    }




    async demoAction(refund) {
        let xml = JSON.parse(refund);
        console.log("------->" + xml);
        if (xml.return_code == "SUCCESS") {
            await this.model("orders").where({ id: out_trade_no.orders_id }).update({ pay_type: 3 });
            //添加退款记录信息
            await this.model("refund").add({
                out_trade_no: out_trade_no.out_trade_no,//商户订单号
                amount: out_trade_no.amount,//退款金额
                response: JSON.stringify(data),//返回响应
                create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建时间
                status: result.return_code,//返回状态信息
                order_timetable_id: out_trade_no.orders_id,//订单id
                out_refund_no: out_return_trade_no //退款订单号
            });
            return this.success();
        } else {

            //添加退款记录信息
            await this.model("refund").add({
                out_trade_no: out_trade_no.out_trade_no,//商户订单号
                amount: out_trade_no.amount,//退款金额
                response: JSON.stringify(data),//返回响应
                create_time: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),//创建时间
                status: result.return_code,//返回状态信息
                order_timetable_id: out_trade_no.orders_id, //订单id
                out_refund_no: out_return_trade_no
            });
            return this.fail();
        }

    }




    /**
     * 
     *  订单编号  
     * 订单时间
     * 学员信息
     *  下单时间
     * 订单状态 
     * openid,formid
     * 消息推送接口
     */
    async sendMsgAction() {
        //需要参数  发送模板消息需要用到accesstoken、formId 模板id 和openID 用户ID  
        //获取access_token
        var wxAppid = 'wxedecb11f0d2bd76e';
        var wxAppsecret = '8caf3694338c02b7a45f1109880845b2';
        const url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + wxAppid + "&secret=" + wxAppsecret;
        var result = await think.fetch(url, { method: 'GET' }).then(res => res.json());
        console.log("------>" + JSON.stringify(result));
        var data = {
            touser: this.post("openid"),//openid,//openId 用户的id    
            template_id: '04H5kvgUzBJczi2S1psHZmmzaPMprgNnYwqJh7ikAz8',//模板消息id，  
            page: 'pages/entrance/tabHome/index',//点击详情时跳转的主页
            form_id: this.post("formid"),//formid,//formID
            data: {//下面的keyword*是设置的模板消息的关键词变量  
                //预约状态  20个以内字符  可汉字、数字、字母或符号组合
                "thing13": {
                    "value": "预约成功",
                    "color": "#4a4a4a"
                },
                //订单编号 字符串	32位以内数字、字母或符号	可数字、字母或符号组合
                "character_string6": {
                    "value": "20206215431152",
                    "color": "#9b9b9b"
                },
                //预约人   20个以内字符  可汉字、数字、字母或符号组合
                "thing7": {
                    "value": "wangjie",
                    "color": "red"
                },
                //预约时段    24小时制时间格式（支持+年月日），支持填时间段，两个时间点之间用“~”符号连接     例如：15:01，或：2019年10月1日 15:01
                "time8": {
                    "value": "2019-10-1 15:30-16:30",
                    "color": "red"
                },
                //预约费用  1个币种符号+10位以内纯数字，可带小数，结尾可带“元” 可带小数
                "amount10": {
                    "value": "0.02元",
                    "color": "red"
                }
            }
            //,
            //emphasis_keyword: 'thing9.DATA'//需要着重显示的关键词  
        };
        var msg = await think.fetch("https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=" + result.access_token, { method: 'POST', body: JSON.stringify(data) }).then(res => res.text());
        return this.success(msg);
    }


    /**
     * 接受微信的消息
     */
    async getWeixinMessageAction() {
        //打印微信发送的请求信息
        //获取接受参数  微信加密签名，signature结合了开发者填写的token参数和请求中的timestamp参数、nonce参数
        let signature = this.get("signature");
        //时间戳
        let timestamp = this.get("timestamp");
        //随机数
        let nonce = this.get("nonce");
        //随机字符串
        let echostr = this.get("echostr");
        //与服务器上填写的保持一致
        const token = "demo";
        let array = [token, timestamp, nonce].sort().join('');
        var md5 = crypto.createHash('sha1');
        var result = md5.update(array).digest('hex');
        console.log("signature---->" + signature);
        console.log("result---->" + result);
        if (result == signature) {
            return this.ctx.body = echostr;
        } else {
            return false;
        }

    }




    async queryOrdersAction() {

        let studentname = await this.model("orders").
            join("order_timetable ot ON orders.id=ot.orders_id").
            join("student st ON ot.students_id=st.student_id")
            .where({ "orders.id": 131 })
            .field("GROUP_CONCAT(DISTINCT st.name)AS name ,GROUP_CONCAT( DISTINCT(CASE WHEN st.`car_status` = 1 THEN 'C1' ELSE 'C2' END)) AS car_status ")
            .find();
        // 拼接名字
        let student = (studentname.name + "").replace(",", "/");
        // 备注
        let cartype = (studentname.car_status + "").replace(",", "/");

        return this.success(student + "===========>" + cartype)

    }




    getCode(params, key) {
        console.log("--------------->" + params)
        console.log("--------------->" + key)
        for (let k in params) {
            console.log(k + "--------------->" + key)
            if (k === key) {
                return params[k];
            }
        }
    }


    convertutil(code) {
        var data = "";
        var timecode;
        if (code < 29) {
            timecode = gettime.twoTimeCode;
        } else {
            timecode = gettime.threeTimeCode;
        }
        for (let index = 0; index < timecode.length; index++) {
            const element = timecode[index];
            if (element.code == code) {
                data = element.startTime;
                return data;

            }
        }
        return data;
    }

}