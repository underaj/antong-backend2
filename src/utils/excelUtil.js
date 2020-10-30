var path = require('path');
var fs = require('fs');
//var setting = require('../config/config.js'); // 获取 文件 下载到 路径
var ejsExcel = require('ejsexcel');

const XLSX = require('xlsx');


// excelPath 模版路径  data 数据源
async function downloadExcel(name , data, templatePath) {

    console.log(templatePath);
    // write
    var exlBuf = await fs.readFileSync(templatePath); //获取 模版文件



    // 调试
   var   saveExcel = 'D:\\Progame Files\\vscode\\vscode-workspace\\practice-car\\www\\static\\xlsx';

    var excelPath = saveExcel + name;



    //数据源
    //var data = [{ "pt": "pt1", "des": "des1", "due_dt": "2013-08-07", "des2": "2013-12-07" }, { "pt": "pt1", "des": "des1", "due_dt": "2013-09-14", "des2": "des21" }];

    //用数据源(对象)data渲染Excel模板
    let exlBuf2 = await ejsExcel.renderExcel(exlBuf, data);
    console.log("render finish");

    await fs.writeFileSync(excelPath, exlBuf2);

    console.log("生成新的 excel");

    console.log('util-excelPath :' + excelPath);
    return saveExcel + name;
    // });

    // }).catch(function(err) {
    //     console.error(err);
    //     throw err;
    // });

    console.log("excel 1");


};


function constructor(srcData) {
    var srcData = srcData;
    var workbook = {};
    workbook.SheetNames = [];
    workbook.Sheets = {};

    for(let item in srcData) {
        workbook.SheetNames.push(item);
        addSheet( workbook,item, srcData[item]);
    }

    return workbook;
}

/**
 * 往Excel文件添加一个表格
 * @param {string} sheetName 表格名
 * @param {object} sheet 表格数据
 * @returns void
 */
function addSheet(workbook,sheetName, sheet) {
    workbook['Sheets'][sheetName] = {};
    let row = sheet.length;
    let col = sheet[0].length;
    let to = '';

    for(let i=0; i<row; i++) {
        for(let j=0; j<col; j++) {
            let key = ten2twentysix(j+1) + (i+1);
            workbook['Sheets'][sheetName][key] = {'v': sheet[i][j]};
            to = key;
        }
    }
    workbook['Sheets'][sheetName]['!ref'] = 'A1:' + to;
}


/**
 * 10进制转26进制
 * @param {number} num 正整数
 * @returns string
 */
function ten2twentysix(num) {
    let str = '';
    while(num) {
        let rest = num % 26;
        num = (num-rest) / 26;
        str += String.fromCharCode(rest + 64);
    }

    let twentysixNumber = '';
    let len = str.length;
    for(let i=len-1; i>=0; i--) {
        twentysixNumber += str[i];
    }

    return twentysixNumber;
}

/**
 * 将数据写入Excel
 * @param {string} filename 文件路径
 */
function writeFile(filename, workbook) {
    XLSX.writeFile(workbook, filename);
}


module.exports.downloadExcels = downloadExcel;
module.exports.constructor = constructor;
module.exports.writeFile = writeFile;



