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

// 數據分析Temp
const analyTemp = {
  companyCategory: '全部上市櫃股票', // 產業類別
  companyName: '', // 公司名稱
  companyNum: '', // 公司代號
  dataType: '財報年報', // 指標類型
  durTime: '最近1年', // 資料統計年度
  categoryIdx: '現金流量', // 指標類別
  categoryItem: '年度投資活動現金流量', // 項目
  dataOption: '當期值', // 資料型態
  startTime: '2012-01-01', // 起始日期
  endTime: '2019-06-11' // 結束日期
}

// 顏色模板
const colorCategory = ['#b77ea6', '#57a6c1', '#c48a35']

$(function () {
  if (!is('#dataAnalysis')) {
    return
  }

  chartTheme.xAxis.gridLineWidth = .25 // X軸線條
  chartTheme.colors = colorCategory
  Highcharts.setOptions(chartTheme)

  const app = new Vue({
    el: '#dataAnalysis',
    data: {
      loading: false,
      colorCategory: colorCategory,
      category: [],
      companyOri: [],
      druDate: [],
      categoryOri: [],
      unit: [],
      chartData: [],
      dataColumns: [],
      companySelect: '',
      notifyMsg: '資料讀取中，請稍後',
      // 預測因素
      analysisOpt: _.cloneDeep(analyTemp),
    },
    computed: {
      companyInfo () {
        if (this.selectCategory === '全部上市櫃股票') {
          return this.companyOri
        }
        else {
          return this.companyOri.filter(data => data['產業類別'] === this.analysisOpt.companyCategory)
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
          .filter(data => data['指標類型'] === this.analysisOpt.dataType)
          .map(data => data['指標類別'])))
      },
      /**
       * 項目
       */
      itemCategory () {
        return this.categoryOri
          .filter(data => data['指標類別'] === this.analysisOpt.categoryIdx)
          .map(data => data['項目'])
      },
      legend () {
        return this.dataColumns.filter(key => (key !== '公司名稱') && key !== '日期')
      },
      /**
       * 資料統計年度選項
       */
      durTimeOpts () {
        let rlt = []
        switch (this.analysisOpt.dataType) {
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
        switch (this.analysisOpt.durTime) {
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
      getUnit (info) {
        const rlt = this.unit.filter(data => data['項目'] === info)
        return rlt.length > 0 ? rlt[0]['單位'] : ''
      },
      submit () {
        this.loading = true
        console.warn('option', this.analysisOpt)
        
        this.getData()
          .then(() => {
            this.renderChart()

            if (env) {
							setTimeout(() => {
								this.loading = false
							}, 3000)
						}
						else {
							this.loading = false
						}
          })
      },
      clear () {
        this.analysisOpt =  _.cloneDeep(analyTemp)
      },
      /* 取得數據圖表分析 */
      getData () {
        return new Promise((resolve, rejects) => {
          httpGetCfg.baseURL = 'dist/data/chartData/dataAnalytics.json'
          const getData = axios.create(httpGetCfg)
          getData.get()
            .then(res => {
              this.chartData = []
              this.dataColumns = []

              Object.keys(res.data[0]).forEach(key => {
                this.dataColumns.push(key)
              })

              res.data.forEach(data => {
                const newObj = {}
                this.dataColumns.forEach(key => {
                  newObj[key] = data[key]
                })
                this.chartData.push(newObj)
              })

              resolve()
            })
            .catch(e => {
              console.warn('error', e.message)
              rejects()
            })
        })
      },
      renderChart () {
        if (this.chartData.length === 0) {
          return
        }

        let chartOptions = _.cloneDeep(barOpts)
        chartOptions.chart.type = 'line'
        chartOptions.plotOptions.series.marker = {
          enabled: false
        }

        // 設定類型
        const category = '日期'
        chartOptions.xAxis.categories = this.chartData.map(data => data[category])


        const labelWidth = 70 // 字元寬度
        // 設定每隔間距
        chartOptions.chart.scrollablePlotArea.minWidth = this.chartData.length * labelWidth

        // 設定圖表資料
        const seriesTemp = {
          name: null,
          data: [],
          showInLegend: false
        }
        chartOptions.series = []

        

        // Create series
        this.dataColumns.forEach((key, idx) => {
          const newObj = _.cloneDeep(seriesTemp)
          if (key !== '公司名稱' && key !== '日期') {
            newObj.name = key
            chartOptions.series.push(newObj)
          }
        })

        chartOptions.series.forEach(series => {
          this.chartData.forEach(data => {
            series.data.push(data[series.name])
          })
        })

        // // 排序年度
        // chartOptions.series[0].data.sort((a, b) => a[0] - b[0])

        var myChart = Highcharts.chart('chartContent', chartOptions)
      }
    },
    watch: {
      'analysisOpt.dataType' () {
        this.analysisOpt.categoryIdx = this.indexCategory[0]
        this.analysisOpt.durTime = this.durTimeOpts[0]
      },
      'analysisOpt.categoryIdx' () {
        this.analysisOpt.categoryItem = this.itemCategory[0]
      },
      'analysisOpt.durTime' () {
        this.analysisOpt.dataOption = this.dataOptionOpts[0]
      },
      'companyInfo' (val) {
        if (val.length !== 0) {
          this.companySelect = this.companyInfo[0]['公司代號']
        }
      },
      'companySelect' () {
        const findCompany = this.companyInfo.find(data => data['公司代號'] === this.companySelect)
        this.analysisOpt.companyName = _.get(findCompany, '公司名稱')
        this.analysisOpt.companyNum = _.get(findCompany, '公司代號')
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
