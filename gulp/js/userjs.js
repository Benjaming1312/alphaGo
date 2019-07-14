var env = true

function is (name) {
  return $(name).is(name)
}

/**
 * 左側縮合
 */
function toggleSide () {
  if (is('.min')) {
    $('header.head .col-sm-3.side').removeClass('min')
    $('aside.side.col-sm-3.col-xs-3').removeClass('min')
    $('article.col-sm-9.col-xs-12.main').removeClass('min')
    $('header.head .col-sm-9.nav').removeClass('min')
  }
  else {
    $('header.head .col-sm-3.side').addClass('min')
    $('aside.side.col-sm-3.col-xs-3').addClass('min')
    $('article.col-sm-9.col-xs-12.main').addClass('min')
    $('header.head .col-sm-9.nav').addClass('min')
  }
}

/**
 * 判斷左側當前路徑，並加上active class name
 */
function sideActive () {{
  const url = window.location.href
  let rlt = false

  // 數據圖表分析
  $('.side.panel-group p > a').each(function () {
    if (url.indexOf($(this).attr('href')) >= 0) {
      rlt = true
    }
  })

  if (!rlt) {
    $('.side.panel-group ul a').each(function () {
      if (url.indexOf($(this).attr('href')) >= 0) {
        if ($(window).width() > 768) {
          $(this).parents('.panel').find('p > a').click()
        }
        $(this).addClass('active')
      }
    })
  }
  else {
    $('.side.panel-group .panel').eq(2).find('p').addClass('active')
  }
}}

function hideLoading () {
  $('.main-loading').fadeOut(1000)
}

$(function () {
  if (env) {
    setTimeout(() => {
      hideLoading()
    }, 3000)
  }
  else {
    hideLoading()
  }

  sideActive() // 子選單自動打開

  // 左側縮合 addEventListener
  $('.toggle-side a').click(function () {
    toggleSide()
  })

  if ($(window).width() < 768) {
    toggleSide()

    // 備註放到最後面
    $('.row.wrapper').append(`<div class="col-xs-12 memoAppend"></div>`)
    $('.memo').appendTo('.memoAppend')
  }

})
