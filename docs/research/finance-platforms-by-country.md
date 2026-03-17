# Yahoo Finance Alternatives — Argentina

Research: local financial data platforms as Yahoo Finance alternatives for Argentine market data.

---

## ARGENTINA

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

### Developer/Programmatic Access

**Primary (Centro de APIs)**
- URL: https://apihub.primary.com.ar
- Data: Historical and real-time market data, order routing
- API: Yes — REST/WebSocket and FIX protocol. Open-source connectors in Python, .NET, R, Java. Includes "reMarkets" simulation environment.
- Pricing: Paid (institutional/broker level)

**API Broker (Adcap)**
- URL: https://apibroker.com.ar
- Data: All BYMA-listed assets — stocks, bonds, letras, CEDEARs
- API: Yes — documented REST APIs with technical support
- Pricing: Paid (broker integration)

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

**BCRA (Central Bank) API** ⭐
- URL: https://www.bcra.gob.ar/en/central-bank-api-catalog/
- Data: Four APIs: (1) Principales Variables — monetary base, reserves, deposits, loans, interest rates, (2) Estadísticas Cambiarias — official exchange rates for all currencies, (3) Central de Deudores — credit situation, (4) Cheques Denunciados — reported checks.
- API: Yes — free, public, **no authentication required**. Part of BCRA Open Finance strategy.
- Pricing: **Free**

**CriptoYa**
- URL: https://criptoya.com | Docs: https://docs.criptoya.com
- Data: Crypto prices across Argentine exchanges (Buenbit, Lemon, Belo, Ripio), dólar blue, MEP, CCL, oficial, crypto dollar, riesgo país. Updates every 30 seconds.
- API: Yes — documented REST API
- Pricing: **Free**

**ArgentinaDatos**
- URL: https://argentinadatos.com
- Data: Dollar exchange rates (all types), interest rates, inflation (IPC), riesgo país, financial indices
- API: Yes — REST API, JSON
- Pricing: **Free**

### News Portals with Financial Data

**Ámbito Financiero** — ambito.com — the de facto reference for dólar blue quotes in Argentina. No API but widely scraped (DolarAPI, Bluelytics, etc. source from Ámbito).
**Infobae Economía** — financial section of major news portal. News only, not structured data.

---

## Summary: Best Free Options with APIs

| Platform | Free API | Data Scope |
|----------|----------|------------|
| **IOL** | Yes (25k calls/mo) | Stocks, bonds, options, currencies |
| **Bluelytics** | Yes (no auth) | Dollar exchange rates (blue, oficial, MEP, CCL) |
| **DolarApi.com** | Yes (no auth) | All dollar types |
| **BCRA** | Yes (no auth) | Reserves, rates, monetary data |
| **ArgentinaDatos** | Yes (no auth) | Dollar, inflation, riesgo país |
| **CriptoYa** | Yes | Crypto prices across AR exchanges |
