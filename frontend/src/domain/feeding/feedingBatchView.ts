import { FeedingBatch } from '@/services/feedingBatch';

export type FeedingBatchGroup = {
  phase: string;
  items: NonNullable<FeedingBatch['ingredients']>;
};

export type FeedingBatchTotal = {
  feedName: string;
  planned: number;
  weighed: number;
  deducted: number;
};

export type FeedingBatchView = {
  batch: FeedingBatch | null;
  isPreparing: boolean;
  isFinalized: boolean;
  statusLabel: 'FINAL' | 'SIAP FINAL' | 'DIRACIK' | 'BELUM ADA';
  mobileStatusLabel: 'SIAP' | 'SIAP FINAL' | 'DIRACIK' | 'BELUM ADA';
  groupedItems: FeedingBatchGroup[];
  totalItems: FeedingBatchTotal[];
  hasItems: boolean;
};

export function isFeedingTaskName(name?: string | null) {
  return Boolean(name?.toLowerCase().includes('beri pakan'));
}

function hasBatchScaleData(batch: FeedingBatch) {
  return batch.ingredients.some((item) => Number(item.weighed_amount || 0) > 0 || Number(item.deducted_amount || 0) > 0);
}

function getBatchRank(batch: FeedingBatch) {
  if (batch.status === 'FINALIZED') return 4;
  if (batch.status === 'READY_TO_FINALIZE') return 3;
  if (batch.status === 'PREPARING' && hasBatchScaleData(batch)) return 3;
  if (batch.status === 'PREPARING') return 2;
  return 1;
}

function getBatchTime(batch: FeedingBatch) {
  const value = batch.finalized_at || batch.created_at || batch.tanggal || '';
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

export function pickBestFeedingBatch(batches: FeedingBatch[]) {
  return [...batches].sort((a, b) => {
    const statusDiff = getBatchRank(b) - getBatchRank(a);
    if (statusDiff !== 0) return statusDiff;
    return getBatchTime(b) - getBatchTime(a);
  })[0] || null;
}

export function selectFeedingBatchForTask(
  batches: FeedingBatch[],
  task?: { id?: string; task_id?: string; execution_id?: string; nama?: string } | null
) {
  if (!isFeedingTaskName(task?.nama)) return null;

  const taskId = task?.task_id || task?.id;
  const executionId = task?.execution_id || task?.id;
  const executionBatches = executionId
    ? batches.filter((batch) => batch.task_execution_id === executionId)
    : [];
  if (executionBatches.length > 0) return pickBestFeedingBatch(executionBatches);

  const legacyTaskBatches = taskId
    ? batches.filter((batch) => batch.task_id === taskId && !batch.task_execution_id)
    : [];
  return pickBestFeedingBatch(legacyTaskBatches);
}

export function groupBatchItemsByPhase(batch?: FeedingBatch | null) {
  const groups: FeedingBatchGroup[] = [];
  const phaseIndex = new Map<string, number>();

  (batch?.ingredients || []).forEach((item) => {
    const phase = item.phase || 'Gabungan';
    if (!phaseIndex.has(phase)) {
      phaseIndex.set(phase, groups.length);
      groups.push({ phase, items: [] });
    }
    groups[phaseIndex.get(phase) as number].items.push(item);
  });

  return groups;
}

export function getBatchTotalsByFeed(batch?: FeedingBatch | null) {
  const totals = new Map<string, FeedingBatchTotal>();

  (batch?.ingredients || []).forEach((item) => {
    const key = item.feed_id || item.feed_name.toLowerCase();
    const current = totals.get(key) || {
      feedName: item.feed_name,
      planned: 0,
      weighed: 0,
      deducted: 0,
    };

    current.planned += Number(item.planned_amount || 0);
    current.weighed += Number(item.weighed_amount || 0);
    current.deducted += Number(item.deducted_amount || 0);
    totals.set(key, current);
  });

  return Array.from(totals.values()).sort((a, b) => a.feedName.localeCompare(b.feedName));
}

export function buildFeedingBatchView(batch?: FeedingBatch | null): FeedingBatchView {
  const selectedBatch = batch || null;
  const isPreparing = selectedBatch?.status === 'PREPARING' || selectedBatch?.status === 'READY_TO_FINALIZE';
  const isFinalized = selectedBatch?.status === 'FINALIZED';
  const isReadyToFinalize = selectedBatch?.status === 'READY_TO_FINALIZE';

  return {
    batch: selectedBatch,
    isPreparing,
    isFinalized,
    statusLabel: isFinalized ? 'FINAL' : isReadyToFinalize ? 'SIAP FINAL' : selectedBatch ? 'DIRACIK' : 'BELUM ADA',
    mobileStatusLabel: isFinalized ? 'SIAP' : isReadyToFinalize ? 'SIAP FINAL' : selectedBatch ? 'DIRACIK' : 'BELUM ADA',
    groupedItems: groupBatchItemsByPhase(selectedBatch),
    totalItems: getBatchTotalsByFeed(selectedBatch),
    hasItems: Boolean(selectedBatch && selectedBatch.ingredients.length > 0),
  };
}
