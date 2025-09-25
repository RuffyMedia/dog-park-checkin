import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
} from 'victory-native';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { MONTEREY_COUNTY_DOG_PARKS, Park } from '../constants/parks';
import { colors, shadows } from '../constants/theme';
import { db } from '../config/firebase';
import { CheckInDocument } from '../types/firestore';

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const dayOptions = ['All Days', ...dayNames];

const MAX_CHECKINS = 500;

const formatHourLabel = (hour: number) => {
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${normalized}${period}`;
};

const formatHourRange = (hour: number) => {
  const nextHour = (hour + 1) % 24;
  return `${formatHourLabel(hour)}–${formatHourLabel(nextHour)}`;
};

const createEmptyMatrix = () => Array.from({ length: 7 }, () => new Array(24).fill(0));

const ParkAnalyticsScreen = () => {
  const [selectedPark, setSelectedPark] = useState<Park>(MONTEREY_COUNTY_DOG_PARKS[0]);
  const [selectedDay, setSelectedDay] = useState<string>('All Days');
  const [loading, setLoading] = useState(true);
  const [dataMatrix, setDataMatrix] = useState<number[][]>(createEmptyMatrix());
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCheckins = async () => {
      setLoading(true);
      setError(null);

      try {
        const checkinsRef = collection(db, 'checkins');
        const checkinsQuery = query(
          checkinsRef,
          where('parkId', '==', selectedPark.parkId),
          orderBy('timestamp', 'desc'),
          limit(MAX_CHECKINS),
        );

        const snapshot = await getDocs(checkinsQuery);

        const freshMatrix = createEmptyMatrix();
        let total = 0;

        snapshot.docs.forEach(docSnapshot => {
          const checkin = docSnapshot.data() as CheckInDocument;
          const rawTimestamp = checkin.timestamp as unknown;
          const timestamp = typeof rawTimestamp === 'number'
            ? rawTimestamp
            : typeof rawTimestamp === 'object' && rawTimestamp !== null && 'toMillis' in rawTimestamp
              ? (rawTimestamp as { toMillis: () => number }).toMillis()
              : 0;

          if (!timestamp) {
            return;
          }

          const checkinDate = new Date(timestamp);
          const dayIndex = checkinDate.getDay();
          const hour = checkinDate.getHours();

          freshMatrix[dayIndex][hour] += 1;
          total += 1;
        });

        setDataMatrix(freshMatrix);
        setTotalCheckins(total);
      } catch (fetchError) {
        console.warn(fetchError);
        setError('Unable to load analytics. Pull down to refresh.');
      } finally {
        setLoading(false);
      }
    };

    loadCheckins();
  }, [selectedPark]);

  const selectedDayIndex = useMemo(() => {
    if (selectedDay === 'All Days') {
      return null;
    }

    return dayNames.indexOf(selectedDay);
  }, [selectedDay]);

  const hourlyCounts = useMemo(() => {
    if (selectedDayIndex === null) {
      const totals = new Array(24).fill(0);
      dataMatrix.forEach(dayRow => {
        dayRow.forEach((value, hour) => {
          totals[hour] += value;
        });
      });
      return totals;
    }

    return dataMatrix[selectedDayIndex] ?? new Array(24).fill(0);
  }, [dataMatrix, selectedDayIndex]);

  const chartData = useMemo(() => {
    return hourlyCounts.map((count, hour) => ({
      x: hour,
      label: formatHourLabel(hour),
      y: count,
    }));
  }, [hourlyCounts]);

  const bestVisitSuggestion = useMemo(() => {
    const flattenedTotals = new Array(24).fill(0);
    dataMatrix.forEach(dayRow => {
      dayRow.forEach((value, hour) => {
        flattenedTotals[hour] += value;
      });
    });

    const aggregatedTotal = flattenedTotals.reduce((acc, value) => acc + value, 0);

    if (!aggregatedTotal) {
      return 'Not enough check-in history yet. Check back after more visits!';
    }

    let bestHour = 0;
    flattenedTotals.forEach((value, hour) => {
      if (value < flattenedTotals[bestHour]) {
        bestHour = hour;
      }
    });

    let bestDay = 0;
    dataMatrix.forEach((dayRow, dayIndex) => {
      const dayTotal = dayRow.reduce((acc, value) => acc + value, 0);
      const bestDayTotal = dataMatrix[bestDay].reduce((acc, value) => acc + value, 0);

      if (dayTotal < bestDayTotal) {
        bestDay = dayIndex;
      }
    });

    const bestDayLabel = dayNames[bestDay];

    return `${bestDayLabel} around ${formatHourRange(bestHour)} tends to be the calmest.`;
  }, [dataMatrix]);

  const daySummaries = useMemo(() => {
    return dayNames.map((name, index) => {
      const dayRow = dataMatrix[index] ?? [];
      const dayTotal = dayRow.reduce((acc, value) => acc + value, 0);

      if (!dayTotal) {
        return {
          name,
          text: 'No check-ins recorded yet.',
        };
      }

      let busiestHour = 0;
      dayRow.forEach((value, hour) => {
        if (value > dayRow[busiestHour]) {
          busiestHour = hour;
        }
      });

      return {
        name,
        text: `${dayTotal} check-ins · Busiest at ${formatHourRange(busiestHour)}`,
      };
    });
  }, [dataMatrix]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top'] }>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Park Analytics</Text>
        <Text style={styles.subtitle}>
          Understand crowd patterns to pick the perfect play time for your pup.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Select park</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
            {MONTEREY_COUNTY_DOG_PARKS.map(park => {
              const isSelected = park.parkId === selectedPark.parkId;
              return (
                <TouchableOpacity
                  key={park.parkId}
                  style={[styles.chip, isSelected ? styles.chipActive : null]}
                  onPress={() => setSelectedPark(park)}
                >
                  <Text style={[styles.chipLabel, isSelected ? styles.chipLabelActive : null]}>
                    {park.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Day of week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
            {dayOptions.map(option => {
              const isSelected = option === selectedDay;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, isSelected ? styles.chipActive : null]}
                  onPress={() => setSelectedDay(option)}
                >
                  <Text style={[styles.chipLabel, isSelected ? styles.chipLabelActive : null]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Best Time to Visit</Text>
          <View style={styles.bestTimeCard}>
            <Text style={styles.bestTimeText}>{bestVisitSuggestion}</Text>
            <Text style={styles.bestTimeFootnote}>
              Based on {totalCheckins} check-ins at {selectedPark.name}.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Hourly crowd levels</Text>
          {loading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Analyzing recent visits…</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <View style={styles.chartCard}>
              <VictoryChart
                domainPadding={{ x: 12, y: 12 }}
                width={350}
                height={260}
              >
                <VictoryAxis
                  tickValues={[0, 3, 6, 9, 12, 15, 18, 21]}
                  tickFormat={tick => formatHourLabel(tick as number)}
                  style={{
                    axis: { stroke: colors.border },
                    tickLabels: { fontSize: 10, fill: colors.textSecondary },
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  tickFormat={tick => `${tick}`}
                  style={{
                    axis: { stroke: colors.border },
                    grid: { stroke: colors.border, strokeDasharray: '4 8' },
                    tickLabels: { fontSize: 10, fill: colors.textSecondary },
                  }}
                />
                <VictoryBar
                  data={chartData}
                  x="label"
                  y="y"
                  style={{ data: { fill: colors.accent } }}
                  barWidth={10}
                />
              </VictoryChart>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Day-by-day overview</Text>
          <View style={styles.summaryCard}>
            {daySummaries.map(summary => (
              <View key={summary.name} style={styles.summaryRow}>
                <Text style={styles.summaryDay}>{summary.name}</Text>
                <Text style={styles.summaryText}>{summary.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerRow: {
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: '#fff',
  },
  bestTimeCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 8,
    ...shadows.card,
  },
  bestTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bestTimeFootnote: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 12,
    ...shadows.card,
  },
  loadingArea: {
    paddingVertical: 40,
    gap: 12,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 12,
    ...shadows.card,
  },
  summaryRow: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 4,
  },
  summaryDay: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default ParkAnalyticsScreen;
