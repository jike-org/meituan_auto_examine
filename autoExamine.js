/**
 * create_time: 2021-01-07 10:00:00
 * update_time: 2021-08-09 16:19:00
 * author: WangTengfei
 * email: 776095293@qq.com
 * 美团外卖商家后台，自动审核订单脚本
 */

const http = axios.create({
    baseURL: `${window.location.origin}/v1/prescription`,
    timeout: 5 * 1000
})

const vue = new Vue({
    data () {
        return {
            timerId: 0,
            //商家id:从cookie中拿到acctid
            acctId: this.$cookies.isKey('acctId') ? this.$cookies.get('acctId') : undefined,
            time_interval: 5 * 1000 // 5s
        }
    },
    created () {
        this.run()
    },
    methods: {
        run () {
            this.log(0, '开始工作')

            if (!this.acctId) {
                this.log(0, 'acctId取值失败，请检查！')
                return
            }
            // 注册一个定时器
            this.timerId = setInterval(() => {
                this.query()
            }, this.time_interval)
            // 1小时刷新一次这个页面
            setInterval(() => {
                window.location.reload()
            }, 60 * 60 * 1000)
        },
        //查询有没有订单过来
        query () {
            const url = "/unaudited/query?startTime=&endTime=&pageNum=1&pageSize=20"
            http.get(url).then(response => {
                if (response.status !== 200) {
                    throw new Error(response.statusText)
                }
                const data = response.data
                if (data.code !== 0) {
                    let logMsg = data.msg
                    if (data.code !== 1001) {
                        logMsg = "查询订单失败：" + data.msg
                    }
                    //清除定时timerId
                    window.clearInterval(this.timerId)
                    throw new Error(logMsg)
                }
                const pageData = data.data.pageData
                if (pageData.commonPageInfo.totalCount <= 0) {
                    throw new Error(`订单列表为空：${pageData.commonPageInfo.totalCount}`)
                }
                if (pageData.pageList.length <= 0) {
                    throw new Error(`pageList数组为空：${pageData.pageList.length}`)
                }
                const orderList = pageData.pageList
                this.log(0, `本次需审核订单${orderList.length}条`)
                //循环处理每个订单
                for (let i = 0; i < orderList.length; i++) {
                    this.detail(orderList[i])
                }
            }).catch(error => {
                this.log(0, error.message)
            })
        },
        //查询订单详情,提交审核需要某些参数
        detail (order) {
            const url = "/order/detail/query"
            http.get(url, {
                params: {
                    auditViewId: order.auditViewId,
                    acctId: this.acctId,
                    wmPoiId: order.poiId
                }
            }).then(response => {
                this.log(0, `查询订单详情,${JSON.stringify(response.config.params)}`)
                if (response.status !== 200) {
                    this.log(order.auditViewId, `查询订单详情,网络请求失败：${response.status}`)
                    return false
                }
                const data = response.data
                if (data.code !== 0) {
                    this.log(order.auditViewId, `查询订单详情失败：${data.msg}`)
                    return false
                }
                if (!data.data) {
                    this.log(order.auditViewId, "订单详情为空")
                    return false
                }
                //审核订单
                this.commit(order.poiId, order.auditViewId, order.auditStatus, data.data.auditReason, undefined)
            }).catch(error => {
                this.log(0, error.message)
            })
        },
        //提交审核 POST
        commit (wmPoiId, auditViewId, auditStatus, auditReason, auditReasonType) {
            const url = "/order/audit/update"
            const params = new FormData()
            params.append('wmPoiId', wmPoiId)
            params.append('auditViewId', auditViewId)
            params.append('auditStatus', 2)
            params.append('auditReason', auditReason)
            params.append('auditReasonType', auditReasonType)
            http.post(url, params).then(response => {
                if (response.status !== 200) {
                    this.log(auditViewId, `查询订单详情,网络请求失败：${response.status}`)
                    return false
                }
                const data = response.data
                if (data.code !== 0) {
                    this.log(auditViewId, `订单审核失败：${data.msg}`)
                    return false
                }
                this.log(auditViewId, `订单审核成功：${data.msg}`)
            }).catch(error => {
                this.log(0, `审核请求失败：${error.message}`)
            })
        },
        // 格式化日志
        log (orderId, msg) {
            let orderInfo = ""
            if (orderId) {
                orderInfo = "订单id：" + orderId
            }
            console.log('自动审单', this.format(), orderInfo, msg)
        },
        // 格式化时间
        format () {
            // timestamp是整数，否则要parseInt转换
            const time = new Date()
            const y = time.getFullYear()
            const m = time.getMonth() + 1
            const d = time.getDate()
            const h = time.getHours()
            const mm = time.getMinutes()
            const s = time.getSeconds()
            return y + '-' + this.add0(m) + '-' + this.add0(d) + ' ' + this.add0(h) + ':' + this.add0(mm) + ':' + this.add0(s)
        },
        // 前面加0
        add0 (m) {
            return m < 10 ? '0' + m : m
        }
    }
})




