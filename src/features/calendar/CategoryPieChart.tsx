import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { MonthSummary } from '../../db/transactionRepo';
import { Category } from '../../types';
import { formatCentavos } from '../../shared/utils/currency';
import { spacing, radii, typography } from '../../shared/theme/tokens';

export interface CategoryPieChartProps {
  summary: MonthSummary | null;
  categories: Category[];
  currency?: string;
}

const CHART_COLORS = [
  '#7477FF', // Purple (primary)
  '#F45E4F', // Coral (expense)
  '#9FD5B3', // Success (income)
  '#F0D35A', // Warning
  '#BCF3FF', // Light cyan
  '#FF8A78', // Soft coral
  '#C5D4CA', // Light mint
  '#DDE8E0', // Lighter mint
];

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describePieSlice(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${x} ${y}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  summary,
  categories,
  currency,
}) => {
  const { colors } = useTheme();
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  if (!summary || Object.keys(summary.categoryTotals).length === 0 || summary.totalExpenseCentavos <= 0) {
    return null;
  }

  // Filter positive expense categories and calculate slice angles
  const categoryEntries = Object.entries(summary.categoryTotals)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a);

  if (categoryEntries.length === 0) {
    return null;
  }

  const totalExpenseCentavos = summary.totalExpenseCentavos;

  let currentAngle = 0;
  const slices = categoryEntries.map(([catId, amountCentavos], index) => {
    const cat = categories.find((c) => c.id === catId);
    
    // Handle virtual category keys for shared goal contributions and shared account deposits
    let name = cat?.name;
    let color = cat?.color;
    
    if (catId === '__shared_goal__') {
      name = 'Shared Goal Contribution';
      color = color || '#8B5CF6'; // Purple
    } else if (catId === '__shared_account__') {
      name = 'Shared Account Deposit';
      color = color || '#06B6D4'; // Cyan
    } else if (catId === '__uncategorized__') {
      name = 'Uncategorized';
      color = color || '#6B7280'; // Gray
    } else {
      name = name || 'Other';
      color = color || CHART_COLORS[index % CHART_COLORS.length];
    }
    
    const percentage = (amountCentavos / totalExpenseCentavos) * 100;
    const sliceAngle = (amountCentavos / totalExpenseCentavos) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle += sliceAngle;

    return {
      catId,
      name,
      color,
      amountCentavos,
      percentage,
      startAngle,
      endAngle,
    };
  });

  const CHART_SIZE = 180;
  const CENTER = CHART_SIZE / 2;
  const RADIUS = 76;
  const INNER_RADIUS = 46;

  const activeSlice = selectedCatId ? slices.find((s) => s.catId === selectedCatId) : null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Expense Distribution</Text>

      <View
        style={[
          styles.chartCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Pie Chart Display */}
        <View style={styles.chartWrapper}>
          <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
            <G>
              {slices.length === 1 ? (
                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill={slices[0].color}
                  stroke={colors.card}
                  strokeWidth={2}
                />
              ) : (
                slices.map((slice) => {
                  const isSelected = selectedCatId === slice.catId;
                  return (
                    <Path
                      key={slice.catId}
                      d={describePieSlice(CENTER, CENTER, isSelected ? RADIUS + 4 : RADIUS, slice.startAngle, slice.endAngle)}
                      fill={slice.color}
                      stroke={colors.card}
                      strokeWidth={2}
                      opacity={selectedCatId && !isSelected ? 0.45 : 1}
                      onPress={() => setSelectedCatId(selectedCatId === slice.catId ? null : slice.catId)}
                    />
                  );
                })
              )}
              {/* Inner cutout for donut-pie look */}
              <Circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill={colors.card} />
            </G>
          </Svg>

          {/* Center Info Overlay */}
          <View style={styles.centerInfo} pointerEvents="none">
            <Text
              style={[styles.centerAmount, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCentavos(activeSlice ? activeSlice.amountCentavos : totalExpenseCentavos, currency)}
            </Text>
            <Text style={[styles.centerLabel, { color: colors.textMuted }]} numberOfLines={1}>
              {activeSlice ? activeSlice.name : 'Total Expense'}
            </Text>
          </View>
        </View>

        {/* Legend below the pie chart */}
        <View style={styles.legendContainer}>
          {slices.map((slice) => {
            const isSelected = selectedCatId === slice.catId;
            return (
              <TouchableOpacity
                key={slice.catId}
                style={[
                  styles.legendItem,
                  isSelected && [styles.legendItemSelected, { borderColor: slice.color, backgroundColor: colors.background }],
                ]}
                onPress={() => setSelectedCatId(selectedCatId === slice.catId ? null : slice.catId)}
                activeOpacity={0.7}
              >
                <View style={styles.legendLeft}>
                  <View style={[styles.legendColorDot, { backgroundColor: slice.color }]} />
                  <Text style={[styles.legendName, { color: colors.text }]} numberOfLines={1}>
                    {slice.name}
                  </Text>
                </View>
                <View style={styles.legendRight}>
                  <Text style={[styles.legendPercent, { color: colors.textMuted }]}>
                    {Math.round(slice.percentage)}%
                  </Text>
                  <Text style={[styles.legendAmount, { color: colors.text }]}>
                    {formatCentavos(slice.amountCentavos, currency)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.md,
  },
  chartCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  chartWrapper: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.xs,
  },
  centerInfo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 86,
    height: 86,
  },
  centerAmount: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
  },
  centerLabel: {
    fontSize: 9,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
    marginTop: 1,
  },
  legendContainer: {
    width: '100%',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendItemSelected: {
    borderWidth: 1,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  legendColorDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
  },
  legendName: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendPercent: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    width: 32,
    textAlign: 'right',
  },
  legendAmount: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
});
