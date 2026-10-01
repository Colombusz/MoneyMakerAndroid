import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { TransactionType } from '../../types';
import { spacing, typography } from '../../shared/theme/tokens';
import { Pill } from '../../shared/components/ui';

const FILTERS: Array<TransactionType | 'all'> = ['all', 'expense', 'income', 'transfer'];

export interface TransactionFilterTabsProps {
  activeFilter: TransactionType | 'all';
  onFilterChange: (filter: TransactionType | 'all') => void;
}

export const TransactionFilterTabs: React.FC<TransactionFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.filterBar}>
      {FILTERS.map((t) => {
        const isSelected = activeFilter === t;
        return (
          <Pill
            key={t}
            variant={isSelected ? 'primary' : 'secondary'}
            size="sm"
            selected={isSelected}
            onPress={() => onFilterChange(t)}
            style={styles.filterChip}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: isSelected ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {t.toUpperCase()}
            </Text>
          </Pill>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChip: {
    flex: 1,
  },
  filterChipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
});
