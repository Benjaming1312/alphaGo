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

// 預測目標Template
const setTemp = { 
  selectCategory: '全部上市櫃股票', // 產業類別
  companyName: '', // 公司名稱
  companyNum: '', // 公司代號
  buyTime: '2019-06-11', // 買進日期
  durTime: '24', // 持有期間
  ror: 10, // 預估報酬率
  setList: []
}

// 預測因素Template
const guessTemp = {
  dataType: '財報年報', // 指標類型
  durTime: '最近1年', // 資料統計年度
  categoryIdx: '現金流量', // 指標類別
  categoryItem: '年度投資活動現金流量', // 項目
  dataOption: '當期值', // 資料型態
  guessList: []
}

// 顏色模板
const colorCategory = ['#b77ea6', '#57a6c1', '#c48a35']


$(function () {
  if (!is('#cusAiAnalysis')) {
    return
  }

  // 設定按鈕顏色
  barOpts.chart.resetZoomButton.theme.fill = '#ffc610'
  barOpts.chart.resetZoomButton.theme.states.hover.style.color = barOpts.chart.resetZoomButton.theme.fill
  _.set(barOpts, 'tooltip.backgroundColor', '#ffc610')

  chartTheme.xAxis.gridLineWidth = .25 // X軸線條
  chartTheme.colors = colorCategory
  Highcharts.setOptions(chartTheme)

  const app = new Vue({
    el: '#cusAiAnalysis',
    data: {
      loading: false,
      notifying: false,
      sendLoading: false,
      category: [],
      companyOri: [],
      druDate: [],
      categoryOri: [],
      unit: [],
      companySelect: '',
      rocColumns: [], // ROCLegend 資料
      trainingColumns: [], // 訓練及測試資料表頭
      predictiveAccuracyColumns: [], //預測正確率測試資料
      rocSelect: '全部上市櫃股票', // roc產業類別
      trainingSelect: '全部上市櫃股票', // 最新符合停利停損條件產業類別
      notifyMsg: '資料讀取中，請稍後',
      notifyError: '資料錯誤，請洽工程人員',
      trainingMaterials: null, // 訓練及測試資料
      predictiveAccuracy: [], // 預測正確率測試資料
      predictiveEffect: [], // 預測效果
      predictionConclusion: [], // 預測結論
      testAims: [], // 預測目標
      roc: null, // ROC曲線
      statisticalVerify: null, // 統計檢定
      // 預測目標
      setOpt: _.cloneDeep(setTemp),
      // 預測目標 回覆
      setSync: {
        methodOfPrediction: [] // 預測方法
      },
      // 預測因素
      getOpt: _.cloneDeep(guessTemp),
      // 預測因素 回覆
      guesSync: {
        methodOfPrediction: [] // 預測方法
      },
      // DataTable
      rocTable: null, // Roc Table
      trainingTable: null // 訓練及測試資料Table
    },
    computed: {
      companyInfo () {
        if (this.setOpt.selectCategory === '全部上市櫃股票') {
          return this.companyOri
        }
        else {
          return this.companyOri.filter(data => data['產業類別'] === this.setOpt.selectCategory)
        }
      },
      /**
       * 指標類型
       */
      dataCategory () {
        return Array.from(new Set(this.categoryOri.map(item => item['指標類型'])))
      },
      /**
       * 指標類別
       */
      indexCategory () {
        return Array.from(new Set(this.categoryOri
          .filter(data => data['指標類型'] === this.getOpt.dataType)
          .map(data => data['指標類別'])))
      },
      /**
       * 項目
       */
      itemCategory () {
        return this.categoryOri
          .filter(data => data['指標類別'] === this.getOpt.categoryIdx)
          .map(data => data['項目'])
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
      },
      /**
       * 資料統計年度選項
       */
      durTimeOpts () {
        let rlt = []
        switch (this.getOpt.dataType) {
          case '財報年報':
            rlt = ['最近1年', '最近2年', '最近3年', '最近4年', '最近5年']
            break
          case '財報季報':
            rlt = ['最近1季', '最近2季', '最近3季', '最近4季']
            break
          case '價值評估':
          case '籌碼面':
          case '技術面':
            rlt = ['最近1月', '最近2月', '最近3月', '最近4月', '最近5月', '最近6月']
            break
        }
        return rlt
      },
      /**
       * 資料型態選項
       */
      dataOptionOpts () {
        let rlt = []
        switch (this.getOpt.durTime) {
          case '最近1年':
          case '最近1季':
          case '最近1月':
            rlt = ['當期值']
            break
          default:
            rlt = ['平均值', '合計值']
            break
        }
        return rlt
      }
    },
    methods: {
      /* 輸入條件 */
      send () {
        // 預測目標內容
        const buyTime = this.setOpt.buyTime
        const companyName = this.setOpt.companyName
        const durTime = this.setOpt.durTime
        const ror = this.setOpt.ror
        this.setOpt.setList = [`預測目標︰於${buyTime}買進${companyName}，持有${durTime}個月後，報酬率是否大於${ror}%`]
        
        // 預測因素內容
        const guessDurTime = this.getOpt.durTime
        const guessCategoryItem = this.getOpt.categoryItem
        const dataOption = this.getOpt.dataOption
        const text = `${guessDurTime}${guessCategoryItem}${dataOption}`
        this.getOpt.guessList.push(text)
      },
      /* 開始分析 */
      submit (type) {
        this.loading = true
        console.warn('預測因素', this.getOpt)
        console.warn('預測目標', this.setOpt)

        const getTrainingMaterials = this.getTrainingMaterials() // 取得訓練及測試資料
        const getMethodOfPrediction = this.getMethodOfPrediction(type) // 取得預測方法
        const getPredictiveAccuracy = this.getPredictiveAccuracy() // 取得預測正確率測試資料
        const getPredictiveEffect = this.getPredictiveEffect() // 取得預測效果
        const getPredictionConclusion = this.getPredictionConclusion() // 取得預測結論
        const getRoc = this.getRoc() // 取得ROC曲線
        const getStatisticalVerify = this.getStatisticalVerify() // 取得統計檢定
        Promise.all([
          getTrainingMaterials,
          getMethodOfPrediction,
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
      clear () {
        this.setOpt.setList = []
        this.getOpt.guessList = []
      },
      /* 取得項目 */
      getUnit (info) {
        const rlt = this.unit.filter(data => data['項目'] === info)
        return rlt.length > 0 ? rlt[0]['單位'] : ''
      },
      /* 取得統計檢定*/
      getStatisticalVerify (type) {
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
          httpGetCfg.baseURL = 'dist/data/ai/trainingMaterials.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
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
              console.warn('error', e.message)
              reject(e)
            })
        })
      },
      /* 取得預測方法 */
      getMethodOfPrediction (type) {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/ai/methodOfPrediction.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              this[type].methodOfPrediction = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject(e)
            })
        })
      },
      /* 取得預測正確率測試資料 */
      getPredictiveAccuracy () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/ai/predictiveAccuracy.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
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
            console.warn('error', e.message)
            reject(e)
          })
        })
      },
      /* 取得預測效果 */
      getPredictiveEffect () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/ai/predictiveEffect.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              this.predictiveEffect = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject(e)
            })
        })
      },
      /* 取得預測結論 */
      getPredictionConclusion () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/ai/predictionConclusion.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              this.predictionConclusion = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject(e)
            })
        })
      },
      /* 取得ROC曲線 */
      getRoc () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/ai/roc.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              this.roc = res.data
              if (res.data.length > 0) {
                Object.keys(res.data[0]).forEach(key => {
                  this.rocColumns.push(key)
                })
              }

              resolve()
            })
            .catch(e => {
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
      'getOpt.dataType' () {
        this.getOpt.categoryIdx = this.indexCategory[0]
        this.getOpt.durTime = this.durTimeOpts[0]
      },
      'getOpt.categoryIdx' () {
        this.getOpt.categoryItem = this.itemCategory[0]
      },
      'getOpt.durTime' () {
        this.getOpt.dataOption = this.dataOptionOpts[0]
      },
      'companyInfo' (val) {
        if (val.length !== 0) {
          this.companySelect = this.companyInfo[0]['公司代號']
        }
      },
      'companySelect' () {
        const findCompany = this.companyInfo.find(data => data['公司代號'] === this.companySelect)
        this.setOpt.companyName = _.get(findCompany, '公司名稱')
        this.setOpt.companyNum = _.get(findCompany, '公司代號')
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
      
      // 取得指標類別及項目
      httpGetCfg.baseURL = 'dist/data/menu/category.json'
      const getCategory = axios.create(httpGetCfg)
      getCategory.get()
        .then(res => {
          this.categoryOri = res.data
        })
        .catch(e => {
          console.warn('error', e.message)
        })

      // 取得單位資料
      httpGetCfg.baseURL = 'dist/data/menu/unit.json'
      const getUnit = axios.create(httpGetCfg)
      getUnit.get()
        .then(res => {
          this.unit = res.data
        })
        .catch(e => {
          console.warn('error', e.message)
        })
    }
  })
})
