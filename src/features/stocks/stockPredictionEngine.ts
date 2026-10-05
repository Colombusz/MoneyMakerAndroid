import {
  GlobalQuoteData,
  StockOverviewData,
  DailyPricePoint,
  NewsSentimentItem,
  StockPrediction,
  PredictionVerdict
} from '../../types/stocks';

export function calculateLinearRegression(prices: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  residualsStdDev: number;
} {
  const n = prices.length;
  if (n < 2) {
    return { slope: 0, intercept: prices[0] || 0, rSquared: 0, residualsStdDev: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = prices[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, rSquared: 0, residualsStdDev: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  let ssTotal = 0;
  let ssResiduals = 0;
  const meanY = sumY / n;

  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    const actual = prices[i];
    ssTotal += Math.pow(actual - meanY, 2);
    ssResiduals += Math.pow(actual - predicted, 2);
  }

  const rSquared = ssTotal > 0 ? Math.max(0, Math.min(1, 1 - ssResiduals / ssTotal)) : 0;
  const residualsStdDev = Math.sqrt(ssResiduals / Math.max(1, n - 2));

  return { slope, intercept, rSquared, residualsStdDev };
}

export function generateStockPrediction(
  quote: GlobalQuoteData,
  overview: StockOverviewData | null,
  history: DailyPricePoint[],
  news: NewsSentimentItem[] = []
): StockPrediction {
  const currentPrice = quote.price > 0 ? quote.price : 100;
  const catalysts: string[] = [];
  const risks: string[] = [];

  // 1. Technical Moving Average Analysis
  const ma50 = overview?.movingAverage50 || (history.length >= 50 ? history.slice(-50).reduce((a, b) => a + b.close, 0) / 50 : currentPrice);
  const ma200 = overview?.movingAverage200 || (history.length >= 100 ? history.slice(-100).reduce((a, b) => a + b.close, 0) / 100 : currentPrice * 0.95);

  const above50DayMA = currentPrice > ma50;
  const above200DayMA = currentPrice > ma200;
  const goldenCross = ma50 > ma200;

  let technicalScore = 50;
  if (above50DayMA && above200DayMA && goldenCross) {
    technicalScore = 90;
    catalysts.push(`Price is trading above both 50-day ($${ma50.toFixed(2)}) and 200-day ($${ma200.toFixed(2)}) moving averages in a Golden Cross alignment.`);
  } else if (above50DayMA && above200DayMA) {
    technicalScore = 75;
    catalysts.push(`Stock is in an active medium-term uptrend above both key moving averages.`);
  } else if (above50DayMA && !above200DayMA) {
    technicalScore = 58;
    catalysts.push(`Short-term recovery above 50-day MA ($${ma50.toFixed(2)}), approaching 200-day resistance ($${ma200.toFixed(2)}).`);
  } else if (!above50DayMA && above200DayMA) {
    technicalScore = 48;
    risks.push(`Short-term pullback below 50-day MA ($${ma50.toFixed(2)}), test of 200-day support ($${ma200.toFixed(2)}) in progress.`);
  } else {
    technicalScore = 25;
    risks.push(`Trading below both 50-day ($${ma50.toFixed(2)}) and 200-day ($${ma200.toFixed(2)}) moving averages in a bearish Death Cross pattern.`);
  }

  const technicalStatus: 'Bullish' | 'Neutral' | 'Bearish' =
    technicalScore >= 65 ? 'Bullish' : technicalScore >= 45 ? 'Neutral' : 'Bearish';

  // 2. Linear Regression & Momentum Trend
  const recentPrices = history.length > 0 ? history.slice(-30).map((h) => h.close) : [currentPrice];
  const { slope, intercept, rSquared, residualsStdDev } = calculateLinearRegression(recentPrices);

  const n = recentPrices.length;
  const slopePercentPerDay = currentPrice > 0 ? (slope / currentPrice) * 100 : 0;
  let regressionScore = 50;

  if (slopePercentPerDay > 0.3) {
    regressionScore = Math.min(95, 70 + slopePercentPerDay * 20);
    catalysts.push(`Linear momentum shows strong upward trajectory with daily slope of +${slope.toFixed(2)}/day.`);
  } else if (slopePercentPerDay > 0.05) {
    regressionScore = 65;
    catalysts.push(`Steady positive price trajectory over the last 30 trading sessions.`);
  } else if (slopePercentPerDay >= -0.05) {
    regressionScore = 50;
  } else if (slopePercentPerDay >= -0.3) {
    regressionScore = 38;
    risks.push(`Slight downward price trajectory over recent trading sessions.`);
  } else {
    regressionScore = Math.max(10, 30 + slopePercentPerDay * 20);
    risks.push(`Steep downward momentum slope (-$${Math.abs(slope).toFixed(2)}/day).`);
  }

  const regressionDirection: 'Upward' | 'Sideways' | 'Downward' =
    slopePercentPerDay > 0.05 ? 'Upward' : slopePercentPerDay < -0.05 ? 'Downward' : 'Sideways';

  // Projections using regression + volatility band
  const future7Base = Math.max(1, slope * (n + 7) + intercept);
  const future30Base = Math.max(1, slope * (n + 30) + intercept);
  const bandMultiplier7 = Math.max(residualsStdDev * 1.2, currentPrice * 0.025);
  const bandMultiplier30 = Math.max(residualsStdDev * 2.2, currentPrice * 0.06);

  const target7Day = {
    base: Number(future7Base.toFixed(2)),
    bull: Number((future7Base + bandMultiplier7).toFixed(2)),
    bear: Number(Math.max(1, future7Base - bandMultiplier7).toFixed(2)),
    percentChange: Number((((future7Base - currentPrice) / currentPrice) * 100).toFixed(2))
  };

  const target30Day = {
    base: Number(future30Base.toFixed(2)),
    bull: Number((future30Base + bandMultiplier30).toFixed(2)),
    bear: Number(Math.max(1, future30Base - bandMultiplier30).toFixed(2)),
    percentChange: Number((((future30Base - currentPrice) / currentPrice) * 100).toFixed(2))
  };

  // 3. Wall Street Analyst Consensus & Price Target
  let analystScore = 50;
  let targetPrice = overview?.analystTargetPrice || currentPrice;
  let consensusScore = 3.0;
  let ratingLabel = 'Hold / Neutral';
  let buyPercent = 50;
  let totalRatings = 0;

  if (overview) {
    const sBuy = overview.analystRatingStrongBuy || 0;
    const buy = overview.analystRatingBuy || 0;
    const hold = overview.analystRatingHold || 0;
    const sell = overview.analystRatingSell || 0;
    const sSell = overview.analystRatingStrongSell || 0;
    totalRatings = sBuy + buy + hold + sell + sSell;

    if (totalRatings > 0) {
      consensusScore = (sBuy * 5 + buy * 4 + hold * 3 + sell * 2 + sSell * 1) / totalRatings;
      buyPercent = Math.round(((sBuy + buy) / totalRatings) * 100);

      if (consensusScore >= 4.2) ratingLabel = 'Strong Buy';
      else if (consensusScore >= 3.6) ratingLabel = 'Moderate Buy';
      else if (consensusScore >= 2.8) ratingLabel = 'Hold';
      else if (consensusScore >= 2.0) ratingLabel = 'Moderate Sell';
      else ratingLabel = 'Strong Sell';
    }

    if (overview.analystTargetPrice > 0) {
      targetPrice = overview.analystTargetPrice;
    }
  }

  const upsidePercent = Number((((targetPrice - currentPrice) / currentPrice) * 100).toFixed(2));

  if (upsidePercent > 15 && consensusScore >= 3.5) {
    analystScore = Math.min(95, 70 + upsidePercent * 0.8);
    catalysts.push(`Wall Street analysts project +${upsidePercent.toFixed(1)}% upside target ($${targetPrice.toFixed(2)}) with ${buyPercent}% buy consensus.`);
  } else if (upsidePercent > 0) {
    analystScore = 60 + Math.min(20, upsidePercent);
    catalysts.push(`Analyst 12-month median target ($${targetPrice.toFixed(2)}) represents positive upside.`);
  } else if (upsidePercent < -10) {
    analystScore = Math.max(15, 40 + upsidePercent);
    risks.push(`Current price exceeds Wall Street median target ($${targetPrice.toFixed(2)}) by ${Math.abs(upsidePercent).toFixed(1)}%.`);
  }

  // Valuation metrics
  if (overview && overview.peRatio > 0) {
    if (overview.peRatio > 65) {
      risks.push(`High P/E multiple (${overview.peRatio.toFixed(1)}x) suggests premium valuation vulnerable to earnings misses.`);
    } else if (overview.peRatio < 20 && overview.peRatio > 5) {
      catalysts.push(`Attractive valuation with P/E ratio of ${overview.peRatio.toFixed(1)}x.`);
    }
  }

  // 4. News Sentiment Score
  let sentimentNum = 50;
  let sentimentLabel = 'Neutral';

  if (news.length > 0) {
    const scores = news
      .map((n) => (n.tickerSentimentScore !== undefined ? n.tickerSentimentScore : n.overallSentimentScore))
      .filter((s) => typeof s === 'number');

    if (scores.length > 0) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      sentimentNum = Math.max(0, Math.min(100, Math.round((avgScore + 0.5) * 100)));

      if (avgScore >= 0.2) {
        sentimentLabel = 'Bullish';
        catalysts.push(`Financial media headlines reflect Bullish market sentiment (Score: +${avgScore.toFixed(2)}).`);
      } else if (avgScore <= -0.2) {
        sentimentLabel = 'Bearish';
        risks.push(`Recent news coverage reflects Bearish negative sentiment (Score: ${avgScore.toFixed(2)}).`);
      } else {
        sentimentLabel = 'Neutral';
      }
    }
  }

  if (catalysts.length === 0) {
    catalysts.push(`Solid trading liquidity with daily volume of ${(quote.volume / 1000000).toFixed(1)}M shares.`);
  }
  if (risks.length === 0) {
    risks.push(`Market volatility and interest rate shifts may impact broad equity valuations.`);
  }

  // 5. Synthesis & Composite Verdict
  const overallScore = Math.round(
    analystScore * 0.3 +
    technicalScore * 0.25 +
    regressionScore * 0.25 +
    sentimentNum * 0.2
  );

  let verdict: PredictionVerdict;
  if (overallScore >= 72) {
    verdict = 'STRONG BUY';
  } else if (overallScore >= 56) {
    verdict = 'BUY';
  } else if (overallScore >= 44) {
    verdict = 'HOLD';
  } else if (overallScore >= 30) {
    verdict = 'UNDERPERFORM';
  } else {
    verdict = 'STRONG SELL';
  }

  const scores = [analystScore, technicalScore, regressionScore, sentimentNum];
  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - meanScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const confidencePercentage = Math.round(Math.max(50, Math.min(96, 92 - stdDev * 0.9)));

  return {
    symbol: quote.symbol,
    verdict,
    overallScore,
    confidencePercentage,
    currentPrice,
    target7Day,
    target30Day,
    analystConsensus: {
      targetPrice: Number(targetPrice.toFixed(2)),
      upsidePercent,
      consensusScore: Number(consensusScore.toFixed(2)),
      ratingLabel,
      totalRatings,
      buyPercent
    },
    technicalTrend: {
      status: technicalStatus,
      score: technicalScore,
      above50DayMA,
      above200DayMA,
      goldenCross,
      ma50: Number(ma50.toFixed(2)),
      ma200: Number(ma200.toFixed(2))
    },
    linearRegressionTrend: {
      slopePerDay: Number(slope.toFixed(3)),
      direction: regressionDirection,
      rSquared: Number(rSquared.toFixed(3)),
      score: regressionScore
    },
    sentimentScore: {
      score: sentimentNum,
      label: sentimentLabel
    },
    catalysts: catalysts.slice(0, 4),
    risks: risks.slice(0, 4)
  };
}
