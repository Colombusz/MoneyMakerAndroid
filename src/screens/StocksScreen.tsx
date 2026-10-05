import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Linking
} from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ScreenContainer, Card } from '../shared/components/ui';
import { spacing, radii, typography } from '../shared/theme/tokens';
import {
  GlobalQuoteData,
  StockOverviewData,
  DailyPricePoint,
  TopMoversResponse,
  TopMoverItem,
  NewsSentimentItem,
  SearchMatchItem,
  StockPrediction
} from '../types/stocks';
import {
  fetchGlobalQuote,
  fetchStockOverview,
  fetchDailyTimeSeries,
  fetchNewsSentiment,
  fetchTopMovers,
  searchStocks
} from '../services/stocksApi';
import { generateStockPrediction } from '../features/stocks/stockPredictionEngine';

const POPULAR_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'SPY'];

export const StocksScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [quote, setQuote] = useState<GlobalQuoteData | null>(null);
  const [overview, setOverview] = useState<StockOverviewData | null>(null);
  const [history, setHistory] = useState<DailyPricePoint[]>([]);
  const [news, setNews] = useState<NewsSentimentItem[]>([]);
  const [prediction, setPrediction] = useState<StockPrediction | null>(null);
  const [movers, setMovers] = useState<TopMoversResponse | null>(null);
  const [moversTab, setMoversTab] = useState<'gainers' | 'losers' | 'active'>('gainers');
  const [chartTimeframe, setChartTimeframe] = useState<'7D' | '1M' | '3M'>('1M');
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'NVDA', 'MSFT', 'TSLA']);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMatchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchStocks(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (e) {
        console.warn(e);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load stock data & prediction
  const loadStockData = useCallback(async (symbol: string) => {
    try {
      const [quoteRes, ovRes, histRes, newsRes] = await Promise.allSettled([
        fetchGlobalQuote(symbol),
        fetchStockOverview(symbol),
        fetchDailyTimeSeries(symbol),
        fetchNewsSentiment(symbol)
      ]);

      const q = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
      const ov = ovRes.status === 'fulfilled' ? ovRes.value : null;
      const hist = histRes.status === 'fulfilled' ? histRes.value : [];
      const n = newsRes.status === 'fulfilled' ? newsRes.value : [];

      if (q) {
        setQuote(q);
        setOverview(ov);
        setHistory(hist);
        setNews(n);

        const pred = generateStockPrediction(q, ov, hist, n);
        setPrediction(pred);
      }
    } catch (err) {
      console.warn('Error loading stock telemetry:', err);
    }
  }, []);

  // Initial load
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [moversData] = await Promise.all([
        fetchTopMovers(),
        loadStockData(selectedSymbol)
      ]);
      setMovers(moversData);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol, loadStockData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Pull to refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const moversData = await fetchTopMovers();
      setMovers(moversData);
      await loadStockData(selectedSymbol);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Watchlist toggle
  const toggleWatchlist = (sym: string) => {
    const upper = sym.toUpperCase();
    setWatchlist((prev) =>
      prev.includes(upper) ? prev.filter((s) => s !== upper) : [...prev, upper]
    );
  };

  const isWatchlisted = watchlist.includes(selectedSymbol.toUpperCase());

  // Chart coordinates calculation
  const chartWidth = 320;
  const chartHeight = 160;
  const padX = 20;
  const padY = 16;

  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    if (chartTimeframe === '7D') return history.slice(-7);
    if (chartTimeframe === '1M') return history.slice(-30);
    return history.slice(-60);
  }, [history, chartTimeframe]);

  const { chartPath, forecastPath, minPrice, maxPrice, forecastPts } = useMemo(() => {
    if (filteredHistory.length === 0) {
      return { chartPath: '', forecastPath: '', minPrice: 0, maxPrice: 100, forecastPts: [] };
    }

    const prices = filteredHistory.map((h) => h.close);
    let min = Math.min(...prices);
    let max = Math.max(...prices);

    if (prediction) {
      min = Math.min(min, prediction.target7Day.bear);
      max = Math.max(max, prediction.target7Day.bull);
    }

    const span = Math.max(1, max - min);
    min = Math.max(0, min - span * 0.05);
    max = max + span * 0.05;
    const finalSpan = max - min;

    const usableW = chartWidth - padX * 2;
    const usableH = chartHeight - padY * 2;

    const pts = filteredHistory.map((d, i) => {
      const x = padX + (i / Math.max(1, filteredHistory.length - 1)) * (usableW * 0.82);
      const y = chartHeight - padY - ((d.close - min) / finalSpan) * usableH;
      return { x, y, close: d.close };
    });

    const cPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const fPts: { x: number; y: number; close: number; label: string }[] = [];
    let fPath = '';

    if (pts.length > 0 && prediction) {
      const last = pts[pts.length - 1];
      fPts.push({ x: last.x, y: last.y, close: last.close, label: 'Today' });

      const x7D = padX + usableW * 0.92;
      const y7D = chartHeight - padY - ((prediction.target7Day.base - min) / finalSpan) * usableH;
      fPts.push({
        x: x7D,
        y: Math.max(padY, Math.min(chartHeight - padY, y7D)),
        close: prediction.target7Day.base,
        label: '+7D'
      });

      const x30D = padX + usableW;
      const y30D = chartHeight - padY - ((prediction.target30Day.base - min) / finalSpan) * usableH;
      fPts.push({
        x: x30D,
        y: Math.max(padY, Math.min(chartHeight - padY, y30D)),
        close: prediction.target30Day.base,
        label: '+30D'
      });

      fPath = fPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    }

    return { chartPath: cPath, forecastPath: fPath, minPrice: min, maxPrice: max, forecastPts: fPts };
  }, [filteredHistory, prediction, chartWidth, chartHeight, padX, padY]);

  const isUpward = filteredHistory.length >= 2 && filteredHistory[filteredHistory.length - 1].close >= filteredHistory[0].close;
  const chartColor = isUpward ? colors.income : colors.expense;

  // Active movers items
  const activeMoversList: TopMoverItem[] =
    moversTab === 'gainers'
      ? movers?.topGainers || []
      : moversTab === 'losers'
      ? movers?.topLosers || []
      : movers?.mostActivelyTraded || [];

  return (
    <ScreenContainer
      scrollable={true}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconBox, { backgroundColor: colors.incomeLight || 'rgba(16,185,129,0.15)' }]}>
            <Ionicons name="trending-up" size={20} color={colors.income} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>US Stocks</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Monitoring & Predictions
            </Text>
          </View>
        </View>

        <View style={[styles.apiBadge, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[styles.apiIndicator, { backgroundColor: colors.income }]} />
          <Text style={[styles.apiBadgeText, { color: colors.textSecondary }]}>Alpha Vantage</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search US tickers (e.g. AAPL, NVDA, TSLA)..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="characters"
          />
          {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={[styles.searchResultsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.symbol}
                style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedSymbol(item.symbol);
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
              >
                <View>
                  <Text style={[styles.searchResultSymbol, { color: colors.text }]}>{item.symbol}</Text>
                  <Text style={[styles.searchResultName, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <Text style={[styles.searchResultRegion, { color: colors.textMuted }]}>{item.region}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Watchlist & Popular Tickers Horizontal Scroll */}
      <View style={styles.chipRowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <View style={styles.watchlistLabelBox}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={styles.watchlistLabelText}>Watchlist:</Text>
          </View>

          {watchlist.map((sym) => {
            const isSelected = selectedSymbol === sym;
            return (
              <TouchableOpacity
                key={`wl-${sym}`}
                style={[
                  styles.tickerChip,
                  {
                    backgroundColor: isSelected ? '#f59e0b' : colors.surface,
                    borderColor: isSelected ? '#d97706' : colors.border
                  }
                ]}
                onPress={() => setSelectedSymbol(sym)}
              >
                <Text style={[styles.tickerChipText, { color: isSelected ? '#ffffff' : colors.text }]}>
                  {sym}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />

          <Text style={[styles.popularLabel, { color: colors.textMuted }]}>Popular:</Text>

          {POPULAR_TICKERS.map((sym) => {
            const isSelected = selectedSymbol === sym;
            return (
              <TouchableOpacity
                key={`pop-${sym}`}
                style={[
                  styles.tickerChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primaryDark : colors.border
                  }
                ]}
                onPress={() => setSelectedSymbol(sym)}
              >
                <Text style={[styles.tickerChipText, { color: isSelected ? '#ffffff' : colors.text }]}>
                  {sym}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Stock Live Card */}
      {quote && (
        <Card style={styles.stockCard}>
          {/* Symbol, Name, Badges & Watchlist button */}
          <View style={styles.stockCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.symbolBadgeRow}>
                <Text style={[styles.symbolText, { color: colors.text }]}>{quote.symbol}</Text>
                {overview?.exchange ? (
                  <View style={[styles.tagBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.tagBadgeText, { color: colors.textSecondary }]}>
                      {overview.exchange}
                    </Text>
                  </View>
                ) : null}
                {overview?.sector ? (
                  <View style={[styles.tagBadge, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }]}>
                    <Text style={[styles.tagBadgeText, { color: colors.income }]}>
                      {overview.sector}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.companyName, { color: colors.textMuted }]} numberOfLines={1}>
                {overview?.name || 'US Equity Asset'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.starBtn,
                {
                  backgroundColor: isWatchlisted ? 'rgba(245, 158, 11, 0.15)' : colors.background,
                  borderColor: isWatchlisted ? 'rgba(245, 158, 11, 0.4)' : colors.border
                }
              ]}
              onPress={() => toggleWatchlist(selectedSymbol)}
            >
              <Ionicons
                name={isWatchlisted ? 'star' : 'star-outline'}
                size={18}
                color={isWatchlisted ? '#f59e0b' : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Price & Change Banner */}
          <View style={styles.priceRow}>
            <Text style={[styles.bigPrice, { color: colors.text }]}>
              ${quote.price.toFixed(2)}
            </Text>
            <View
              style={[
                styles.changePill,
                {
                  backgroundColor: quote.change >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                  borderColor: quote.change >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'
                }
              ]}
            >
              <Ionicons
                name={quote.change >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={quote.change >= 0 ? colors.income : colors.expense}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: quote.change >= 0 ? colors.income : colors.expense }
                ]}
              >
                {quote.change >= 0 ? '+' : ''}
                {quote.change.toFixed(2)} ({quote.change >= 0 ? '+' : ''}
                {quote.changePercentNum.toFixed(2)}%)
              </Text>
            </View>
          </View>

          {/* Key Fundamentals Grid */}
          <View style={[styles.fundamentalsGrid, { borderTopColor: colors.border }]}>
            <View style={[styles.fundamentalItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.fundamentalLabel, { color: colors.textMuted }]}>Day Range</Text>
              <Text style={[styles.fundamentalVal, { color: colors.text }]}>
                ${quote.low.toFixed(0)} - ${quote.high.toFixed(0)}
              </Text>
            </View>

            <View style={[styles.fundamentalItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.fundamentalLabel, { color: colors.textMuted }]}>P/E Ratio</Text>
              <Text style={[styles.fundamentalVal, { color: colors.text }]}>
                {overview?.peRatio ? `${overview.peRatio.toFixed(1)}x` : 'N/A'}
              </Text>
            </View>

            <View style={[styles.fundamentalItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.fundamentalLabel, { color: colors.textMuted }]}>52W Range</Text>
              <Text style={[styles.fundamentalVal, { color: colors.text }]}>
                ${overview?.week52Low ? overview.week52Low.toFixed(0) : '—'} - $
                {overview?.week52High ? overview.week52High.toFixed(0) : '—'}
              </Text>
            </View>

            <View style={[styles.fundamentalItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.fundamentalLabel, { color: colors.textMuted }]}>Volume</Text>
              <Text style={[styles.fundamentalVal, { color: colors.text }]}>
                {(quote.volume / 1e6).toFixed(1)}M
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* SVG Price Chart Card */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleBox}>
            <Ionicons name="stats-chart" size={16} color={colors.primary} />
            <Text style={[styles.chartTitle, { color: colors.text }]}>Trend & Forecast</Text>
          </View>

          {/* Timeframe Switcher */}
          <View style={[styles.timeframeBox, { backgroundColor: colors.background }]}>
            {(['7D', '1M', '3M'] as const).map((tf) => (
              <TouchableOpacity
                key={tf}
                style={[
                  styles.timeframeBtn,
                  chartTimeframe === tf && { backgroundColor: colors.primary }
                ]}
                onPress={() => setChartTimeframe(tf)}
              >
                <Text
                  style={[
                    styles.timeframeBtnText,
                    { color: chartTimeframe === tf ? '#ffffff' : colors.textMuted }
                  ]}
                >
                  {tf}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SVG Drawing */}
        <View style={styles.svgContainer}>
          <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            {/* Grid Line */}
            <Line
              x1={padX}
              y1={chartHeight / 2}
              x2={chartWidth - padX}
              y2={chartHeight / 2}
              stroke={colors.border}
              strokeDasharray="4 4"
            />

            {/* Historical price line */}
            {chartPath ? (
              <Path
                d={chartPath}
                fill="none"
                stroke={chartColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Forecast dashed line */}
            {forecastPath ? (
              <Path
                d={forecastPath}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            ) : null}

            {/* Forecast points */}
            {forecastPts.slice(1).map((fp, i) => (
              <Circle
                key={i}
                cx={fp.x}
                cy={fp.y}
                r={4}
                fill="#8b5cf6"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}
          </Svg>
        </View>

        {/* Chart Legend */}
        <View style={[styles.chartLegend, { borderTopColor: colors.border }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: chartColor }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Historical Close</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={[styles.legendText, { color: '#8b5cf6' }]}>Model Forecast (+7D, +30D)</Text>
          </View>
        </View>
      </Card>

      {/* AI Stock Prediction Engine Card */}
      {prediction && (
        <Card style={styles.predictionCard}>
          <View style={styles.predHeader}>
            <View style={styles.predTitleBox}>
              <View style={styles.sparkleIcon}>
                <Ionicons name="sparkles" size={16} color="#ffffff" />
              </View>
              <View>
                <Text style={[styles.predTitle, { color: colors.text }]}>Quant Prediction</Text>
                <Text style={[styles.predSub, { color: colors.textMuted }]}>Multi-Factor AI Synthesis</Text>
              </View>
            </View>

            <View style={styles.confidencePill}>
              <Ionicons name="shield-checkmark" size={12} color="#8b5cf6" />
              <Text style={styles.confidenceText}>{prediction.confidencePercentage}% Conviction</Text>
            </View>
          </View>

          {/* Verdict Banner */}
          <View
            style={[
              styles.verdictBanner,
              {
                backgroundColor:
                  prediction.verdict === 'STRONG BUY' || prediction.verdict === 'BUY'
                    ? 'rgba(16,185,129,0.15)'
                    : prediction.verdict === 'HOLD'
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(244,63,94,0.15)',
                borderColor:
                  prediction.verdict === 'STRONG BUY' || prediction.verdict === 'BUY'
                    ? 'rgba(16,185,129,0.4)'
                    : prediction.verdict === 'HOLD'
                    ? 'rgba(245,158,11,0.4)'
                    : 'rgba(244,63,94,0.4)'
              }
            ]}
          >
            <View style={styles.verdictTopRow}>
              <Text style={styles.verdictSubLabel}>MODEL RECOMMENDATION</Text>
              <Text style={[styles.verdictScore, { color: colors.text }]}>
                Score: {prediction.overallScore}/100
              </Text>
            </View>
            <Text
              style={[
                styles.verdictBigText,
                {
                  color:
                    prediction.verdict === 'STRONG BUY' || prediction.verdict === 'BUY'
                      ? colors.income
                      : prediction.verdict === 'HOLD'
                      ? '#f59e0b'
                      : colors.expense
                }
              ]}
            >
              {prediction.verdict}
            </Text>
          </View>

          {/* Forecast Targets Grid */}
          <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Target Price Projections</Text>
          <View style={styles.targetGrid}>
            {/* 7-Day Target */}
            <View style={[styles.targetBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.targetBoxLabel, { color: colors.textMuted }]}>Next 7 Days</Text>
              <Text style={[styles.targetPriceText, { color: colors.text }]}>
                ${prediction.target7Day.base.toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.targetPercent,
                  { color: prediction.target7Day.percentChange >= 0 ? colors.income : colors.expense }
                ]}
              >
                {prediction.target7Day.percentChange >= 0 ? '+' : ''}
                {prediction.target7Day.percentChange}%
              </Text>
            </View>

            {/* 30-Day Target */}
            <View style={[styles.targetBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.targetBoxLabel, { color: colors.textMuted }]}>Next 30 Days</Text>
              <Text style={[styles.targetPriceText, { color: colors.text }]}>
                ${prediction.target30Day.base.toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.targetPercent,
                  { color: prediction.target30Day.percentChange >= 0 ? colors.income : colors.expense }
                ]}
              >
                {prediction.target30Day.percentChange >= 0 ? '+' : ''}
                {prediction.target30Day.percentChange}%
              </Text>
            </View>

            {/* Wall St 12M Target */}
            <View style={[styles.targetBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.targetBoxLabel, { color: colors.textMuted }]}>Wall St 12M</Text>
              <Text style={[styles.targetPriceText, { color: colors.text }]}>
                ${prediction.analystConsensus.targetPrice.toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.targetPercent,
                  { color: prediction.analystConsensus.upsidePercent >= 0 ? colors.income : colors.expense }
                ]}
              >
                {prediction.analystConsensus.upsidePercent >= 0 ? '+' : ''}
                {prediction.analystConsensus.upsidePercent}%
              </Text>
            </View>
          </View>

          {/* Catalysts & Risks */}
          <View style={styles.catalystsSection}>
            <View style={[styles.bulletCard, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }]}>
              <View style={styles.bulletTitleRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.income} />
                <Text style={[styles.bulletTitle, { color: colors.income }]}>Key Bullish Catalysts</Text>
              </View>
              {prediction.catalysts.map((c, idx) => (
                <Text key={idx} style={[styles.bulletText, { color: colors.text }]}>
                  • {c}
                </Text>
              ))}
            </View>

            <View style={[styles.bulletCard, { backgroundColor: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.2)' }]}>
              <View style={styles.bulletTitleRow}>
                <Ionicons name="alert-circle" size={14} color={colors.expense} />
                <Text style={[styles.bulletTitle, { color: colors.expense }]}>Key Bearish Risks</Text>
              </View>
              {prediction.risks.map((r, idx) => (
                <Text key={idx} style={[styles.bulletText, { color: colors.text }]}>
                  • {r}
                </Text>
              ))}
            </View>
          </View>
        </Card>
      )}

      {/* US Market Movers Card */}
      <Card style={styles.moversCard}>
        <View style={styles.moversHeader}>
          <View style={styles.moversTitleBox}>
            <Ionicons name="flash" size={16} color="#f59e0b" />
            <Text style={[styles.moversTitle, { color: colors.text }]}>US Market Movers</Text>
          </View>
          <Text style={[styles.moversSub, { color: colors.textMuted }]}>Alpha Vantage</Text>
        </View>

        {/* Tabs: Gainers, Losers, Active */}
        <View style={[styles.moversTabRow, { backgroundColor: colors.background }]}>
          {(['gainers', 'losers', 'active'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.moversTabBtn,
                moversTab === tab && {
                  backgroundColor:
                    tab === 'gainers'
                      ? colors.income
                      : tab === 'losers'
                      ? colors.expense
                      : colors.primary
                }
              ]}
              onPress={() => setMoversTab(tab)}
            >
              <Text
                style={[
                  styles.moversTabBtnText,
                  { color: moversTab === tab ? '#ffffff' : colors.textMuted }
                ]}
              >
                {tab === 'gainers' ? 'Gainers' : tab === 'losers' ? 'Losers' : 'Most Active'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Movers Items */}
        <View style={styles.moversList}>
          {activeMoversList.map((item) => {
            const isPos = item.changePercentage >= 0;
            const isSelected = selectedSymbol === item.ticker;

            return (
              <TouchableOpacity
                key={item.ticker}
                style={[
                  styles.moverItem,
                  {
                    backgroundColor: isSelected ? 'rgba(16,185,129,0.1)' : colors.background,
                    borderColor: isSelected ? colors.income : colors.border
                  }
                ]}
                onPress={() => setSelectedSymbol(item.ticker)}
              >
                <View>
                  <Text style={[styles.moverTicker, { color: colors.text }]}>{item.ticker}</Text>
                  <Text style={[styles.moverVol, { color: colors.textMuted }]}>
                    Vol: {(item.volume / 1e6).toFixed(1)}M
                  </Text>
                </View>

                <View style={styles.moverPriceBox}>
                  <Text style={[styles.moverPrice, { color: colors.text }]}>
                    ${item.price.toFixed(2)}
                  </Text>
                  <Text style={[styles.moverChange, { color: isPos ? colors.income : colors.expense }]}>
                    {isPos ? '+' : ''}
                    {item.changePercentage.toFixed(2)}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* News & Sentiment */}
      {news.length > 0 && (
        <Card style={styles.newsCard}>
          <View style={styles.newsHeader}>
            <Ionicons name="newspaper-outline" size={16} color={colors.primary} />
            <Text style={[styles.newsTitle, { color: colors.text }]}>
              {selectedSymbol} News & Sentiment
            </Text>
          </View>

          <View style={styles.newsList}>
            {news.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.newsItem, { borderBottomColor: colors.border }]}
                onPress={() => item.url && Linking.openURL(item.url)}
              >
                <View style={styles.newsSourceRow}>
                  <Text style={[styles.newsSource, { color: colors.textMuted }]}>{item.source}</Text>
                  <View
                    style={[
                      styles.sentimentTag,
                      {
                        backgroundColor:
                          (item.tickerSentimentLabel || item.overallSentimentLabel).includes('Bullish')
                            ? 'rgba(16,185,129,0.15)'
                            : (item.tickerSentimentLabel || item.overallSentimentLabel).includes('Bearish')
                            ? 'rgba(244,63,94,0.15)'
                            : 'rgba(100,116,139,0.15)'
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.sentimentTagText,
                        {
                          color:
                            (item.tickerSentimentLabel || item.overallSentimentLabel).includes('Bullish')
                              ? colors.income
                              : (item.tickerSentimentLabel || item.overallSentimentLabel).includes('Bearish')
                              ? colors.expense
                              : colors.textMuted
                        }
                      ]}
                    >
                      {item.tickerSentimentLabel || item.overallSentimentLabel}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.newsItemTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.summary ? (
                  <Text style={[styles.newsSummary, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.summary}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.heavy,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
  },
  apiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  apiIndicator: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  apiBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
  },
  searchContainer: {
    marginBottom: spacing.md,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: spacing.xs,
  },
  searchResultsBox: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 20,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  searchResultSymbol: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  searchResultName: {
    fontSize: typography.fontSizes.xs,
    maxWidth: 200,
  },
  searchResultRegion: {
    fontSize: 10,
  },
  chipRowContainer: {
    marginBottom: spacing.md,
  },
  chipRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  watchlistLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingRight: spacing.xs,
  },
  watchlistLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
  },
  tickerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  tickerChipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  chipDivider: {
    width: 1,
    height: 16,
    marginHorizontal: spacing.xs,
  },
  popularLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  stockCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  symbolBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  symbolText: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  companyName: {
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  starBtn: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  bigPrice: {
    fontSize: typography.fontSizes.display,
    fontWeight: typography.fontWeights.heavy,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  changeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  fundamentalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  fundamentalItem: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  fundamentalLabel: {
    fontSize: 10,
  },
  fundamentalVal: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    marginTop: 2,
  },
  chartCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  chartTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chartTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  timeframeBox: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: 2,
  },
  timeframeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  timeframeBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  legendText: {
    fontSize: 10,
  },
  predictionCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  predHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  predTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sparkleIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.heavy,
  },
  predSub: {
    fontSize: 10,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139,92,246,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  verdictBanner: {
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  verdictTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  verdictSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  verdictScore: {
    fontSize: 11,
    fontWeight: '700',
  },
  verdictBigText: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.heavy,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.sm,
  },
  targetGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  targetBox: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  targetBoxLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  targetPriceText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.heavy,
  },
  targetPercent: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  catalystsSection: {
    gap: spacing.sm,
  },
  bulletCard: {
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  bulletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bulletTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  bulletText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  moversCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  moversHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  moversTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moversTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
  },
  moversSub: {
    fontSize: 10,
  },
  moversTabRow: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  moversTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  moversTabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  moversList: {
    gap: spacing.xs,
  },
  moverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  moverTicker: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  moverVol: {
    fontSize: 10,
  },
  moverPriceBox: {
    alignItems: 'flex-end',
  },
  moverPrice: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  moverChange: {
    fontSize: 11,
    fontWeight: '700',
  },
  newsCard: {
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  newsTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  newsList: {
    gap: spacing.sm,
  },
  newsItem: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  newsSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  newsSource: {
    fontSize: 10,
    fontWeight: '600',
  },
  sentimentTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  sentimentTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  newsItemTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  newsSummary: {
    fontSize: 11,
    marginTop: 2,
  },
});
