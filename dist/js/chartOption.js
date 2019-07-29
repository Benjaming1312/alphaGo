// Chart 外觀
const chartTheme = {
  lang: {
    resetZoom: '重置縮放'
  },
  colors: ['#a986ce'],
  chart: {
    borderColor: '#000000',
    borderWidth: 0,
    className: 'dark-container',
    plotBackgroundColor: 'rgba(255, 255, 255, .1)',
    plotBorderColor: '#CCCCCC',
    plotBorderWidth: 0
  },
  xAxis: {
    labels: {
      style: {
        color: '#3e3a39'
      }
    },
    gridLineColor: '#898989'
    // gridLineWidth: .25,
  },
  yAxis: {
    labels: {
      style: {
        color: '#3e3a39'
      }
    },
    gridLineColor: '#898989',
    gridLineWidth: .25
  },
  tooltip: {
    backgroundColor: '#a986ce',
    style: {
      color: '#FFFFFF'
    }
  },

  scrollbar: {
    barBackgroundColor: {
      linearGradient: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1
      },
      stops: [
        [0.4, '#888'],
        [0.6, '#555']
      ]
    },
    barBorderColor: '#fff',
    buttonArrowColor: '#fff',
    buttonBackgroundColor: {
      linearGradient: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1
      },
      stops: [
        [0.4, '#888'],
        [0.6, '#555']
      ]
    },
    buttonBorderColor: '#CCC',
    rifleColor: '#FFF',
    trackBackgroundColor: {
      linearGradient: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1
      },
      stops: [
        [0, '#000'],
        [1, '#333']
      ]
    },
    trackBorderColor: '#666'
  }
}


// Bar chart options
const barOpts = {
  chart: {
    type: 'column',
    scrollablePlotArea: {
      scrollPositionX: 1
    },
    zoomType: 'x',
    selectionMarkerFill: 'rgba(0,0,0, 0.2)',
    resetZoomButton: {
      // 按钮定位
      position:{
        align: 'right', // by default
        verticalAlign: 'top', // by default
        x: 0,
        y: 0
      },
      // 按钮样式
      theme: {
        fill: 'white',
        style: {
          color: 'white'
        },
        // stroke: 'silver',
        r: 0,
        states: {
          hover: {
            fill: 'white',
            style: {
              color: 'white'
            }
          }
        }
      }
    }
  },
  credits: {
    enabled: false
  },
  title: {
    text: null
  },
  xAxis: {
    categories: ['Apples', 'Bananas', 'Oranges']
  },
  yAxis: {
    title: null
  },
  plotOptions: {
    series: {
      pointPadding: 0,
      borderWidth: 0
    }
  },
  series: [{
    name: 'Jane',
    data: [1, 0, 4]
  }],
  tooltip: {
    formatter: function () {
      return '<b>' + this.point.y + '</b>'
    }
  }
}