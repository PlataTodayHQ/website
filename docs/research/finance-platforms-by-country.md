# Yahoo Finance Alternatives by Country

Research: local financial data platforms in Argentina, Chile, Brazil, Thailand, Russia, South Korea, Japan.

---

## 1. ARGENTINA

### Stock Exchange / Official

**BYMA (Bolsas y Mercados Argentinos)**
- URL: https://www.byma.com.ar
- Data: Stocks, bonds, CEDEARs, options, negotiable obligations, ETFs
- API: Yes — BYMA APIs for market data (https://www.byma.com.ar/en/products/data-products/market-data/apis). Real-time snapshots + EOD. Migrating from Web Service to REST APIs.
- Pricing: Paid for institutional feeds; basic data viewable on website for free
- Data portal: https://www.bymadata.com.ar/

**Bolsar (BYMA's data portal)**
- URL: https://www.bolsar.info
- Data: Official trading data, real-time and delayed quotes for BYMA-listed instruments
- API: No public REST API; data viewable via web
- Pricing: Free (web portal)

**Matba Rofex (Derivatives exchange)**
- URL: https://www.matbarofex.com.ar
- Data: Futures, options, agricultural commodities, dollar futures
- API: Yes — Primary API / ReMarkets API for trading and market data
- Pricing: Free with broker account for trading API; market data fees apply

### Local Financial Data Aggregators / Retail Portals

**Rava Bursátil**
- URL: https://rava.com
- Data: Real-time quotes (stocks, bonds, options, CEDEARs), dólar MEP/CCL, country risk, charts
- API: No official public API (commonly scraped)
- Pricing: Free (web portal)

**IOL (InvertirOnline)**
- URL: https://www.invertironline.com
- API: https://www.invertironline.com/api
- Data: Real-time quotes, historical data for stocks, bonds, options, cauciones, futures, currencies
- API: Yes — REST API, JSON. **Free up to 25,000 calls/month**, then AR$500+IVA/month
- Pricing: Free tier + paid tiers

**Portfolio Personal (PPI)**
- URL: https://www.portfoliopersonal.com
- Data: Stocks, bonds, CEDEARs, mutual funds, market data
- API: Yes — for clients
- Pricing: Requires brokerage account

**Bull Market Brokers**
- URL: https://www.bullmarketbrokers.com
- Data: Stocks, bonds, options, CEDEARs
- API: Yes (for clients)
- Pricing: Requires brokerage account

### Specialized

**Bluelytics** (Dollar exchange rates)
- URL: https://bluelytics.com.ar
- Data: Blue dollar, official rate, MEP, CCL — aggregated from multiple sources
- API: Yes — **free REST API** (https://api.bluelytics.com.ar/v2/latest)
- Pricing: Free

**DolarApi.com**
- URL: https://dolarapi.com
- Data: All dollar types (blue, oficial, MEP, CCL, tarjeta, turista)
- API: Yes — free REST API (e.g. `GET /v1/dolares/blue`)
- Pricing: Free

**ArgentinaDatos API**
- Community-driven API with various Argentine financial indicators
- Pricing: Free

**BCRA (Central Bank) data**
- Various APIs for official exchange rates, monetary policy rates, reserves, CER, UVA indices
- Pricing: Free

### News Portals with Financial Data

**Ámbito Financiero** — ambito.com — dollar rates, financial news
**Infobae Economía** — financial section of major news portal

---

## 2. CHILE

### Stock Exchange / Official

**Bolsa de Santiago (Santiago Stock Exchange)**
- URL: https://www.bolsadesantiago.com
- Data: Stocks, bonds, investment funds, stock options, futures, gold/silver coins, USD
- API: Yes — **Brain Data API** (https://api-braindata.bolsadesantiago.com/nuestras-apis)
- Pricing: Paid (requires API key request)

### Central Bank / Regulators

**Banco Central de Chile — API BDE**
- URL: https://si3.bcentral.cl/estadisticas/principal1/web_services/index.htm
- Data: Exchange rates, interest rates, monetary aggregates, economic indicators (historical + current)
- API: Yes — REST API, JSON/XML. Code examples in Python, R, C#.
- Pricing: **Free**

**CMF (Comisión para el Mercado Financiero) — API CMF**
- URL: https://api.cmfchile.cl
- Data: Financial indicators, banking reports, fund data
- API: Yes — REST API, JSON/XML
- Pricing: **Free**

### Local Platforms

**Renta 4 Chile** — renta4.cl — broker, no public API
**queTalMiAfp** — AFP pension fund quota values, free API
**DolarApi.com (Chile)** — USD and other currencies in Chile, free API

### International with Chile coverage

**Twelve Data** — https://twelvedata.com/exchanges/XSGO — all Bolsa de Santiago symbols, free tier + paid

---

## 3. BRAZIL

### Stock Exchange / Official

**B3 (Brasil, Bolsa, Balcão)**
- URL: https://www.b3.com.br
- Data: Stocks, bonds, ETFs, derivatives, commodities, FX, indices (IBOVESPA, etc.)
- API: Yes — B3 Market Data Platform (Level 1, Level 2, delayed, EOD). Also UMDF protocol for real-time.
- Pricing: Paid (institutional pricing, expensive for individuals)
- Historical data available via FTP and UP2DATA

**CVM (Securities regulator) — Open Data**
- URL: https://dados.cvm.gov.br
- Data: Company filings, financial statements, fund data
- API: Yes — open data portal
- Pricing: **Free**

### Local Financial Data Aggregators / Retail Portals

**brapi.dev** ⭐
- URL: https://brapi.dev
- Data: Real-time quotes, OHLCV history, dividends, balance sheets, income statements, cash flow, fundamental indicators (P/L, P/VP, ROE) for 400+ B3 assets. Also currency conversion and inflation.
- API: Yes — REST API
- Pricing: **Free tier** + paid plans

**StatusInvest**
- URL: https://statusinvest.com.br
- Data: Stocks, FIIs (REITs), ETFs, BDRs — fundamental data, dividends, historical prices, comparative tools
- API: No official API (commonly scraped via web endpoints)
- Pricing: Free (web portal)

**Fundamentus**
- URL: https://www.fundamentus.com.br
- Data: Fundamental indicators for Brazilian stocks and FIIs (P/L, ROE, ROIC, DY, net profit, EBITDA)
- API: No official API. Python libraries: `pyFundamentus`, `fundamentus` on GitHub
- Pricing: Free (web portal)

**InfoMoney**
- URL: https://www.infomoney.com.br
- Data: Financial news, real-time market data, stock quotes, investment analysis
- Part of XP Inc. ecosystem
- API: No public API
- Pricing: Free (web portal, some premium content)

**Oceans14** — oceans14.com.br — stock screeners, fundamentals, dividends. Free, no API.

### Central Bank

**Banco Central do Brasil — SGS/OLINDA API**
- SGS: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados?formato=json`
- OLINDA: `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/`
- Data: Exchange rates (PTAX), interest rates (Selic), inflation, monetary aggregates
- API: Yes — REST API, JSON/XML/CSV
- Pricing: **Free, no authentication**

### Open Source

**b3-api-dados-historicos** — https://github.com/cvscarlos/b3-api-dados-historicos — B3 historical data API (self-hosted, free)

---

## 4. THAILAND

### Stock Exchange / Official

**SET (Stock Exchange of Thailand)**
- URL: https://www.set.or.th
- Data: Stocks (SET, mai), indices, trading data, company profiles, ESG data
- API: Yes — **SMART Marketplace** (https://www.set.or.th/en/services/connectivity-and-data/data/smart-marketplace)
- Pricing: Paid (contact SET)

**Settrade Open API** ⭐
- URL: https://developer.settrade.com/open-api/
- Data: Real-time stock and derivatives data, trading (order placement, account info), historical data
- API: Yes — REST API with Python SDK. Sandbox environment available.
- Pricing: **Free with a brokerage account** at a participating broker

**TFEX (Thailand Futures Exchange)**
- URL: https://www.tfex.co.th
- Data: Futures, options, SET50 index derivatives, single stock futures, gold futures
- API: Via EMAPI or FIX 5.0 SP2 (for trading members)
- Pricing: Institutional only

### Central Bank

**Bank of Thailand (BOT) APIs**
- URL: https://apiportal.bot.or.th
- Data: Exchange rates, interest rates, debt securities auction data (21 APIs)
- API: Yes — REST API
- Pricing: **Free**

### Local Platforms

**Jitta**
- URL: https://www.jitta.com
- Data: Stock analysis with proprietary "Jitta Score" and "Jitta Line" metrics for Thai and global stocks
- API: No public API
- Pricing: Free basic / paid premium

---

## 5. RUSSIA

### Stock Exchange / Official

**MOEX (Moscow Exchange)** ⭐
- URL: https://www.moex.com
- Data: Stocks, bonds, derivatives, FX, money market, indices (IMOEX, RTS)
- API: Yes — **ISS (Informational & Statistical Server)**
  - Base URL: `https://iss.moex.com/iss/`
  - Reference: `https://iss.moex.com/iss/reference/`
  - Formats: JSON, XML, CSV
  - **Free for delayed data, no authentication needed**
  - Real-time requires subscription
- Examples:
  - List stocks: `GET /iss/engines/stock/markets/shares/boards/TQBR/securities.json`
  - Sberbank quotes: `GET /iss/engines/stock/markets/shares/boards/TQBR/securities/SBER.json`
  - Historical: `GET /iss/history/engines/stock/markets/shares/boards/TQBR/securities/SBER.json`

### Broker APIs

**Tinkoff Invest API (T-Invest)**
- GitHub: https://github.com/Tim55667757/TKSBrokerAPI
- Data: Stocks, bonds, ETFs, currencies, futures on MOEX. Real-time quotes, portfolio, orders.
- API: Yes — REST and gRPC. Python SDK available.
- Pricing: **Free with Tinkoff brokerage account**

**Finam**
- URL: https://www.finam.ru
- Data: Historical OHLCV data for MOEX-listed securities, tick data
- API: Semi-official — export endpoint (export.finam.ru) for historical data downloads
- GitHub: https://github.com/ffeast/finam-export (Python client)
- Pricing: Free for historical data exports

### Community / News

**Smart-lab** — https://smart-lab.ru — community, analytics, bond tables, dividend calendars. No API. Free.
**РБК (RBC)** — https://rbc.ru — major business news/data portal
**Банки.ру** — https://banki.ru — banking/deposit rates, financial product comparisons

### Central Bank

**CBR (Central Bank of Russia)**
- Data: Official exchange rates, key rate, monetary statistics
- API: XML web service for exchange rates
- Pricing: Free

### Developer Libraries

- **apimoex** (Python) — wraps MOEX ISS API
- **moex-api** (JavaScript) — https://github.com/timmson/moex-api
- **rusquant** (R) — aggregates Finam, MOEX, Tinkoff sources

> ⚠️ Due to international sanctions since 2022, access to MOEX services and Russian broker APIs may be restricted from many countries.

---

## 6. SOUTH KOREA

### Stock Exchange / Official

**KRX (Korea Exchange)**
- URL: https://www.krx.co.kr
- Data portal: http://data.krx.co.kr
- Data: KOSPI, KOSDAQ, KONEX stocks, bonds, derivatives, ETFs, indices
- API: No official REST API. Data via web portal downloads (CSV/Excel).
- Pricing: Free (web portal)

### Regulator / Government APIs

**Open DART (FSS Electronic Disclosure)** ⭐
- URL: https://opendart.fss.or.kr
- Data: Corporate filings, financial statements, ownership data, audit reports for all Korean listed companies
- API: Yes — REST API with **free API key**
- Pricing: **Free**

**ECOS (Bank of Korea Economic Statistics System)**
- URL: https://ecos.bok.or.kr
- Data: Macro-economic data, interest rates, money supply, balance of payments
- API: Yes — REST API
- Pricing: **Free**

**Public Data Portal**
- URL: https://www.data.go.kr
- Data: Various government datasets including financial data
- API: Yes
- Pricing: Free

### Local Financial Data Portals

**Naver Finance** ⭐ (= Korean Yahoo Finance)
- URL: https://finance.naver.com
- Data: Real-time quotes, charts, company profiles, financial statements, news for KOSPI/KOSDAQ
- API: No official public API (extensively scraped by pykrx and FinanceDataReader)
- Pricing: Free (web portal). **South Korea's most popular finance portal.**

**Daum/Kakao Finance**
- URL: https://finance.daum.net
- Data: Stock quotes, charts, news, company data
- API: No official public API
- Pricing: Free (web portal)

### Developer Libraries (all free, open source)

**pykrx** (Python) ⭐
- URL: https://github.com/sharebook-kr/pykrx
- Data: Scrapes KRX and Naver for stock prices, trading volumes, fundamental data
- No API key required

**FinanceDataReader** (Python)
- URL: https://github.com/FinanceData/FinanceDataReader
- Data: KRX stocks (KOSPI, KOSDAQ, KONEX), global stocks, exchange rates, crypto
- Sources: KRX, Naver, Yahoo Finance, FRED
- No API key required

**OpenDartReader** (Python)
- URL: https://github.com/FinanceData/OpenDartReader
- Wrapper for Open DART API — financial statements, filings
- Requires free DART API key

### Commercial

**KIS (Korea Information Service)** — kisrating.com — corporate credit ratings, financial data. Paid.

---

## 7. JAPAN

### Stock Exchange / Official

**JPX (Japan Exchange Group) / TSE**
- URL: https://www.jpx.co.jp/english/
- Data: All TSE-listed stocks, indices (TOPIX, Nikkei 225, JPX-Nikkei 400), derivatives, bonds
- Pricing: Market data feeds are paid (institutional)

**J-Quants API** ⭐ (by JPX)
- URL: https://jpx-jquants.com/en
- Docs: https://www.jpx.co.jp/english/markets/other-data-services/j-quants-api/
- Data: Historical stock prices (OHLCV), financial statements, trading volumes, listed company info
- API: Yes — REST API. Python client library available.
- Pricing:
  - **Free**: 5 req/min, 2 years of data with 12-week delay
  - Light: ¥1,650/month
  - Standard: ¥3,300/month
  - Premium: ¥16,500/month
- Restriction: Personal use only. No redistribution or app building.

**JPX Data Catalog** — https://www.jpx.co.jp/english/markets/data-catalog/ — index of all JPX data products

### Disclosure Systems

**TDnet (Timely Disclosure Network)**
- URL: https://www.release.tdnet.info
- Data: Listed company disclosures and filings (earnings, material events)
- API: No public API
- Pricing: Free (web portal)

**EDINET (FSA Disclosure System)**
- URL: https://disclosure.edinet-fsa.go.jp
- Data: Securities reports, annual reports, quarterly reports (like SEC EDGAR)
- API: Yes — EDINET API for downloading XBRL filings
- Pricing: **Free**

### Local Financial Data Portals

**Yahoo Finance Japan** ⭐ (= Japanese Yahoo Finance, separate from US)
- URL: https://finance.yahoo.co.jp
- Data: Real-time quotes, charts, company profiles, financial data, news for TSE stocks
- API: No official public API (commonly scraped)
- Pricing: Free (web portal). **Japan's most popular retail finance portal.**

**Kabutan**
- URL: https://kabutan.jp
- Data: Company profiles, financial data, stock screening, news, earnings calendar
- API: No public API
- Pricing: Free (web, with premium features)

**Minkabu**
- URL: https://minkabu.jp
- Data: Financial community, stock data, analysis
- API: No public API
- Pricing: Free

**kabu.plus**
- URL: https://kabu.plus
- Data: CSV downloads of historical stock data for Japanese equities
- Pricing: Free tier + paid plans

### Developer Resources

**awesome-japan-finance-data** — https://github.com/ajtgjmdjp/awesome-japan-finance-data — curated list of open data sources, APIs, Python libraries

---

## Summary: Best Free Options with APIs

| Country | Best Free API | Data Scope |
|---------|--------------|------------|
| **Argentina** | IOL API (25k calls/mo free) + Bluelytics (FX) | Stocks, bonds, FX |
| **Chile** | Banco Central API (BDE) + CMF API | Economic data, financial indicators |
| **Brazil** | brapi.dev (free tier) + BCB SGS/OLINDA | Stocks, fundamentals, FX, inflation |
| **Thailand** | Settrade Open API (with broker) + BOT APIs | Stocks, derivatives, FX, rates |
| **Russia** | MOEX ISS (delayed, no auth) + Tinkoff API | Stocks, bonds, FX, derivatives |
| **South Korea** | Open DART (free key) + pykrx (no key) | Filings, stock prices, fundamentals |
| **Japan** | J-Quants API (free tier, 12-week delay) + EDINET | Stock prices, financials, filings |
