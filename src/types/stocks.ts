export interface GlobalQuoteData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  latestTradingDay: string;
  previousClose: number;
  change: number;
  changePercent: string;
  changePercentNum: number;
}

export interface StockOverviewData {
  symbol: string;
  assetType: string;
  name: string;
  description: string;
  exchange: string;
  currency: string;
  country: string;
  sector: string;
  industry: string;
  marketCapitalization: number;
  peRatio: number;
  pegRatio: number;
  bookValue: number;
  dividendPerShare: number;
  dividendYield: number;
  eps: number;
  week52High: number;
  week52Low: number;
  movingAverage50: number;
  movingAverage200: number;
  analystTargetPrice: number;
  analystRatingStrongBuy: number;
  analystRatingBuy: number;
  analystRatingHold: number;
  analystRatingSell: number;
  analystRatingStrongSell: number;
}

export interface DailyPricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TopMoverItem {
  ticker: string;
  price: number;
  changeAmount: number;
  changePercentage: number;
  volume: number;
}

export interface TopMoversResponse {
  lastUpdated: string;
  topGainers: TopMoverItem[];
  topLosers: TopMoverItem[];
  mostActivelyTraded: TopMoverItem[];
}

export interface NewsSentimentItem {
  title: string;
  url: string;
  timePublished: string;
  authors: string[];
  summary: string;
  source: string;
  overallSentimentScore: number;
  overallSentimentLabel: string;
  tickerSentimentLabel?: string;
  tickerSentimentScore?: number;
}

export interface SearchMatchItem {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  matchScore: number;
}

export type PredictionVerdict =
  | 'STRONG BUY'
  | 'BUY'
  | 'HOLD'
  | 'UNDERPERFORM'
  | 'STRONG SELL';

export interface StockPrediction {
  symbol: string;
  verdict: PredictionVerdict;
  overallScore: number; // 0 to 100
  confidencePercentage: number; // 0 to 100
  currentPrice: number;
  target7Day: {
    base: number;
    bull: number;
    bear: number;
    percentChange: number;
  };
  target30Day: {
    base: number;
    bull: number;
    bear: number;
    percentChange: number;
  };
  analystConsensus: {
    targetPrice: number;
    upsidePercent: number;
    consensusScore: number; // 1 to 5
    ratingLabel: string;
    totalRatings: number;
    buyPercent: number;
  };
  technicalTrend: {
    status: 'Bullish' | 'Neutral' | 'Bearish';
    score: number; // 0 to 100
    above50DayMA: boolean;
    above200DayMA: boolean;
    goldenCross: boolean;
    ma50: number;
    ma200: number;
  };
  linearRegressionTrend: {
    slopePerDay: number;
    direction: 'Upward' | 'Sideways' | 'Downward';
    rSquared: number;
    score: number; // 0 to 100
  };
  sentimentScore: {
    score: number; // 0 to 100
    label: string;
  };
  catalysts: string[];
  risks: string[];
}
