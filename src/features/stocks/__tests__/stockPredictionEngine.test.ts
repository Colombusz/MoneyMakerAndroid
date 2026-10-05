import { describe, it, expect } from 'vitest';
import {
  calculateLinearRegression,
  generateStockPrediction
} from '../stockPredictionEngine';
import { GlobalQuoteData, StockOverviewData, DailyPricePoint } from '../../../types/stocks';

describe('Android stockPredictionEngine', () => {
  it('computes linear regression parameters correctly', () => {
    const prices = [100, 102, 104, 106, 108];
    const { slope, intercept, rSquared } = calculateLinearRegression(prices);

    expect(slope).toBeCloseTo(2.0, 2);
    expect(intercept).toBeCloseTo(100.0, 2);
    expect(rSquared).toBeCloseTo(1.0, 2);
  });

  it('generates multi-factor prediction with 7D, 30D targets and catalysts', () => {
    const quote: GlobalQuoteData = {
      symbol: 'NVDA',
      open: 135.0,
      high: 138.0,
      low: 134.0,
      price: 137.45,
      volume: 52000000,
      latestTradingDay: '2026-10-02',
      previousClose: 134.9,
      change: 2.55,
      changePercent: '+1.89%',
      changePercentNum: 1.89
    };

    const overview: StockOverviewData = {
      symbol: 'NVDA',
      assetType: 'Common Stock',
      name: 'NVIDIA Corporation',
      description: 'Semiconductors and AI hardware',
      exchange: 'NASDAQ',
      currency: 'USD',
      country: 'USA',
      sector: 'TECHNOLOGY',
      industry: 'SEMICONDUCTORS',
      marketCapitalization: 3300000000000,
      peRatio: 52.0,
      pegRatio: 1.8,
      bookValue: 19.5,
      dividendPerShare: 0.16,
      dividendYield: 0.001,
      eps: 2.64,
      week52High: 145.0,
      week52Low: 75.0,
      movingAverage50: 128.0,
      movingAverage200: 110.0,
      analystTargetPrice: 155.0,
      analystRatingStrongBuy: 18,
      analystRatingBuy: 25,
      analystRatingHold: 4,
      analystRatingSell: 0,
      analystRatingStrongSell: 0
    };

    const history: DailyPricePoint[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-09-${(i + 1).toString().padStart(2, '0')}`,
      open: 120 + i * 0.5,
      high: 121 + i * 0.5,
      low: 119 + i * 0.5,
      close: 120.5 + i * 0.5,
      volume: 45000000
    }));

    const prediction = generateStockPrediction(quote, overview, history, []);

    expect(prediction.symbol).toBe('NVDA');
    expect(prediction.currentPrice).toBe(137.45);
    expect(prediction.verdict).toBe('STRONG BUY');
    expect(prediction.overallScore).toBeGreaterThanOrEqual(72);
    expect(prediction.confidencePercentage).toBeGreaterThanOrEqual(50);
    expect(prediction.target7Day.base).toBeGreaterThan(120);
    expect(prediction.target30Day.base).toBeGreaterThan(120);
    expect(prediction.catalysts.length).toBeGreaterThan(0);
    expect(prediction.technicalTrend.status).toBe('Bullish');
  });
});
