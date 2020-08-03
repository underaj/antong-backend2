/**
 * 定时任务配置模块文件
 */
 //"http://127.0.0.1:8360/orders/autoReturnAmount" 
module.exports = [
//   {

//       /**
//        * interval与cron属性二选一 
//        */
//      cron: '0 */1 * * *', //} crontab 的格式，如 0 */1 * * * 
//     handle: 'http://127.0.0.1:8360/orders/autoReturnAmount', //定时任务的执行方法，可以是一个具体的执行函数，也可以是一个路由地址（会根据路由解析，然后执行对应的 Action）
//      type: 'one'   
//   }
// ,
//  {
  
//      interval: '120s',  //执行的时间间隔，支持数字和字符串二种格式，单位是毫秒。如果是字符串，那么会用 think.ms 方法解析为数字
//      immediate: true,//
//       handle:"http://127.0.0.1:8360/orders/autoCancelOrdersByTimeCron"
//  },
 {
  
  interval: '120s',  //执行的时间间隔，支持数字和字符串二种格式，单位是毫秒。如果是字符串，那么会用 think.ms 方法解析为数字
  immediate: true,//
   handle:"http://127.0.0.1:8360/orders/autoReturnAmount"
}

]