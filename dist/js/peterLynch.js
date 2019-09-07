const durDateStart = 24

const httpGetCfg = { // HTTP Get config
	baseURL: '',
	headers: {
		'Accept': 'application/json'
	},
	'validateStatus': function httpValidateStatus (status) {
		return (status >= 200 && status < 300) || (status === 404) // default is (status >= 200 && status < 300)
	}
}


$(function () {
	if (!is('#peterLynch')) {
		return
	}

	chartTheme.colors = ['#509de2'] // Set color
	Highcharts.setOptions(chartTheme)

	// 設定按鈕顏色
	barOpts.chart.resetZoomButton.theme.fill = '#1a72d3'
	barOpts.chart.resetZoomButton.theme.states.hover.style.color = barOpts.chart.resetZoomButton.theme.fill
	_.set(barOpts, 'tooltip.backgroundColor', '#1a72d3')

	const app = new Vue({
		el: '#peterLynch',
		data: {
			loading: false,
			notifying: false,
			category: [],
			druDate: [],
			selectChart: null,
			backTestRltColumns: [], // 回測結果統計表表頭
			dataSheetColumns: [], // 回測結果統計表表頭
			latestBuyColumns: [], // 最新買進條件股票表頭
			stopLossColumns: [], // 最新符合停利停損條件表頭
			latestSelect: '全部上市櫃股票', // 最新買進條件股票產業類別
			stopLossSelect: '全部上市櫃股票', // 最新符合停利停損條件產業類別
			notifyMsg: '資料讀取中，請稍後',
			notifyError: '資料錯誤，請洽工程人員',
			// 設定歷史數據分析條件
			setOpts: {
				company: '全部上市櫃股票', // 產業類別
				endTime: '2019-07-11', // 股票買進結束日期
				druTime: 24, // 股票最大持有期間
				stopCall: true, // 設定停損條件
				setPut: false, // 設定賣出條件
				setCall: false, // 達到買進條件，每月持續買進
				stopLoss: -20 // 停損報酬率
			},
			// 投資策略模型
			backTestRlt: null, // 回測結果統計表
			backTestDataSheet: null, // 回測結果資料表
			statisticalVerify: null, // 統計檢定
			investmentModelDataSource: [], // 圖表資料
			analyzeText: [], // 模型效果分析文字
			latestBuy: null, // 最新買進條件股票
			stopLossCondition: null, // 最新符合停利停損條件股票
			// DataTable
			latestTable: null, // 最新買進條件Table
			stopLossTable: null, // 最新符合停利停損條件Table
			backTestRltTable: null, // 回測結果統計表Table
			backTestDataSheetTable: null // 回測結果資料表Table
		},
		computed: {
			/* 圖表類型 */
			chartType () {
				if (this.investmentModelDataSource.length > 0) {
					const rlt = []
					this.investmentModelDataSource.forEach(data => {
						Object.keys(data).forEach(key => {
							// 買進年度為圖表X軸單位，需跳過
							if (key !== '買進年度') {
								rlt.push(key)
							}
						})
					})
					return [...new Set(rlt)]
				}
				else {
					return []
				}
			},
			/* 產業類別列表 */
			filterLatestSheet () {
				// 等畫面準備好，重新render dataTable
				this.$nextTick(() => {
					this.latestTable = $('#latestCategory .table').DataTable()
				})
				
				if (this.latestSelect === '全部上市櫃股票') {
					return this.latestBuy
				}
				else {
					return this.latestBuy.filter(data => data['產業類別'] === this.latestSelect)
				}
			},
			/* 最新符合停利停損條件列表 */
			filterStopLoss () {
				// 等畫面準備好，重新render dataTable
				this.$nextTick(() => {
					this.stopLossTable = $('#stopLossCategory .table').DataTable()
				})

				if (this.stopLossSelect === '全部上市櫃股票') {
					return this.stopLossCondition
				}
				else {
					return this.stopLossCondition.filter(data => data['產業類別'] === this.stopLossSelect)
				}
			}
		},
		methods: {
			/* 開始分析 */
			submit () {
				this.loading = true
				console.warn('send info', this.setOpts)

				const getBackTestRlt = this.getBackTestRlt() // 取得回測結果統計表
				const getBackTestDataSheet = this.getBackTestDataSheet() // 取得回測結果資料表
				const getStatisticalVerify = this.getStatisticalVerify() // 取得統計檢定
				const getInvestmentModelDataSource = this.getInvestmentModelDataSource() // 取得圖表資料
				const getAnalyzeText = this.getAnalyzeText() // 取得模型效果分析文字
				const getLatestBuy = this.getLatestBuy() // 取得最新買進條件股票
				const getStopLossCondition = this.getStopLossCondition() // 取得最新符合停利停損條件股票
				const getChartData = this.getChartData()
				Promise.all([
					getBackTestRlt,
					getBackTestDataSheet,
					getStatisticalVerify,
					getInvestmentModelDataSource,
					getAnalyzeText,
					getLatestBuy,
					getStopLossCondition,
					getChartData
				])
				 .then(() => {
					this.renderChart() // 畫Chart
					this.renderTable() // 畫圖表

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
							reject(e)
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
							reject(e)
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
							reject(e)
						})
				})
			},
			/* 取得圖表資料*/
			getInvestmentModelDataSource () {
				return new Promise((resolve, reject) => {
					httpGetCfg.baseURL = 'dist/data/strategyModel/investmentModelDataSource.json'
					const getData = axios.create(httpGetCfg)
					getData.get()
						.then(res => {
							this.investmentModelDataSource = res.data
							// Set default
							if (_.isNil(this.selectChart)) {
								this.selectChart = this.chartType[0]
							}
							resolve()
						})
						.catch(e => {
							console.warn('error', e.message)
							reject(e)
						})
				})
			},
			/* 取得模型效果分析文字*/
			getAnalyzeText () {
				return new Promise((resolve, reject) => {
					httpGetCfg.baseURL = 'dist/data/strategyModel/analyzeText.json'
					const getData = axios.create(httpGetCfg)
					getData.get()
						.then(res => {
							this.analyzeText = res.data.map(d => _.get(d, '文字敘述'))
							resolve()
						})
						.catch(e => {
							console.warn('error', e.message)
							reject(e)
						})
				})
			},
			/* 取得最新買進條件股票*/
			getLatestBuy () {
				return new Promise((resolve, reject) => {
					httpGetCfg.baseURL = 'dist/data/strategyModel/latestBuy.json'
					const getData = axios.create(httpGetCfg)
					getData.get()
						.then(res => {
							// Clear
							this.latestBuy = []
							this.latestBuyColumns = []

							// 準備title
							Object.keys(res.data[0]).forEach(key => {
								this.latestBuyColumns.push(key)
							})

							// 把多餘的field 刪掉
							res.data.forEach(data => {
								const newObj = {}
								this.latestBuyColumns.forEach(key => {
									newObj[key] = data[key]
								})
								this.latestBuy.push(newObj)
							})

							resolve()
						})
						.catch(e => {
							console.warn('error', e.message)
							reject(e)
						})
				})
			},
			/* 取得最新符合停利停損條件股票*/
			getStopLossCondition () {
				return new Promise((resolve, reject) => {
				
					httpGetCfg.baseURL = 'dist/data/strategyModel/stopLossCondition.json'
					const getData = axios.create(httpGetCfg)
					getData.get()
						.then(res => {
							// Clear
							this.stopLossCondition = []
							this.stopLossColumns = []

							// 準備title
							Object.keys(res.data[0]).forEach(key => {
								this.stopLossColumns.push(key)
							})

							// 把多餘的field 刪掉
							res.data.forEach(data => {
								const newObj = {}
								this.stopLossColumns.forEach(key => {
									newObj[key] = data[key]
								})
								this.stopLossCondition.push(newObj)
							})

							resolve()
						})
						.catch(e => {
							console.warn('error', e.message)
							reject(e)
						})
				})
			},
			/* 取得圖表資料 */
			getChartData () {
				return new Promise((resolve, reject) => {
					// 取得圖表資料
					httpGetCfg.baseURL = 'dist/data/chartData/chartData.json'
					const getData1 = axios.create(httpGetCfg)
					const dataRlt1 = getData1.get()

					Promise.all([dataRlt1])
						.then(rlt => {
							this.chartData = rlt[0].data
							resolve()
						})
						.catch(e => {
							reject(e)
						})
				})
			},
			/* 畫圖表 */
			renderChart () {
				if (this.investmentModelDataSource.length === 0) {
					return
				}

				const chartOptions = _.cloneDeep(barOpts)

				// 檢查資料是否有符合的圖表
				if (_.isNil(_.get(this.investmentModelDataSource[0], this.selectChart))) {
					return
				}

				// 設定類型
				const category = '買進年度'
				chartOptions.xAxis.categories = null

				// 設定圖表資料
				chartOptions.series = [{
					name: null,
					data: [],
					showInLegend: false
				}]

				// 塞資料
				this.investmentModelDataSource.forEach(data => {
					chartOptions.series[0].data.push([
						data[category],
						data[this.selectChart]
					])
				})

				// 排序年度
				chartOptions.series[0].data.sort((a, b) => a[0] - b[0])

				var myChart = Highcharts.chart('chartContent', chartOptions)
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
			selectChart () {
				this.renderChart()
			},
			latestSelect () {
				if (!_.isNil(this.latestTable)) {
					this.latestTable.destroy()
				}
			},
			stopLossSelect () {
				if (!_.isNil(this.stopLossTable)) {
					this.stopLossTable.destroy()
				}
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

		},
	})
})
