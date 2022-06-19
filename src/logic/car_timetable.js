/**
 * @author wangjie
 * @description 车辆排期查询 参数校验
 */
module.exports = class extends think.Logic {
    indexAction() {

    }
    /**
     * @description 排期查询需传入排期类型
     */
    async queryCarTimeTableAction() {
        //参数校验
        let rules = {
            type: {
                int: true,           // 字段类型为 int 类型
                required: true,     // 字段必填
                //  trim: true ,        // 字段需要trim处理
                method: "POST"       //指定获取数据的方式
            },
            carNo: {
                int: true,
                required: false,
                method: "POST"
            }
        }
        //自定义参数错误，会进行数据覆盖
        let add = {
            type: "{type}不能为空（传科二或科三类型）",
        }
        let flag = this.validate(rules, add);
        if (!flag) {
            return this.fail(1, this.validateErrors);
        }
    }
    /**
     * 按天删除排班数据信息
     */
    async deleteCarTimetableAction() {
        //参数校验
        let rules = {
            date: {
                string: true,           // 字段类型为 int 类型
                required: true,     // 字段必填
                //  trim: true ,        // 字段需要trim处理
                method: "POST"       //指定获取数据的方式
            },
            type: {
                int: true,
                required: true,
                method: "POST"
            }
        }
        //自定义参数错误，会进行数据覆盖
        let add = {
            date: "{date}不能为空（yyyy-mm-dd）",
            type: "{type}不能为空（传科二或科三类型）",
        }
        let flag = this.validate(rules, add);
        if (!flag) {
            return this.fail(1, this.validateErrors);
        }


    }

};