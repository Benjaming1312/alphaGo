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


$(function () {
  if (!is('#aiAnalysis')) {
    return
  }

  Highcharts.setOptions(chartTheme)

  const app = new Vue({
    el: '#aiAnalysis',
    data: {
      loading: false,
      category: [],
      companyOri: [],
      druDate: [],
      companySelect: '',
      backTestRltColumns: [], // 回測結果統計表表頭
      dataSheetColumns: [], // 回測結果統計表表頭
      rocColumns: [], // ROC表頭
      trainingColumns: [], // 訓練及測試資料表頭
      rocSelect: '全部上市櫃股票', // roc產業類別
      trainingSelect: '全部上市櫃股票', // 最新符合停利停損條件產業類別

      trainingMaterials: [], // 訓練及測試資料
      methodOfPrediction: [], // 預測方法
      predictiveAccuracy: null, // 預測正確率測試資料
      predictiveEffect: null, // 預測效果
      predictionConclusion: [], // 預測結論
      roc: [], // ROC曲線
      setOpts: {
        selectCategory: '全部上市櫃股票', // 產業類別
        companyName: '', // 公司名稱
        companyNum: '', // 公司代號
        buyDate: '2019/06', // 股票買進日期
        durTime: 24, // 股票持有期間
        ror: 50 // 預估報酬率
      },
      statisticalVerify: null, // 統計檢定
      // DataTable
      rocTable: null, // Roc Table
      trainingTable: null, // 訓練及測試資料Table
      backTestRltTable: null, // 回測結果統計表Table
      backTestDataSheetTable: null // 回測結果資料表Table
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
      /* roc列表 */
      filterRoc () {
        // 等畫面準備好，重新render dataTable
        this.$nextTick(() => {
          this.rocTable = $('#rocCategory .table').DataTable()
        })
        return this.roc
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

        const getBackTestRlt = this.getBackTestRlt() // 取得回測結果統計表
        const getBackTestDataSheet = this.getBackTestDataSheet() // 取得回測結果資料表
        const getTrainingMaterials = this.getTrainingMaterials() // 取得訓練及測試資料
        const getMethodOfPrediction = this.getMethodOfPrediction() // 取得預測方法
        const getPredictiveAccuracy = this.getPredictiveAccuracy() // 取得預測正確率測試資料
        const getPredictiveEffect = this.getPredictiveEffect() // 取得預測效果
        const getPredictionConclusion = this.getPredictionConclusion() // 取得預測結論
        const getRoc = this.getRoc() // 取得ROC曲線
        const getStatisticalVerify = this.getStatisticalVerify() // 取得統計檢定
        Promise.all([
          getBackTestRlt,
          getBackTestDataSheet,
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

            this.loading = false
          })
      },
      /* 取得回測結果統計表*/
      getBackTestRlt () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/strategyModel/backTestRlt.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              // Clear Table
              if (!_.isNil(this.backTestRltTable)) {
                this.backTestRltTable.destroy()
                this.backTestRltTable = null
              }

              // Clear data
              this.backTestRlt = []
              this.backTestRltColumns = []

              // 準備title
              Object.keys(res.data[0]).forEach(key => {
                this.backTestRltColumns.push(key)
              })

              // 把多餘的field 刪掉
              res.data.forEach(data => {
                const newObj = {}
                this.backTestRltColumns.forEach(key => {
                  newObj[key] = data[key]
                })
                this.backTestRlt.push(newObj)
              })
              
              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject()
            })
        })
      },
      /* 取得回測結果資料表*/
      getBackTestDataSheet () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/strategyModel/backTestDataSheet.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              // Clear Table
              if (!_.isNil(this.backTestDataSheetTable)) {
                this.backTestDataSheetTable.destroy()
                this.backTestDataSheetTable = null
              }

              // Clear
              this.backTestDataSheet = []
              this.dataSheetColumns = []

              // 準備title
              Object.keys(res.data[0]).forEach(key => {
                this.dataSheetColumns.push(key)
              })

              // 把多餘的field 刪掉
              res.data.forEach(data => {
                const newObj = {}
                this.dataSheetColumns.forEach(key => {
                  newObj[key] = data[key]
                })
                this.backTestDataSheet.push(newObj)
              })

              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject()
            })
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
              reject()
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
              reject()
            })
        })
      },
      /* 取得預測方法 */
      getMethodOfPrediction () {
        return new Promise((resolve, reject) => {
          httpGetCfg.baseURL = 'dist/data/ai/methodOfPrediction.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              this.methodOfPrediction = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject()
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
              this.predictiveAccuracy = res.data.map(d => _.get(d, '文字敘述'))
              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject()
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
              reject()
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
              reject()
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
              // Clear table
              if (!_.isNil(this.rocTable)) {
                this.rocTable.destroy()
              }

              // Clear
              this.roc = []
              this.rocColumns = []

              // 準備title
              Object.keys(res.data[0]).forEach(key => {
                this.rocColumns.push(key)
              })

              // 把多餘的field 刪掉
              res.data.forEach(data => {
                const newObj = {}
                this.rocColumns.forEach(key => {
                  newObj[key] = data[key]
                })
                this.roc.push(newObj)
              })

              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              reject()
            })
        })
      },
      /* 畫圖表 */
      renderTable () {
        this.$nextTick(() => {
          // 等畫面render完再執行dataTable
          this.backTestRltTable = $('#barCollapse-2 .table').DataTable()
          this.backTestDataSheetTable = $('#barCollapse-3 .table').DataTable()
        })
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
