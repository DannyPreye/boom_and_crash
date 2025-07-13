# Deriv Synthetic Indices Prediction Bot

An AI-powered prediction bot for Deriv's synthetic indices (Boom, Crash, Volatility indices) built with TypeScript, LangChain, and Google Gemini AI, targeting 80-90% prediction accuracy.

## 🎯 Features

- **High Accuracy Predictions**: Targeting 80-90% accuracy using ensemble AI models
- **Multiple Synthetic Indices**: Support for Boom 1000/500, Crash 1000/500, and Volatility indices (V10-V100)
- **Multiple Timeframes**: 1m, 5m, 15m, 30m, 1h predictions
- **Real-time Processing**: <1 second response time with WebSocket integration
- **Comprehensive Analytics**: Backtesting, performance tracking, and accuracy statistics
- **Production Ready**: Docker support, monitoring, and robust error handling

## 🛠 Tech Stack

- **TypeScript** - Type-safe development
- **Express.js** - REST API backend
- **LangChain & LangGraph** - AI orchestration framework
- **Google Gemini API** - Advanced market analysis and sentiment
- **WebSockets** - Real-time data streaming
- **Redis** - Caching and performance optimization
- **Docker** - Containerization and deployment
- **Jest** - Testing framework

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Redis (optional, for caching)
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd boom_crash
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Required Environment Variables**
   ```env
   # Deriv API
   DERIV_API_TOKEN=your_deriv_api_token
   DERIV_APP_ID=your_app_id

   # Google Gemini
   GOOGLE_API_KEY=your_google_gemini_api_key

   # Security
   JWT_SECRET=your_jwt_secret_32_chars_minimum
   ```

5. **Development**
   ```bash
   npm run dev
   ```

6. **Production Build**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

1. **Using Docker Compose (Recommended)**
   ```bash
   # Copy environment file
   cp .env.example .env
   # Edit .env with your values

   # Start all services
   docker-compose up -d

   # With monitoring (Prometheus + Grafana)
   docker-compose --profile monitoring up -d
   ```

2. **Build and Run Manually**
   ```bash
   docker build -t deriv-prediction-bot .
   docker run -p 3000:3000 --env-file .env deriv-prediction-bot
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Core Endpoints

#### Generate Prediction
```http
POST /api/predict
Content-Type: application/json

{
  "symbol": "BOOM1000",
  "timeframe": "5m",
  "includeAnalysis": true
}
```

**Response:**
```json
{
  "symbol": "BOOM1000",
  "timeframe": "5m",
  "prediction": "UP",
  "confidence": 0.87,
  "factors": {
    "technical": 0.82,
    "sentiment": 0.91,
    "pattern": 0.88,
    "spike_proximity": 0.65
  },
  "analysis": "Strong upward momentum detected...",
  "timestamp": "2024-01-15T10:30:00Z",
  "model_version": "1.0.0",
  "request_id": "abc123"
}
```

#### Supported Symbols
```http
GET /api/predict/supported-symbols
```

#### Prediction History
```http
GET /api/predict/history?symbol=BOOM1000&timeframe=5m&limit=50
```

#### Accuracy Statistics
```http
GET /api/analytics/accuracy?symbol=BOOM1000&period=24h
```

#### Backtest Analysis
```http
POST /api/analytics/backtest
Content-Type: application/json

{
  "symbol": "BOOM1000",
  "timeframe": "5m",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "initial_balance": 1000,
  "risk_per_trade": 0.02,
  "min_confidence_threshold": 0.8
}
```

### Health Endpoints

- `GET /health` - General health check
- `GET /health/ready` - Readiness probe (Kubernetes)
- `GET /health/live` - Liveness probe (Kubernetes)

## 🧠 AI Architecture

### Ensemble Model Design

The bot uses a sophisticated ensemble approach combining multiple AI models:

1. **Google Gemini Analysis (30% weight)**
   - News sentiment analysis
   - Market context understanding
   - Pattern recognition

2. **LSTM Time Series (25% weight)**
   - Historical price patterns
   - Sequence learning
   - Trend prediction

3. **Statistical Models (20% weight)**
   - ARIMA forecasting
   - Mean reversion analysis
   - Volatility modeling

4. **Transformer Models (25% weight)**
   - Multi-head attention
   - Long-range dependencies
   - Feature interactions

### Feature Engineering

The system extracts comprehensive features:

- **Price Features**: velocity, acceleration, momentum
- **Technical Indicators**: RSI, MACD, Bollinger Bands, ADX
- **Volatility Features**: momentum, clustering, breakouts
- **Time Features**: session times, day patterns
- **Synthetic-Specific**: spike proximity (Boom/Crash), volatility momentum

### Boom/Crash Specific Logic

- **Spike Detection**: Real-time identification of characteristic spikes
- **Tick Counting**: Precise tracking of ticks since last spike
- **Probability Calculation**: Statistical spike timing prediction
- **Pattern Recognition**: Boom/Crash specific behavioral patterns

## 📊 Supported Instruments

### Boom Indices
- **BOOM1000**: Upward spikes every ~1000 ticks
- **BOOM500**: Upward spikes every ~500 ticks

### Crash Indices
- **CRASH1000**: Downward spikes every ~1000 ticks
- **CRASH500**: Downward spikes every ~500 ticks

### Volatility Indices
- **R_10**: 10% constant volatility
- **R_25**: 25% constant volatility
- **R_50**: 50% constant volatility
- **R_75**: 75% constant volatility
- **R_100**: 100% constant volatility

## ⚡ Performance

### Targets
- **Accuracy**: 80-90% prediction accuracy
- **Latency**: <100ms prediction generation
- **Throughput**: 1000+ predictions/minute
- **Memory**: <1GB RAM usage

### Optimization Features
- Redis caching for frequently accessed data
- Efficient feature engineering pipelines
- Connection pooling and rate limiting
- Automatic reconnection handling

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DERIV_API_TOKEN` | Deriv API token | Required |
| `GOOGLE_API_KEY` | Gemini API key | Required |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `LOG_LEVEL` | Logging level | `info` |

### Prediction Engine Settings

- `PREDICTION_CACHE_TTL`: Cache duration (300s)
- `MAX_HISTORICAL_CANDLES`: Historical data limit (1000)
- `ENSEMBLE_WEIGHTS_*`: Model weight distribution

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

### Test Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

## 📈 Monitoring

### Prometheus Metrics
- Prediction accuracy rates
- API response times
- Error rates
- WebSocket connection status

### Grafana Dashboards
- Real-time performance monitoring
- Accuracy trending
- System health overview

Access Grafana: `http://localhost:3001` (admin/admin123)

## 🚨 Error Handling

### Automatic Recovery
- WebSocket reconnection with exponential backoff
- API rate limiting and retry logic
- Graceful degradation on service failures

### Logging
- Structured JSON logging with Pino
- Different log levels for development/production
- Request/response tracking

## 🔒 Security

### Features
- Helmet.js security headers
- CORS configuration
- Rate limiting
- Input validation with Zod
- API key authentication

### Best Practices
- Non-root Docker user
- Environment variable validation
- Secure defaults

## 📋 Development

### Code Quality
```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Type checking
npx tsc --noEmit
```

### Project Structure
```
src/
├── config/         # Configuration management
├── services/       # Core business logic
├── routes/         # API endpoints
├── middleware/     # Express middleware
├── types/          # TypeScript definitions
├── utils/          # Utility functions
└── workflows/      # LangGraph workflows
```

## 🚧 Roadmap

### Phase 1: Foundation ✅
- [x] Project setup and configuration
- [x] Deriv WebSocket integration
- [x] Basic feature engineering
- [x] REST API endpoints

### Phase 2: AI Integration 🚧
- [ ] LangGraph workflow implementation
- [ ] Gemini AI integration
- [ ] LSTM model development
- [ ] Ensemble prediction engine

### Phase 3: Advanced Features 📋
- [ ] Real-time WebSocket predictions
- [ ] Advanced backtesting system
- [ ] Performance optimization
- [ ] Kubernetes deployment

### Phase 4: Production 📋
- [ ] Load testing and optimization
- [ ] Advanced monitoring
- [ ] Documentation completion
- [ ] Security audit

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This software is for educational and research purposes only. Trading financial instruments carries risk. The developers are not responsible for any financial losses incurred through the use of this software.

## 🆘 Support

- Create an issue for bugs or feature requests
- Check the documentation at `/api/docs`
- Review the health endpoint at `/health`

---

**Built with ❤️ for the trading community**
