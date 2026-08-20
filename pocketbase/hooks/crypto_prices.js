// Hook de cotações automáticas e sob demanda de investimentos
// Integra Binance (cripto), Brapi (Ações/FIIs/ETFs/BDRs) e Banco Central do Brasil (Indicadores CDI, IPCA, Dólar, Euro)

// 1. Cron horário para criptomoedas e indicadores
cronAdd('crypto_prices', '@hourly', () => {
  try {
    const cryptoInvestments = $app.findRecordsByFilter(
      'investments',
      "type = 'bitcoin' || type = 'ethereum' || type = 'cripto_alt' || category_group = 'cripto'",
      '',
      500,
      0,
    )

    // Símbolos suportados na Binance
    const binanceSymbols = {
      BTC: 'BTCBRL',
      ETH: 'ETHBRL',
      USDT: 'USDTBRL',
      SOL: 'SOLBRL',
      DOGE: 'DOGEBRL',
      ADA: 'ADABRL',
      DOT: 'DOTBRL',
      LINK: 'LINKBRL',
      AVAX: 'AVAXBRL',
      MATIC: 'MATICBRL',
      POL: 'POLBRL',
      UNI: 'UNIBRL',
      ATOM: 'ATOMBRL',
      XRP: 'XRPBRL',
      LTC: 'LTCBRL',
      BNB: 'BNBBRL',
    }

    const pricesBRL = {}

    // Busca cotações Binance
    for (const [coin, sym] of Object.entries(binanceSymbols)) {
      try {
        const res = $http.send({
          url: 'https://api.binance.com/api/v3/ticker/price?symbol=' + sym,
          method: 'GET',
          timeout: 6,
        })
        if (res.statusCode === 200 && res.json && res.json.price) {
          pricesBRL[coin] = parseFloat(res.json.price)
        } else {
          // Fallback USDT * 5.70
          const resUsdt = $http.send({
            url: 'https://api.binance.com/api/v3/ticker/price?symbol=' + coin + 'USDT',
            method: 'GET',
            timeout: 6,
          })
          if (resUsdt.statusCode === 200 && resUsdt.json && resUsdt.json.price) {
            pricesBRL[coin] = parseFloat(resUsdt.json.price) * 5.7
          }
        }
      } catch (_) {}
    }

    const nowIso = new Date().toISOString()

    for (let i = 0; i < cryptoInvestments.length; i++) {
      const inv = cryptoInvestments[i]
      const type = inv.getString('type')
      const sym = (inv.getString('symbol') || '').toUpperCase().trim()

      let price = 0
      if (type === 'bitcoin' || sym === 'BTC' || sym === 'BITCOIN') {
        price = pricesBRL['BTC'] || 0
      } else if (type === 'ethereum' || sym === 'ETH' || sym === 'ETHEREUM') {
        price = pricesBRL['ETH'] || 0
      } else if (pricesBRL[sym]) {
        price = pricesBRL[sym]
      }

      if (price > 0) {
        inv.set('current_price', price)
        inv.set('last_price_update', nowIso)
        $app.save(inv)
      }
    }
  } catch (err) {
    console.warn('Erro cron crypto_prices:', err)
  }
})

// 2. Cron diário para Ações, FIIs, BDRs, ETFs (Brapi API às 18h no horário de Brasília / 21h UTC)
cronAdd('stock_prices', '0 21 * * 1-5', () => {
  try {
    const stockInvestments = $app.findRecordsByFilter(
      'investments',
      "type = 'acao' || type = 'fii' || type = 'etf' || type = 'bdr' || type = 'fiagro' || category_group = 'renda_variavel'",
      '',
      500,
      0,
    )

    if (stockInvestments.length === 0) return

    // Agrupa símbolos válidos únicos
    const symbolsSet = {}
    for (let i = 0; i < stockInvestments.length; i++) {
      const s = (stockInvestments[i].getString('symbol') || '').toUpperCase().trim()
      if (s && s.length >= 3) {
        symbolsSet[s] = true
      }
    }

    const symbolList = Object.keys(symbolsSet)
    if (symbolList.length === 0) return

    const brapiKey = $secrets.get('BRAPI_API_KEY') || $os.getenv('BRAPI_API_KEY') || ''
    const nowIso = new Date().toISOString()

    // Processa em lotes de no máximo 20 símbolos
    const chunkSize = 20
    for (let i = 0; i < symbolList.length; i += chunkSize) {
      const chunk = symbolList.slice(i, i + chunkSize)
      const symbolsParam = chunk.join(',')
      let url = 'https://brapi.dev/api/quote/' + encodeURIComponent(symbolsParam)
      if (brapiKey) {
        url += '?token=' + encodeURIComponent(brapiKey)
      }

      try {
        const res = $http.send({
          url: url,
          method: 'GET',
          timeout: 10,
        })

        if (res.statusCode === 200 && res.json && res.json.results) {
          const results = res.json.results
          const priceMap = {}
          for (let j = 0; j < results.length; j++) {
            const item = results[j]
            if (item.symbol && typeof item.regularMarketPrice === 'number') {
              priceMap[item.symbol.toUpperCase()] = item.regularMarketPrice
            }
          }

          // Atualiza registros correspondentes
          for (let k = 0; k < stockInvestments.length; k++) {
            const inv = stockInvestments[k]
            const sym = (inv.getString('symbol') || '').toUpperCase().trim()
            if (priceMap[sym]) {
              inv.set('current_price', priceMap[sym])
              inv.set('last_price_update', nowIso)
              $app.save(inv)
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar Brapi batch:', err)
      }
    }
  } catch (err) {
    console.warn('Erro cron stock_prices:', err)
  }
})

// 3. Endpoint POST /backend/v1/investments/refresh-crypto (compatibilidade mantida)
routerAdd(
  'POST',
  '/backend/v1/investments/refresh-crypto',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      let btcPriceBRL = 0
      let ethPriceBRL = 0

      try {
        const btcRes = $http.send({
          url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL',
          method: 'GET',
          timeout: 8,
        })
        if (btcRes.statusCode === 200 && btcRes.json && btcRes.json.price) {
          btcPriceBRL = parseFloat(btcRes.json.price)
        } else {
          const btcUsdtRes = $http.send({
            url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
            method: 'GET',
            timeout: 8,
          })
          if (btcUsdtRes.statusCode === 200 && btcUsdtRes.json && btcUsdtRes.json.price) {
            btcPriceBRL = parseFloat(btcUsdtRes.json.price) * 5.7
          }
        }
      } catch (_) {}

      try {
        const ethRes = $http.send({
          url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHBRL',
          method: 'GET',
          timeout: 8,
        })
        if (ethRes.statusCode === 200 && ethRes.json && ethRes.json.price) {
          ethPriceBRL = parseFloat(ethRes.json.price)
        } else {
          const ethUsdtRes = $http.send({
            url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
            method: 'GET',
            timeout: 8,
          })
          if (ethUsdtRes.statusCode === 200 && ethUsdtRes.json && ethUsdtRes.json.price) {
            ethPriceBRL = parseFloat(ethUsdtRes.json.price) * 5.7
          }
        }
      } catch (_) {}

      const cryptoInvestments = $app.findRecordsByFilter(
        'investments',
        "user = '" + userId + "' && (type = 'bitcoin' || type = 'ethereum' || type = 'cripto_alt')",
        '',
        100,
        0,
      )

      const nowIso = new Date().toISOString()
      for (let i = 0; i < cryptoInvestments.length; i++) {
        const inv = cryptoInvestments[i]
        const type = inv.getString('type')
        const sym = (inv.getString('symbol') || '').toUpperCase().trim()

        if ((type === 'bitcoin' || sym === 'BTC') && btcPriceBRL > 0) {
          inv.set('current_price', btcPriceBRL)
          inv.set('last_price_update', nowIso)
          $app.save(inv)
        } else if ((type === 'ethereum' || sym === 'ETH') && ethPriceBRL > 0) {
          inv.set('current_price', ethPriceBRL)
          inv.set('last_price_update', nowIso)
          $app.save(inv)
        }
      }

      return e.json(200, {
        btc: btcPriceBRL,
        eth: ethPriceBRL,
        updated_at: nowIso,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao atualizar cotações de cripto' })
    }
  },
  $apis.requireAuth(),
)

// 4. Endpoint POST /backend/v1/investments/refresh-prices (NOVO — atualiza todos os tipos)
routerAdd(
  'POST',
  '/backend/v1/investments/refresh-prices',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const userInvestments = $app.findRecordsByFilter(
        'investments',
        "user = '" + userId + "'",
        '',
        300,
        0,
      )

      let updatedCount = 0
      let failedCount = 0

      // 4.1 Criptos
      const cryptoPrices = {}
      const binanceCoins = [
        'BTC',
        'ETH',
        'USDT',
        'SOL',
        'DOGE',
        'ADA',
        'DOT',
        'LINK',
        'AVAX',
        'MATIC',
        'POL',
        'UNI',
        'ATOM',
        'XRP',
        'LTC',
        'BNB',
      ]

      for (let i = 0; i < binanceCoins.length; i++) {
        const coin = binanceCoins[i]
        try {
          const res = $http.send({
            url: 'https://api.binance.com/api/v3/ticker/price?symbol=' + coin + 'BRL',
            method: 'GET',
            timeout: 6,
          })
          if (res.statusCode === 200 && res.json && res.json.price) {
            cryptoPrices[coin] = parseFloat(res.json.price)
          } else {
            const resUsdt = $http.send({
              url: 'https://api.binance.com/api/v3/ticker/price?symbol=' + coin + 'USDT',
              method: 'GET',
              timeout: 6,
            })
            if (resUsdt.statusCode === 200 && resUsdt.json && resUsdt.json.price) {
              cryptoPrices[coin] = parseFloat(resUsdt.json.price) * 5.7
            }
          }
        } catch (_) {}
      }

      // 4.2 Indicadores BCB
      const indicators = {
        cdi: 13.65,
        ipca: 0.42,
        dolar: 5.75,
        euro: 6.15,
      }

      try {
        const cdiRes = $http.send({
          url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',
          method: 'GET',
          timeout: 6,
        })
        if (cdiRes.statusCode === 200 && cdiRes.json && cdiRes.json.length > 0) {
          const val = parseFloat(cdiRes.json[0].valor)
          if (!isNaN(val) && val > 0) indicators.cdi = val > 5 ? val : 13.65
        }
      } catch (_) {}

      try {
        const ipcaRes = $http.send({
          url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json',
          method: 'GET',
          timeout: 6,
        })
        if (ipcaRes.statusCode === 200 && ipcaRes.json && ipcaRes.json.length > 0) {
          const val = parseFloat(ipcaRes.json[0].valor)
          if (!isNaN(val)) indicators.ipca = val
        }
      } catch (_) {}

      try {
        const usdRes = $http.send({
          url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json',
          method: 'GET',
          timeout: 6,
        })
        if (usdRes.statusCode === 200 && usdRes.json && usdRes.json.length > 0) {
          const val = parseFloat(usdRes.json[0].valor)
          if (!isNaN(val) && val > 0) indicators.dolar = val
        }
      } catch (_) {}

      try {
        const eurRes = $http.send({
          url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.21619/dados/ultimos/1?formato=json',
          method: 'GET',
          timeout: 6,
        })
        if (eurRes.statusCode === 200 && eurRes.json && eurRes.json.length > 0) {
          const val = parseFloat(eurRes.json[0].valor)
          if (!isNaN(val) && val > 0) indicators.euro = val
        }
      } catch (_) {}

      // 4.3 Ações/FIIs via Brapi
      const stockSymbols = []
      for (let i = 0; i < userInvestments.length; i++) {
        const inv = userInvestments[i]
        const type = inv.getString('type')
        const group = inv.getString('category_group')
        const sym = (inv.getString('symbol') || '').toUpperCase().trim()
        if (
          (type === 'acao' ||
            type === 'fii' ||
            type === 'etf' ||
            type === 'bdr' ||
            type === 'fiagro' ||
            group === 'renda_variavel') &&
          sym.length >= 3 &&
          !stockSymbols.includes(sym)
        ) {
          stockSymbols.push(sym)
        }
      }

      const stockPriceMap = {}
      if (stockSymbols.length > 0) {
        const brapiKey = $secrets.get('BRAPI_API_KEY') || $os.getenv('BRAPI_API_KEY') || ''
        const chunkSize = 20
        for (let i = 0; i < stockSymbols.length; i += chunkSize) {
          const chunk = stockSymbols.slice(i, i + chunkSize)
          let url = 'https://brapi.dev/api/quote/' + encodeURIComponent(chunk.join(','))
          if (brapiKey) url += '?token=' + encodeURIComponent(brapiKey)

          try {
            const res = $http.send({ url: url, method: 'GET', timeout: 8 })
            if (res.statusCode === 200 && res.json && res.json.results) {
              const resList = res.json.results
              for (let j = 0; j < resList.length; j++) {
                const item = resList[j]
                if (item.symbol && typeof item.regularMarketPrice === 'number') {
                  stockPriceMap[item.symbol.toUpperCase()] = item.regularMarketPrice
                }
              }
            }
          } catch (err) {
            console.warn('Brapi request failed in refresh-prices:', err)
          }
        }
      }

      // 4.4 Atualiza os registros do usuário
      const nowIso = new Date().toISOString()
      for (let i = 0; i < userInvestments.length; i++) {
        const inv = userInvestments[i]
        const type = inv.getString('type')
        const sym = (inv.getString('symbol') || '').toUpperCase().trim()

        let newPrice = 0
        let handled = false

        if (type === 'bitcoin' || sym === 'BTC' || sym === 'BITCOIN') {
          newPrice = cryptoPrices['BTC'] || 0
          handled = true
        } else if (type === 'ethereum' || sym === 'ETH' || sym === 'ETHEREUM') {
          newPrice = cryptoPrices['ETH'] || 0
          handled = true
        } else if (cryptoPrices[sym]) {
          newPrice = cryptoPrices[sym]
          handled = true
        } else if (stockPriceMap[sym]) {
          newPrice = stockPriceMap[sym]
          handled = true
        } else if (type === 'dolar' || sym === 'USD') {
          newPrice = indicators.dolar
          handled = true
        } else if (type === 'euro' || sym === 'EUR') {
          newPrice = indicators.euro
          handled = true
        }

        if (handled) {
          if (newPrice > 0) {
            inv.set('current_price', newPrice)
            inv.set('last_price_update', nowIso)
            try {
              $app.save(inv)
              updatedCount++
            } catch (_) {
              failedCount++
            }
          } else {
            // Se API offline/não encontrou preço, NÃO zera o preço atual
            failedCount++
          }
        }
      }

      return e.json(200, {
        updated: updatedCount,
        failed: failedCount,
        crypto: {
          btc: cryptoPrices['BTC'] || null,
          eth: cryptoPrices['ETH'] || null,
        },
        indicators: {
          cdi: indicators.cdi,
          ipca: indicators.ipca,
          dolar: indicators.dolar,
          euro: indicators.euro,
        },
        timestamp: nowIso,
      })
    } catch (err) {
      console.warn('Erro refresh-prices:', err)
      return e.json(500, {
        error: err.message || 'Erro ao atualizar cotações de investimentos',
      })
    }
  },
  $apis.requireAuth(),
)
