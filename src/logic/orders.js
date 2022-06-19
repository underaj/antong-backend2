module.exports = class extends think.Logic {
    indexAction() {

    };

    /**
         * @description 订单查询
         */
    async queryOrderAction() {
        //参数校验
        let rules = {
            pageIndex: {
                int: true,           // 字段类型为 int 类型
                required: true,     // 字段必填
                //  trim: true ,        // 字段需要trim处理
                method: "POST"       //指定获取数据的方式
            },
            pageSize: {
                int: true,           // 字段类型为 int 类型
                required: true,     // 字段必填
                //  trim: true ,        // 字段需要trim处理
                method: "POST"       //指定获取数据的方式
            }
        }
        let flag = this.validate(rules);
        if (!flag) {
            return this.fail(1, this.validateErrors);
        }
    }

    /**
     * 根据id查询
     */
    // async queryOrdersByIdAction() {
    //     //参数校验
    //     let rules = {
    //         id: {
    //             string: true,           // 字段类型为 int 类型
    //             required: true,     // 字段必填
    //             //  trim: true ,        // 字段需要trim处理
    //             method: "POST"       //指定获取数据的方式
    //         }

    //     }
    //     let flag = this.validate(rules);
    //     if (!flag) {
    //         return this.fail(1, this.validateErrors);
    //     }
    // }

    async queryCarScheduleAction() {
        //参数校验
        let rules = {
            subject: {
                int: true,           // 字段类型为 int 类型
                required: true,     // 字段必填
                //  trim: true ,        // 字段需要trim处理
                method: "POST"       //指定获取数据的方式
            }

        }
        let flag = this.validate(rules);
        if (!flag) {
            return this.fail(1, this.validateErrors);
        }
    }

};