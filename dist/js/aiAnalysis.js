const durDateStart = 24

let httpGetCfg = { // HTTP Get config
  baseURL: '',
  headers: {
    'Accept': 'application/json'
  },
  'validateStatus': function httpValidateStatus (status) {
    return (status >= 200 && status < 300) || (status === 404) // default is (status >= 200 && status < 300)
  }
}

// 顏色模板
const colorCategory = ['#b77ea6', '#57a6c1', '#c48a35']


$(function () {
  if (!is('#aiAnalysis')) {
    return
  }

  // 設定按鈕顏色
  barOpts.chart.resetZoomButton.theme.fill = '#f39800'
  barOpts.chart.resetZoomButton.theme.states.hover.style.color = barOpts.chart.resetZoomButton.theme.fill
  _.set(barOpts, 'tooltip.backgroundColor', '#f39800')

  chartTheme.xAxis.gridLineWidth = .25 // X軸線條
  chartTheme.colors = colorCategory
  Highcharts.setOptions(chartTheme)

  const app = new Vue({
    el: '#aiAnalysis',
    data: {
      loading: false,
      notifying: false,
      category: [],
      companyOri: [],
      druDate: [],
      companySelect: '',
      rocColumns: [], // ROCLegend 資料
      trainingColumns: [], // 訓練及測試資料表頭
      predictiveAccuracyColumns: [], //預測正確率測試資料
      rocSelect: '全部上市櫃股票', // roc產業類別
      trainingSelect: '全部上市櫃股票', // 最新符合停利停損條件產業類別
      notifyMsg: '資料讀取中，請稍後',
      notifyError: '資料錯誤，請洽工程人員',
      trainingMaterials: [], // 訓練及測試資料
      methodOfPrediction: [], // 預測方法
      testAims: [], // 預測目標
      predictiveAccuracy: [], // 預測正確率測試資料
      predictiveEffect: [], // 預測效果
      predictionConclusion: [], // 預測結論
      roc: [], // ROC曲線
      setOpts: {
        selectCategory: '全部上市櫃股票', // 產業類別
        companyName: '', // 公司名稱
        companyNum: '', // 公司代號
        buyDate: moment().format('YYYY-MM-DD'), // 股票買進日期
        durTime: 24, // 股票持有期間
        ror: 50 // 預估報酬率
      },
      statisticalVerify: null, // 統計檢定
      // DataTable
      trainingTable: null // 訓練及測試資料Table
    },
    computed: {
      companyInfo () {
        if (this.setOpts.selectCategory === '全部上市櫃股票') {
          return this.companyOri
        }
        else {
          return this.companyOri
            .filter(data => data['產業類別'] === this.setOpts.selectCategory)
        }
      },
      /* 取得訓練及測試資料列表 */
      filterTrainingMaterials () {
        // 等畫面準備好，重新render dataTable
        this.$nextTick(() => {
          this.trainingTable = $('#trainingMaterialsCategory .table').DataTable()
        })

        if (this.trainingSelect === '全部上市櫃股票') {
          return this.trainingMaterials
        }
        else {
          return this.trainingMaterials.filter(data => data['產業類別'] === this.trainingSelect)
        }
      }
    },
    methods: {
      /* 開始分析 */
      submit () {
        console.warn('send info', this.setOpts)
        this.loading = true

        const getTrainingMaterials = this.getTrainingMaterials() // 取得訓練及測試資料
        const getMethodOfPrediction = this.getMethodOfPrediction() // 取得預測方法
        const getTestAims = this.getTestAims() // 取得預測目標
        const getPredictiveAccuracy = this.getPredictiveAccuracy() // 取得預測正確率測試資料
        const getPredictiveEffect = this.getPredictiveEffect() // 取得預測效果
        const getPredictionConclusion = this.getPredictionConclusion() // 取得預測結論
        const getRoc = this.getRoc() // 取得ROC曲線
        const getStatisticalVerify = this.getStatisticalVerify() // 取得統計檢定
        Promise.all([
          getTrainingMaterials,
          getMethodOfPrediction,
          getTestAims,
          getPredictiveAccuracy,
          getPredictiveEffect,
          getPredictionConclusion,
          getRoc,
          getStatisticalVerify
        ])
          .then(() => {
            this.renderTable() // 畫圖表
            this.renderChart() // 畫Chart

            if (env) {
							setTimeout(() => {
								this.loading = false
							}, 3000)
						}
						else {
							this.loading = false
						}
          })
          .catch(e => {
            this.loading = false
  
            this.notifying = true
            this.notifyError = e.message
  
            if (env) {
              setTimeout(() => {
                this.notifying = false
              }, 3000)
            }
            else {
              this.notifying = false
            }
          })
      },
      /* 取得統計檢定*/
      getStatisticalVerify () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/strategyModel/statisticalVerify.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              this.statisticalVerify = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject(e)
            })
        })
      },
      /* 取得訓練及測試資料 */
      getTrainingMaterials () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'http://18.219.6.80:3000'
          const getData = axios.create(httpGetCfg)
          getData.get('/allData', {params: this.setOpts})
            .then(res => {
              console.info('API Response: /allData', res)
              // Clear table
              if (!_.isNil(this.trainingTable)) {
                this.trainingTable.destroy()
              }

              // Clear
              this.trainingMaterials = []
              this.trainingColumns = []

              // 準備title
              Object.keys(res.data[0]).forEach(key => {
                this.trainingColumns.push(key)
              })

              // 把多餘的field 刪掉
              res.data.forEach(data => {
                const newObj = {}
                this.trainingColumns.forEach(key => {
                  newObj[key] = data[key]
                })
                this.trainingMaterials.push(newObj)
              })

              resolve()
            })
            .catch(e => {
              console.error('API Fail: /allData', e)
              reject(e)
            })
        })
      },
      /* 取得預測方法 */
      getMethodOfPrediction () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'http://18.219.6.80:3000'
          const getData = axios.create(httpGetCfg)
          getData.get('/method', {params: this.setOpts})
            .then(res => {
              console.info('API Response: /method', res)
              this.methodOfPrediction = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.error('API Fail: /method', e)
              reject(e)
            })
        })
      },
      /* 取得預測正確率測試資料 */
      getPredictiveAccuracy () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'http://18.219.6.80:3000'
          const getData = axios.create(httpGetCfg)
          getData.get('/dataTest', {params: this.setOpts})
            .then(res => {
              console.info('API Response: /dataTest', res)
              // Clear table
              if (!_.isNil(this.predictiveAccuracyTable)) {
                this.predictiveAccuracyTable.destroy()
              }
            
              // Clear
              this.predictiveAccuracy = []
              this.predictiveAccuracyColumns = []
            
              // 準備title
              Object.keys(res.data[0]).forEach(key => {
                this.predictiveAccuracyColumns.push(key)
              })
            
              // 把多餘的field 刪掉
              res.data.forEach(data => {
                const newObj = {}
                this.predictiveAccuracyColumns.forEach(key => {
                  newObj[key] = data[key]
                })
                this.predictiveAccuracy.push(newObj)
              })
              resolve()
          })
          .catch(e => {
            console.error('API Fail: /dataTest', e)
            reject(e)
          })
        })
      },
      /* 取得預測效果 */
      getPredictiveEffect () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'http://18.219.6.80:3000'
          const getData = axios.create(httpGetCfg)
          getData.get('/effect', {params: this.setOpts})
            .then(res => {
              console.info('API Response: /effect', res)
              this.predictiveEffect = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.error('API Fail: /effect', e)
              console.warn('error', e.message)
              reject(e)
            })
        })
      },
      /* 取得預測結論 */
      getPredictionConclusion () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'http://18.219.6.80:3000'
          const getData = axios.create(httpGetCfg)
          getData.get('/conclusion', {params: this.setOpts})
            .then(res => {
              console.info('API Response: /conclusion', res)
              this.predictionConclusion = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.error('API Fail: /conclusion', e)
              console.warn('error', e.message)
              reject(e)
            })
        })
      },
      /* 取得預測目標 */
      getTestAims () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'http://18.219.6.80:3000'
          const getData = axios.create(httpGetCfg)
          getData.get('/target', {params: this.setOpts})
            .then(res => {
              console.info('API Response: /target', res)
              this.testAims = res.data.map(d => _.get(d, 'x'))
              resolve()
            })
            .catch(e => {
              console.error('API Fail: /target', e)
              reject(e)
            })
        })
      },
      /* 取得ROC曲線 */
      getRoc () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'http://18.219.6.80:3000'
          const getData = axios.create(httpGetCfg)
          getData.get('/roc', {params: this.setOpts})
            .then(res => {
              console.info('API Response: /roc', res)
              this.roc = res.data
              if (res.data.length > 0) {
                Object.keys(res.data[0]).forEach(key => {
                  this.rocColumns.push(key)
                })
              }

              resolve()
            })
            .catch(e => {
              console.error('API Fail: /roc', e)
              console.warn('error', e.message)
              reject(e)
            })
        })
      },
      /* 畫圖表 */
      renderTable () {
        this.$nextTick(() => {
          // 等畫面render完再執行dataTable
          this.predictiveAccuracyTable = $('#barCollapse-3 .table').DataTable()
        })
      },
      /* Chart */
      renderChart () {
        if (this.roc.length === 0) {
          return
        }

        let chartOptions = _.cloneDeep(barOpts)
        chartOptions.chart.type = 'line'
        chartOptions.plotOptions.series.marker = {
          enabled: false
        }

        // 設定類型
        // const category = this.rocColumns[0]
        chartOptions.xAxis.categories = []
        chartOptions.yAxis.title = {
          text: this.rocColumns[1]
        }
        chartOptions.xAxis.title = {
          text: this.rocColumns[0]
        }

        // const labelWidth = 70 // 字元寬度
        // // 設定每隔間距
        // chartOptions.chart.scrollablePlotArea.minWidth = this.roc.length * labelWidth

        // 設定圖表資料
        const seriesTemp = {
          name: null,
          data: [],
          showInLegend: false
        }
        chartOptions.series = [seriesTemp]

        this.roc.forEach(data => {
          chartOptions.series[0].data.push([data[chartOptions.xAxis.title.text], data[chartOptions.yAxis.title.text]])
        })


        var myChart = Highcharts.chart('chartContent', chartOptions)
      }
    },
    watch: {
      'companyInfo' () {
        this.companySelect = this.companyInfo[0]['公司代號']
      },
      'companySelect' () {
        const findCompany = this.companyInfo.find(data => data['公司代號'] === this.companySelect)
        this.setOpts.companyName = _.get(findCompany, '公司名稱')
        this.setOpts.companyNum = _.get(findCompany, '公司代號')
      }
    },
    beforeMount() {
      // 股票最大持有期間
      this.druDate =  Array.from({length: 24}, (v, k) => k + durDateStart)
    },
    beforeCreate () {

      // 取得產業類別資料
      httpGetCfg.baseURL = 'dist/data/menu/industry.json'
      const getData = axios.create(httpGetCfg)
      getData.get()
        .then(res => {
          this.category = res.data.map(d => d.indus)
        })
        .catch(e => {
          console.warn('error', e.message)
        })

      // 取得指標類別及項目
      httpGetCfg.baseURL = 'dist/data/menu/company.json'
      const getCompany = axios.create(httpGetCfg)
      getCompany.get()
        .then(res => {
          this.companyOri = res.data
        })
        .catch(e => {
          console.warn('error', e.message)
        })
    }
  })
})
