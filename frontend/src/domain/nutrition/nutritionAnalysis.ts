import { FeedItem } from '@/types';
import { FeedTransaction } from '@/services/feed';

export type NutritionPeriodTab = 'HARIAN' | 'MINGGUAN' | 'BULANAN';
export type NutritionStatus = 'IDEAL' | 'KURANG' | 'BERLEBIH';
export type NutritionName = 'PROTEIN' | 'KARBOHIDRAT' | 'LEMAK' | 'SERAT' | 'MINERAL';

export type NutritionDataItem = {
  name: NutritionName;
  status: NutritionStatus;
  difference: number;
  barValue: number;
  targetMarker: number;
  actualPercent: number;
  targetPercent: number;
};

const WITA_TIME_ZONE = 'Asia/Makassar';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NUTRITION_TOLERANCE = 0.1;

const NUTRITION_TARGETS: Record<NutritionName, number> = {
  PROTEIN: 18,
  KARBOHIDRAT: 55,
  LEMAK: 5,
  SERAT: 8,
  MINERAL: 4,
};

const getPeriodDays = (tab: NutritionPeriodTab) => {
  if (tab === 'MINGGUAN') return 7;
  if (tab === 'BULANAN') return 30;
  return 1;
};

const parseUtcTimestamp = (value?: string) => {
  if (!value) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getWitaDayNumber = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WITA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return Math.floor(Date.UTC(getPart('year'), getPart('month') - 1, getPart('day')) / MS_PER_DAY);
};

const getTransactionType = (transaction: FeedTransaction) => {
  return transaction.type || (transaction.transaction_type === 'STOCK_OUT' ? 'OUT' : 'IN');
};

const isFeedConsumptionTransaction = (transaction: FeedTransaction) => {
  const description = (transaction.description || '').toLowerCase();
  return getTransactionType(transaction) === 'OUT'
    && (description.includes('pakan harian') || description.includes('finalisasi racikan pakan'));
};

const getTransactionFeedName = (
  transaction: FeedTransaction,
  feedById: Map<string, FeedItem>
) => {
  return transaction.feed_name || feedById.get(transaction.feed_id)?.nama || '';
};

const getTransactionDayNumber = (transaction: FeedTransaction) => {
  const transactionDate = parseUtcTimestamp(transaction.created_at);
  return transactionDate ? getWitaDayNumber(transactionDate) : null;
};

const getOutgoingTransactionsForPeriod = (
  transactions: FeedTransaction[],
  tab: NutritionPeriodTab
) => {
  const periodDays = getPeriodDays(tab);
  const todayWitaDay = getWitaDayNumber(new Date());

  return transactions.filter((transaction) => {
    if (!isFeedConsumptionTransaction(transaction)) return false;

    const transactionDayNumber = getTransactionDayNumber(transaction);
    if (transactionDayNumber === null) return false;

    const ageInDays = todayWitaDay - transactionDayNumber;
    return ageInDays >= 0 && ageInDays < periodDays;
  });
};

export const getNutritionPeriodLabel = (tab: NutritionPeriodTab) => {
  if (tab === 'MINGGUAN') return '7 hari terakhir';
  if (tab === 'BULANAN') return '30 hari terakhir';
  return 'hari ini';
};

export const getNutritionStatusColor = (status: NutritionStatus) => {
  if (status === 'IDEAL') return '#10b981';
  if (status === 'KURANG') return '#f59e0b';
  if (status === 'BERLEBIH') return '#ef4444';
  return 'var(--text-muted)';
};

export function analyzeNutritionForPeriod({
  feedList,
  feedTransactions,
  tab,
}: {
  feedList: FeedItem[];
  feedTransactions: FeedTransaction[];
  tab: NutritionPeriodTab;
}): NutritionDataItem[] {
  const feedById = new Map(feedList.map((feed) => [feed.id, feed]));
  const feedByName = new Map(feedList.map((feed) => [feed.nama.trim().toLowerCase(), feed]));
  const totals: Record<NutritionName, number> = {
    PROTEIN: 0,
    KARBOHIDRAT: 0,
    LEMAK: 0,
    SERAT: 0,
    MINERAL: 0,
  };

  let totalKg = 0;
  let hasNutritionData = false;

  getOutgoingTransactionsForPeriod(feedTransactions, tab).forEach((transaction) => {
    const feedName = getTransactionFeedName(transaction, feedById);
    const feed = feedById.get(transaction.feed_id) || feedByName.get(feedName.trim().toLowerCase());
    const nutrisi = feed?.nutrisi;
    const kg = Number(transaction.amount || 0);

    if (!nutrisi || kg <= 0) return;

    const hasAnyValue = Object.values(nutrisi).some((value) => Number(value) > 0);
    if (!hasAnyValue) return;

    hasNutritionData = true;
    totalKg += kg;
    totals.PROTEIN += kg * ((nutrisi.protein || 0) / 100);
    totals.KARBOHIDRAT += kg * ((nutrisi.karbohidrat || 0) / 100);
    totals.LEMAK += kg * ((nutrisi.lemak || 0) / 100);
    totals.SERAT += kg * ((nutrisi.serat || 0) / 100);
    totals.MINERAL += kg * ((nutrisi.mineral || 0) / 100);
  });

  if (!hasNutritionData || totalKg <= 0) {
    return [];
  }

  return (Object.keys(totals) as NutritionName[]).map((name) => {
    const actualPercent = (totals[name] / totalKg) * 100;
    const targetPercent = NUTRITION_TARGETS[name];
    const difference = actualPercent - targetPercent;
    const lowerLimit = targetPercent * (1 - NUTRITION_TOLERANCE);
    const upperLimit = targetPercent * (1 + NUTRITION_TOLERANCE);
    const status = actualPercent < lowerLimit ? 'KURANG' : actualPercent > upperLimit ? 'BERLEBIH' : 'IDEAL';
    const chartMax = Math.max(actualPercent, targetPercent * 1.35, 1);

    return {
      name,
      status,
      difference,
      barValue: Math.min(100, (actualPercent / chartMax) * 100),
      targetMarker: Math.min(100, (targetPercent / chartMax) * 100),
      actualPercent,
      targetPercent,
    };
  });
}
