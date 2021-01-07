//import $ from "jquery";
/**
 * datetime: 2021-01-07 10:00:00
 * author: wangtengfei
 * 美团外卖商家后台，自动审核订单脚本
 */
//从cookie中获取指定值
function getCookie(key) {
    return document.cookie.length > 0 && (c_start = document.cookie.indexOf(key + "="),
    -1 != c_start) ? (c_start = c_start + key.length + 1,
    c_end = document.cookie.indexOf(";", c_start),
    -1 == c_end && (c_end = document.cookie.length),
    unescape(document.cookie.substring(c_start, c_end))) : ""
}

//具体请求的方法
var request = {
    //定时任务timerId
    timerId:0,
    //商家id:从cookie中拿到acctid
    acctId: getCookie("acctId") ? getCookie("acctId") : 73164926,
    //查询有没有订单过来
    query: function() {
        var that = this;
        let url = "https://shangoue.meituan.com/v1/prescription/unaudited/query?startTime=&endTime=&pageNum=1&pageSize=20"
        //发起请求
        let response = $.get(url, {}, function(data, status, xhr) {
            if (xhr.status != 200) {
                that.writeLog("", "网络请求失败：" + xhr.status);
                return false;
            }
            if (!data || data.code != 0) {
                let logMsg = data.msg;
                if (data.code != 1001) {
                    logMsg = "查询订单失败：" + data.msg;
                }
                that.writeLog("", logMsg);
                //清除定时timerId
                window.clearInterval(that.timerId);
                return false;
            }
            let pageData = data.data.pageData;
            if (pageData.commonPageInfo.totalCount <= 0) {
                that.writeLog("", "订单列表为空：" + pageData.commonPageInfo.totalCount);
                return false;
            }
            if (pageData.pageList.length <= 0) {
                that.writeLog("", "pageList数组为空：" + pageData.pageList.length);
                return false;
            }
            let orderList = pageData.pageList;
            //循环处理每个订单
            for (var i = 0; i < orderList.length; i++) {
                that.detail(that, orderList[i]);
            }
        });
    },
    //查询订单详情,提交审核需要某些参数
    detail: function(that, order) {
        let url = "https://shangoue.meituan.com/v1/prescription/order/detail/query?auditViewId=" + order.auditViewId + "&acctId=" + this.acctId + "&wmPoiId=" + order.poiId;
        let response = $.get(url, {}, function(data, status, xhr) {
            if (xhr.status != 200) {
                that.writeLog(order.auditViewId, "查询订单详情,网络请求失败：" + xhr.status)
                return false;
            }
            if (!data || data.code != 0) {
                that.writeLog(order.auditViewId, "查询订单详情失败：" + data.msg);
                return false;
            }
            if (!data.data) {
                that.writeLog(order.auditViewId, "订单详情为空");
                return false;
            }
            //审核订单
            that.commit(that, order.poiId, order.auditViewId, order.auditStatus, data.data.auditReason, null);
        });
    },
    //提交审核 POST
    commit: function(that, wmPoiId, auditViewId, auditStatus, auditReason, auditReasonType) {
        let url = "https://shangoue.meituan.com/v1/prescription/order/audit/update"
        let param = {
            wmPoiId: wmPoiId,
            auditViewId: auditViewId,
            auditStatus: 2,//auditStatus,
            auditReason: auditReason,
            auditReasonType: auditReasonType
        }
        let response = $.post(url, param, function(data, status, xhr) {
            if (xhr.status != 200) {
                that.writeLog(auditViewId, "订单审核请求失败：" + xhr.status)
                return false;
            }
            if (data.code != 0) {
                that.writeLog(auditViewId, "订单审核失败：" + data.msg)
                return false;
            }
            that.writeLog(auditViewId, "订单审核成功：" + data.msg)
            return true;
        });
    },
    //打印日志
    writeLog: function(orderId, msg) {
        var orderInfo = "";
        if (orderId) {
            orderInfo = "订单id：" + orderId;
        }
        console.log(orderInfo + msg);
    }
}

//定时执行
request.timerId = window.setInterval(function() {
    var datetime = new Date();
    timeStr = "任务运行时间：";
    timeStr += datetime.getFullYear() + "-" + datetime.getMonth() + 1 + "-" + datetime.getDate() + " " + datetime.getHours() + ":" + datetime.getMinutes() + ":" + datetime.getSeconds();
    request.writeLog("", timeStr);
    request.query();
}, 5 * 1000);
request.writeLog("", "定时器id:" + request.timerId);


