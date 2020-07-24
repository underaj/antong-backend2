
var j2xParser = require("fast-xml-parser").j2xParser;
var parser = require('fast-xml-parser');
const uuidv1 = require('uuid/v1');
const moment = require("moment");
var crypto = require('crypto');



const fs = require("fs");



/**
 * 排序 签名(md5加密) 
 * @param {*} array
 * @returns
 */
function sortString(array) {
    // array 是对象
    var keys = Object.keys(array).sort();

    var str = "";
    keys.forEach(e => {
        str += e + "=" + array[e] + "&"
    });

    str += "key=" + think.config("mchKey");

    console.log(str)

    var md5 = crypto.createHash('md5');

    var result = md5.update(str).digest('hex').toUpperCase();

    return result;
}


/**
 * 随机字符串
 * @param {*} l
 * @returns
 */
function randomChar(l) {
    var x = "0123456789QWERTYUIOPLKJHGFDSAZXCVBNM";
    var tmp = "";
    for (var i = 0; i < l; i++) {
        tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
    }
    return tmp;
}

function randomNumber(l) {
    var x = "0123456789";
    var tmp = "";
    for (var i = 0; i < l; i++) {
        tmp += x.charAt(Math.ceil(Math.random() * 100000000) % x.length);
    }
    return tmp;
}

/**
 * 唯一订单id
 * @param {*} obj
 * @returns
 */
function guid() {
    var guid = replaceAll(uuidv1(), '-');
    return guid;
}

/**
 * 统一下单
 * @param {*} obj
 * @returns
 */
function getXml(obj) {
    var parser = new j2xParser();
    var xml = parser.parse(obj);
    return "<xml>" + xml + "</xml>";
}


/**
 * 统一下单
 * @param {*} obj
 * @returns
 */
async function order(obj) {
    var data = await think.fetch("https://api.mch.weixin.qq.com/pay/unifiedorder", { method: 'post', body: obj }).then(res => res.text());
    return data;
}


/**
 * 退款操作
 * @param {*} obj
 * @returns
 */
async function rufund_order(obj) {


    console.log(fs.readFileSync("D:/Progame Files/vscode/vscode-workspace/practice-car/src/wx_api/apiclient_cert.p12"));
    var data = await think.fetch("https://api.mch.weixin.qq.com/secapi/pay/refund", {
        method: 'post', 
        body: obj,
        agent
        :""
    }).then(res => res.text());

    console.log(data)
    return data;
}








/**
 * replaceAll 方法
 * @param {*} str
 * @param {*} replaceKey
 * @param {*} replaceVal
 * @returns
 */
function replaceAll(str, replaceKey, replaceVal) {
    var reg = new RegExp(replaceKey, 'g');//g就是代表全部
    return str.replace(reg, replaceVal || '');
}


/**
 * 解析统一订单返回的xml信息
 * @param {*} xmlData
 * @returns
 */
function parserXml(xmlData) {
    if (parser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
        var jsonObj = parser.parse(xmlData);
        return jsonObj;
    }
    return {};
}



/**
 * 
 * 传入订单信息 获取访问统一下单后的json信息
 * @param {*} obj
 * @returns
 */
async function getOrder(obj) {
    var str = await sortString(obj);
    obj.sign = str;
    var xml = getXml(obj);
    console.log("转化为xml:" + xml);
    console.log("转化为xml:" + str);
    xml = await order(xml);


    console.log(xml);
    var data = parserXml(xml);
    return data;
}


/**
 * 
 * 传入订单信息 申请退款操作
 * @param {*} obj
 * @returns
 */
async function refundOrder(obj) {
    var str = await sortString(obj);
    obj.sign = str;
    var param = getXml(obj);
  
    // console.log("拼装的xml格式----》"+param);
    // request({
    //     url:"https://api.mch.weixin.qq.com/secapi/pay/refund",
    //     agentOptions: {
    //         pfx: fs.readFileSync("D:/Progame Files/vscode/vscode-workspace/practice-car/src/wx_api/apiclient_cert.p12"),
    //         passphrase:"1550213571"
    //     },
    //     method: 'POST',
    //     body:param
    // },function(err,data){
    // console.log(JSON.stringify(data))
    //   console.log("1==="+JSON.parse(JSON.stringify(data)).body);  
    //   let rusult=parserXml(JSON.parse(JSON.stringify(data)).body);
    //   let xml = JSON.parse(JSON.stringify(rusult)).xml;
    //   console.log(xml)
    //     if(xml.return_code == "SUCCESS"){
    //        console.log(xml)
    //     }else{
    //         console.log(xml);
    //     }
    // })

  return param;
  


}





/**
 *  微信登录
 */
async function accessToken(code) {
    let url = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=" + think.config("wx_appid") + "&secret=" +
        think.config("wx_appsecret") + "&code=" + code + "&grant_type=authorization_code";
    var result = await think.fetch(url, { method: 'GET' }).then(res => res.json());
    return result;
}

async function getUserinfo(openid, access_token) {
    var url = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + access_token + '&openid=' + openid + '&lang=zh_CN'
    var result = await think.fetch(url, { method: 'GET' }).then(res => res.json());
    console.log(url);
    return result;
}

/** 
 *  微信小程序登录
*/
async function code2Session(code) {
    let url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + think.config("wx_appid") + "&secret=" +
        think.config("wx_appsecret") + "&js_code=" + code + "&grant_type=authorization_code";

    console.log(url);
    var result = await think.fetch(url, { method: 'GET' }).then(res => res.json());
    return result;
}

/** 
  *  微信小程序解密手机号信息
*/
function WXBizDataCrypt(encryptedData, iv, key) {

    var appid = think.config("wx_appid");

    // base64 decode
    var sessionKey = new Buffer(key, 'base64')
    encryptedData = new Buffer(encryptedData, 'base64')
    iv = new Buffer(iv, 'base64')

    try {
        // 解密
        var decipher = crypto.createDecipheriv('aes-128-cbc', sessionKey, iv)
        // 设置自动 padding 为 true，删除填充补位
        decipher.setAutoPadding(true)
        var decoded = decipher.update(encryptedData, 'binary', 'utf8')
        decoded += decipher.final('utf8')
        decoded = JSON.parse(decoded)

    } catch (err) {
        throw new Error('Illegal Buffer')
    }

    if (decoded.watermark.appid !== appid) {
        throw new Error('Illegal Buffer')
    }

    return decoded
}


/** 
 *  微信小程序 支付 
 */
function raw(args) {
    var keys = Object.keys(args);
    keys = keys.sort()
    var newArgs = {};
    keys.forEach(function (key) {
        newArgs[key] = args[key];
    });
    var string = '';
    for (var k in newArgs) {
        string += '&' + k + '=' + newArgs[k];
    }
    string = string.substr(1);
    return string;
}


async function paysignjs(appid, nonceStr, pack, signType, timeStamp) {
    var ret = {
        appId: appid,
        nonceStr: nonceStr,
        package: pack,
        signType: signType,
        timeStamp: timeStamp
    };
    var string = raw(ret);
    string = string + '&key=' + think.config("mchKey");;
    var sign = crypto.createHash('md5').update(string, 'utf8').digest('hex');
    return sign.toUpperCase();
}


async function createNonceStr(length) {
    length = length || 24;
    if (length > 32) length = 32;
    return (Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2)).substr(0, length);
}


async function getPaysign(obj) {
    console.log(obj);

    var nonceStr = await createNonceStr();
    // var timeStamp = await utils.createTimeStamp();

    var timeStamp = moment().unix();
    var appid = think.config("wx_appid");
    var paysign = await paysignjs(appid, nonceStr, "prepay_id=" + obj.xml.prepay_id, 'MD5', timeStamp);

    var result = {
        "appId": appid, //公众号名称，由商户传入 
        "timeStamp": timeStamp.toString(), //时间戳，自1970年以来的秒数 _this.orderinfo.timeStamp 
        "nonceStr": nonceStr, //随机串 
        "package": "prepay_id=" + obj.xml.prepay_id,
        "signType": 'MD5', //微信签名方式： 
        "paySign": paysign //微信签名 
    }
    console.log(result);
    return result;
}





/**
 *  微信网站应用登录
 */
async function getWebsiteToken(code) {
    let url = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=" + think.config("website_appid") + "&secret=" +
        think.config("website_appsecret") + "&code=" + code + "&grant_type=authorization_code";
    var result = await think.fetch(url, { method: 'GET' }).then(res => res.json());
    return result;
}

module.exports.getWebsiteToken = getWebsiteToken;
module.exports.WXBizDataCrypt = WXBizDataCrypt
module.exports.accessToken = accessToken;
module.exports.getUserinfo = getUserinfo;
module.exports.guid = guid;
module.exports.sortString = sortString;
module.exports.randomChar = randomChar;
module.exports.randomNumber = randomNumber;
module.exports.getXml = getXml;
module.exports.order = order;
module.exports.parserXml = parserXml;
module.exports.getOrder = getOrder;
module.exports.replaceAll = replaceAll;
module.exports.code2Session = code2Session;
module.exports.getPaysign = getPaysign;
module.exports.refundOrder = refundOrder;

