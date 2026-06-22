import 'package:flutter/material.dart';

import '../models/keeper_models.dart';
import '../theme/app_theme.dart';

class ChecklistScreen extends StatefulWidget {
  final List<Map<String, dynamic>> kegiatanList;
  final double progress;
  final bool isSyncing;
  final String? error;
  final List<FeedingBatch> feedingBatches;
  final Map<String, FeedingBatch> batchByTaskId;
  final Map<String, FeedingBatch> batchByExecutionId;
  final bool isLiveBatchPolling;
  final bool hasBatchSyncIssue;
  final DateTime? lastBatchSyncAt;
  final Future<void> Function(String taskId, bool status) onStatusChanged;
  final Future<void> Function(String taskId, [String? taskExecutionId]) onCreateFeedingBatch;
  final Future<void> Function(String batchId) onFinalizeFeedingBatch;
  final Future<void> Function(String batchId) onCancelFeedingBatch;
  final Future<void> Function() onResetDaily;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onOpenAccount;

  const ChecklistScreen({
    super.key,
    required this.kegiatanList,
    required this.progress,
    required this.isSyncing,
    required this.error,
    required this.feedingBatches,
    required this.batchByTaskId,
    required this.batchByExecutionId,
    required this.isLiveBatchPolling,
    required this.hasBatchSyncIssue,
    required this.lastBatchSyncAt,
    required this.onStatusChanged,
    required this.onCreateFeedingBatch,
    required this.onFinalizeFeedingBatch,
    required this.onCancelFeedingBatch,
    required this.onResetDaily,
    required this.onRefresh,
    required this.onOpenAccount,
  });

  @override
  State<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends State<ChecklistScreen> {
  int? _selectedChecklistIndex;
  final Set<String> _expandedBatchKeys = <String>{};

  @override
  Widget build(BuildContext context) {
    final totalSelesai = widget.kegiatanList.where((item) => item['isDone'] == true).length;
    final totalKegiatan = widget.kegiatanList.length;
    final progressPercent = (widget.progress * 100).toInt();

    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: RefreshIndicator(
              color: const Color(0xFF26D057),
              onRefresh: widget.onRefresh,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 12),
                        if (widget.error != null) ...[
                          _buildErrorBox(widget.error!),
                          const SizedBox(height: 12),
                        ],
                        _buildProgressCard(progressPercent, totalSelesai, totalKegiatan),
                        const SizedBox(height: 20),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 20),
                          child: Text(
                            'LIST KEGIATAN HARI INI',
                            style: TextStyle(fontSize: 13, color: EntokColors.text, fontWeight: FontWeight.w900),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],
                    ),
                  ),
                  if (widget.kegiatanList.isEmpty)
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Text(
                          'Belum ada tugas untuk hari ini.',
                          style: TextStyle(color: Colors.black54, fontWeight: FontWeight.w600),
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => _buildTimelineItem(index),
                          childCount: widget.kegiatanList.length,
                        ),
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: Column(
                      children: [
                        const SizedBox(height: 16),
                        _buildTipsBox(),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(22, MediaQuery.of(context).padding.top + 14, 22, 18),
      decoration: BoxDecoration(
        color: EntokColors.green,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
        boxShadow: [
          BoxShadow(
            color: EntokColors.green.withValues(alpha: 0.20),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Checklist Kegiatan',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    height: 1.1,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  widget.isSyncing ? 'Menyimpan perubahan...' : _todayLabel(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xE9FFFFFF),
                    fontSize: 13,
                    height: 1.2,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: widget.isSyncing ? null : widget.onOpenAccount,
            child: Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: EntokColors.mint,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.10),
                    blurRadius: 12,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Icon(widget.isSyncing ? Icons.sync_rounded : Icons.person_rounded, color: EntokColors.green, size: 25),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressCard(int progressPercent, int totalSelesai, int totalKegiatan) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: EntokColors.mint,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFD9F5E4)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Row(
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 52,
                  height: 52,
                  child: CircularProgressIndicator(
                    value: widget.progress,
                    backgroundColor: const Color(0xFFE2E7F0),
                    valueColor: AlwaysStoppedAnimation<Color>(_getProgressColor(progressPercent)),
                    strokeWidth: 7,
                    strokeCap: StrokeCap.round,
                  ),
                ),
                Text(
                  '$progressPercent%',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.black87),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Progress Harian',
                    style: TextStyle(fontSize: 15, color: EntokColors.text, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '$totalSelesai/$totalKegiatan selesai',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: EntokColors.muted),
                  ),
                  const SizedBox(height: 6),
                  const Row(
                    children: [
                      Icon(Icons.check_circle, size: 14, color: Color(0xFF26D057)),
                      SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Pantau pakan entok hari ini',
                          style: TextStyle(fontSize: 12, color: EntokColors.greenDark, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineItem(int index) {
    final item = widget.kegiatanList[index];
    final isDone = item['isDone'] == true;
    final taskId = '${item['taskId'] ?? item['id'] ?? ''}';
    final executionId = '${item['executionId'] ?? ''}';
    final feedingBatch = _batchForTask(taskId, executionId: executionId);
    final isFeedingTask = _isFeedingTask('${item['title'] ?? ''}');
    final batchKey = _batchExpansionKey(taskId, feedingBatch, executionId: executionId);
    final showBatchDetail = _shouldShowBatchDetail(feedingBatch, batchKey);
    final isSelected = _selectedChecklistIndex == index;
    final isCompact = isDone && !showBatchDetail && !isSelected;

    var isWaktunya = false;
    if (!isDone) {
      if (index == 0) {
        isWaktunya = true;
      } else {
        isWaktunya = widget.kegiatanList[index - 1]['isDone'] == true;
      }
    }

    final statusColor = isDone ? const Color(0xFF26D057) : (isWaktunya ? const Color(0xFFC79121) : const Color(0xFF757575));
    final statusIcon = isDone ? Icons.check_circle_rounded : Icons.access_time_rounded;

    var lineLinkColor = const Color(0xFF757575);
    if (isDone) {
      if (index + 1 < widget.kegiatanList.length) {
        lineLinkColor = widget.kegiatanList[index + 1]['isDone'] == true ? const Color(0xFF26D057) : const Color(0xFFC79121);
      } else {
        lineLinkColor = const Color(0xFF26D057);
      }
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: isDone ? const Color(0xFFE8F5E9) : Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: statusColor, width: 2),
                ),
                child: Icon(statusIcon, color: statusColor, size: 17),
              ),
              Expanded(
                child: index != widget.kegiatanList.length - 1 ? Container(width: 2, color: lineLinkColor) : const SizedBox(height: 16),
              ),
            ],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedChecklistIndex = isSelected ? null : index;
                  });
                },
                child: Container(
                  padding: EdgeInsets.all(isCompact ? 12 : 13),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: isSelected || isWaktunya ? EntokColors.green : EntokColors.border,
                      width: isSelected || isWaktunya ? 2 : 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.045),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _statusBadge(isDone, isWaktunya),
                          const Spacer(),
                          Text(
                            item['time'] ?? '',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFFD05D62),
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: isCompact ? 10 : 13),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _taskAvatar(item, size: isCompact ? 48 : 52),
                          const SizedBox(width: 11),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['title'] ?? '',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: isCompact ? 18 : 19,
                                    height: 1.12,
                                    color: EntokColors.text,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  item['desc'] ?? '',
                                  maxLines: isCompact ? 1 : 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 13, height: 1.25, color: EntokColors.muted, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          _checkBubble(isDone),
                        ],
                      ),
                      if (isFeedingTask) ...[
                        const SizedBox(height: 12),
                        if (showBatchDetail)
                          _buildFeedingBatchPanel(
                            taskId,
                            feedingBatch,
                            executionId: executionId,
                            canCollapse: feedingBatch != null && (feedingBatch.isFinalized || isDone),
                            onCollapse: () => _collapseBatchDetail(batchKey),
                          )
                        else
                          _buildFeedingBatchSummary(
                            feedingBatch,
                            onOpenDetail: () => _expandBatchDetail(batchKey),
                          ),
                      ],
                      if (isSelected && !isDone) ...[
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF1B5E20),
                              elevation: 0,
                              side: const BorderSide(color: Colors.black12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                            onPressed: widget.isSyncing || taskId.isEmpty
                                ? null
                                : () async {
                                    await widget.onStatusChanged(taskId, true);
                                    if (mounted) setState(() => _selectedChecklistIndex = null);
                                  },
                            child: const Text(
                              'Tandai Selesai',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _taskAvatar(Map<String, dynamic> item, {double size = 52}) {
    final imageUrl = '${item['imageUrl'] ?? ''}';
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: EntokColors.green, borderRadius: BorderRadius.circular(14)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: imageUrl.isNotEmpty
            ? Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Icon(item['icon'] ?? Icons.assignment, color: Colors.white, size: 28),
              )
            : Icon(item['icon'] ?? Icons.assignment, color: Colors.white, size: 28),
      ),
    );
  }

  Widget _statusBadge(bool isDone, bool isWaktunya) {
    return Container(
      padding: EdgeInsets.zero,
      child: Text(
        isDone ? 'SELESAI' : (isWaktunya ? 'WAKTUNYA' : 'BELUM WAKTUNYA'),
        style: TextStyle(
          color: isDone ? EntokColors.green : (isWaktunya ? EntokColors.warning : EntokColors.muted),
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _checkBubble(bool isDone) {
    return Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        color: isDone ? const Color(0xFF26D057) : Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: isDone ? EntokColors.green : const Color(0xFFD8DEE7), width: 3),
      ),
      child: isDone ? const Icon(Icons.check, color: Colors.white, size: 16) : null,
    );
  }

  Widget _buildFeedingBatchPanel(
    String taskId,
    FeedingBatch? batch, {
    String? executionId,
    bool canCollapse = false,
    VoidCallback? onCollapse,
  }) {
    final hasBatch = batch != null;
    final ingredients = batch?.ingredients ?? const <FeedingBatchIngredient>[];
    final groupedItems = _groupIngredientsByPhase(ingredients);
    final totalItems = _totalIngredientsByFeed(ingredients);
    final isFinalized = batch?.isFinalized == true;
    final isPreparing = batch?.isPreparing == true;
    final currentBatch = batch;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: const Color(0xFFDCE8E2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.045),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFFFF5),
                  borderRadius: BorderRadius.circular(11),
                  border: Border.all(color: const Color(0xFFD8F3E4)),
                ),
                child: const Icon(Icons.auto_awesome_rounded, color: Color(0xFF15D36B), size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Batch Racikan',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Color(0xFF102033)),
                    ),
                    const SizedBox(height: 3),
                    const Text(
                      'Data Timbangan 2 masuk ke sini. Stok dipotong saat finalisasi.',
                      style: TextStyle(fontSize: 9, color: Color(0xFF68758F), height: 1.4),
                    ),
                    if (currentBatch != null) ...[
                      const SizedBox(height: 5),
                      _batchLiveLine(currentBatch),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              _batchStatusBadge(batch),
            ],
          ),
          const SizedBox(height: 12),
          if (!hasBatch)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8F9FC),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Target racikan belum disiapkan. Data Timbangan 2 akan masuk ke batch setelah target tersedia.',
                    style: TextStyle(fontSize: 10, color: Color(0xFF718096), height: 1.5),
                  ),
                ),
                const SizedBox(height: 10),
                _primaryActionButton(
                  'Siapkan Target Racikan',
                  Icons.add_rounded,
                  () => widget.onCreateFeedingBatch(taskId, executionId),
                ),
              ],
            )
          else if (ingredients.isEmpty)
            const _BatchNotice(message: 'Batch ada, tapi belum ada detail komposisi.')
          else
            Column(
              children: [
                for (final group in groupedItems) ...[
                  _phaseGroupCard(group),
                  const SizedBox(height: 9),
                ],
                _stockSummaryCard(totalItems, isFinalized),
                if (currentBatch != null && isPreparing) ...[
                  const SizedBox(height: 10),
                  Text(
                    'Toleransi selisih: ${_fmt(currentBatch.tolerancePercent)}% per bahan.',
                    style: const TextStyle(fontSize: 10, color: Color(0xFF68758F), fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        flex: 9,
                        child: _outlineActionButton(
                          'Batal',
                          Icons.close_rounded,
                          () => _confirmBatchAction(
                            title: 'Batalkan batch?',
                            message: 'Batch racikan hari ini akan dibatalkan.',
                            action: () => widget.onCancelFeedingBatch(currentBatch.id),
                          ),
                          danger: true,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 13,
                        child: _primaryActionButton(
                          'Finalisasi',
                          Icons.done_all_rounded,
                          () => _confirmBatchAction(
                            title: 'Finalisasi batch?',
                            message: 'Stok pakan akan dipotong sesuai data timbang yang masuk.',
                            action: () => widget.onFinalizeFeedingBatch(currentBatch.id),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                if (currentBatch != null && isFinalized) ...[
                  const SizedBox(height: 8),
                  const _BatchNotice(message: 'Batch sudah final. Data timbang tersimpan dan stok sudah dipotong.'),
                  if (canCollapse && onCollapse != null) ...[
                    const SizedBox(height: 8),
                    _compactTextButton(
                      'Sembunyikan detail',
                      Icons.keyboard_arrow_up_rounded,
                      onCollapse,
                    ),
                  ],
                ],
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildFeedingBatchSummary(FeedingBatch? batch, {required VoidCallback onOpenDetail}) {
    final ingredients = batch?.ingredients ?? const <FeedingBatchIngredient>[];
    final totals = _totalIngredientsByFeed(ingredients);
    final totalDeducted = totals.fold<double>(0, (sum, item) => sum + item.deducted);
    final totalWeighed = totals.fold<double>(0, (sum, item) => sum + item.weighed);
    final displayTotal = batch?.isFinalized == true ? totalDeducted : totalWeighed;
    final isFinalized = batch?.isFinalized == true;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onOpenDetail,
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
          decoration: BoxDecoration(
            color: isFinalized ? const Color(0xFFEFFFF5) : const Color(0xFFFFFAEB),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isFinalized ? const Color(0xFFD8F3E4) : const Color(0xFFF5D58C)),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: isFinalized ? const Color(0xFFBCEFD0) : const Color(0xFFF2D89B)),
                ),
                child: Icon(
                  isFinalized ? Icons.check_circle_rounded : Icons.inventory_2_outlined,
                  color: isFinalized ? const Color(0xFF15D36B) : const Color(0xFFC79121),
                  size: 19,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isFinalized ? 'Batch final' : 'Batch racikan',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF102033)),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${totals.length} bahan - total ${_formatKg(displayTotal)} - ${isFinalized ? 'stok sudah dipotong' : 'lihat target'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF68758F)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Detail',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF1B5E20)),
              ),
              const SizedBox(width: 2),
              const Icon(Icons.chevron_right_rounded, color: Color(0xFF1B5E20), size: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _batchLiveLine(FeedingBatch batch) {
    final isLive = batch.isPreparing && !widget.hasBatchSyncIssue && widget.isLiveBatchPolling;
    final isIssue = batch.isPreparing && widget.hasBatchSyncIssue;
    final color = isIssue
        ? const Color(0xFFE53E3E)
        : isLive
            ? const Color(0xFF15D36B)
            : const Color(0xFF718096);
    final label = isIssue
        ? 'SYNC TERTUNDA'
        : isLive
            ? 'LIVE'
            : batch.isFinalized
                ? 'FINAL'
                : 'SIAP';
    final timeText = widget.lastBatchSyncAt == null ? '' : ' - update ${_timeOfDay(widget.lastBatchSyncAt!)}';

    return Row(
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            '$label$timeText',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: color),
          ),
        ),
      ],
    );
  }

  Widget _batchStatusBadge(FeedingBatch? batch) {
    final label = batch == null
        ? 'BELUM ADA'
        : batch.isFinalized
            ? 'SIAP'
            : 'DIRACIK';
    final color = batch == null
        ? const Color(0xFF757575)
        : batch.isFinalized
            ? const Color(0xFF1B5E20)
            : const Color(0xFFC79121);
    final borderColor = batch?.isFinalized == true ? const Color(0xFF15D36B) : const Color(0xFFF59E0B);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: batch == null ? Colors.black12 : borderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        child: Text(label, style: TextStyle(color: color, fontSize: 8, fontWeight: FontWeight.w900)),
      ),
    );
  }

  Widget _phaseGroupCard(_BatchPhaseGroup group) {
    final first = group.items.isEmpty ? null : group.items.first;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFDCEFE4)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
            color: const Color(0xFFEFFFF5),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    group.phase,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF15D36B),
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Text(
                  '${first?.populationCount ?? 0} ekor - target ${_fmt(first?.targetConsumption ?? 0)} gr/ekor',
                  style: const TextStyle(color: Color(0xFF68758F), fontSize: 8, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          for (final item in group.items) _batchIngredientTile(item),
        ],
      ),
    );
  }

  Widget _batchIngredientTile(FeedingBatchIngredient item) {
    final hasScaleData = item.weighedAmount > 0 || item.deductedAmount > 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFE8EEF2))),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: const BoxDecoration(color: Color(0xFFEEF8F1), shape: BoxShape.circle),
            child: Icon(_feedIcon(item.feedName), color: const Color(0xFF1B5E20), size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.feedName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, color: Color(0xFF102033), fontWeight: FontWeight.w900),
                      ),
                    ),
                    _scaleDataBadge(hasScaleData),
                  ],
                ),
                const SizedBox(height: 7),
                Row(
                  children: [
                    Expanded(child: _batchMetric('Target', _formatKg(item.plannedAmount, item.unit))),
                    const SizedBox(width: 5),
                    Expanded(child: _batchMetric('Timbang', _formatKg(item.weighedAmount, item.unit), color: hasScaleData ? const Color(0xFF102033) : const Color(0xFFA8B6C8))),
                    const SizedBox(width: 5),
                    Expanded(child: _batchMetric('Terpotong', _formatKg(item.deductedAmount, item.unit))),
                    const SizedBox(width: 5),
                    Expanded(
                      child: _batchMetric(
                        'Selisih',
                        '${item.varianceAmount > 0 ? '+' : ''}${_formatKg(item.varianceAmount, item.unit)}',
                        color: _varianceColor(item.varianceAmount),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _scaleDataBadge(bool hasScaleData) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: hasScaleData ? const Color(0xFFD4EDDA) : const Color(0xFFFFF3CD),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        hasScaleData ? 'MASUK' : 'MENUNGGU',
        style: TextStyle(
          color: hasScaleData ? const Color(0xFF155724) : const Color(0xFF856404),
          fontSize: 7,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _batchMetric(String label, String value, {Color color = const Color(0xFF102033)}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 7, color: Color(0xFF7C8AA1), fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: TextStyle(fontSize: 9, color: color, fontWeight: FontWeight.w900),
          ),
        ),
      ],
    );
  }

  Widget _stockSummaryCard(List<_FeedBatchTotal> totalItems, bool isFinalized) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFF),
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFDFE8F3)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE8EEF2)))),
            child: const Row(
              children: [
                Icon(Icons.inventory_2_outlined, color: Color(0xFF15D36B), size: 13),
                SizedBox(width: 7),
                Expanded(
                  child: Text(
                    'Total Pemotongan Stok Saat Finalisasi',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFF102033)),
                  ),
                ),
              ],
            ),
          ),
          for (final item in totalItems)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFEEF2F5)))),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      item.feedName,
                      style: const TextStyle(fontSize: 9, color: Color(0xFF102033), fontWeight: FontWeight.w900),
                    ),
                  ),
                  Text(
                    'Target ${_formatKg(item.planned)}\nPotong ${_formatKg(isFinalized ? item.deducted : item.weighed)}',
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontSize: 9, color: Color(0xFF68758F), height: 1.32, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _compactTextButton(String label, IconData icon, VoidCallback onPressed) {
    return Align(
      alignment: Alignment.centerRight,
      child: TextButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 16),
        label: Text(label),
        style: TextButton.styleFrom(
          foregroundColor: const Color(0xFF1B5E20),
          textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          minimumSize: const Size(0, 32),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
      ),
    );
  }

  Widget _primaryActionButton(String label, IconData icon, Future<void> Function() onPressed) {
    return SizedBox(
      height: 38,
      child: ElevatedButton.icon(
        onPressed: widget.isSyncing ? null : () => onPressed(),
        icon: Icon(icon, size: 15),
        label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF15D36B),
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }

  Widget _outlineActionButton(String label, IconData icon, Future<void> Function() onPressed, {bool danger = false}) {
    final color = danger ? const Color(0xFFE53E3E) : const Color(0xFF1B5E20);
    return SizedBox(
      height: 38,
      child: OutlinedButton.icon(
        onPressed: widget.isSyncing ? null : () => onPressed(),
        icon: Icon(icon, size: 15),
        label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
        style: OutlinedButton.styleFrom(
          foregroundColor: color,
          side: BorderSide(color: color),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }

  Future<void> _confirmBatchAction({
    required String title,
    required String message,
    required Future<void> Function() action,
  }) async {
    final allowed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Lanjut')),
        ],
      ),
    );
    if (allowed == true) await action();
  }

  Widget _buildErrorBox(String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFEBEE),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFFCDD2)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Color(0xFFC62828), size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Color(0xFFC62828), fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTipsBox() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: const Color(0xFF69F0AE), borderRadius: BorderRadius.circular(12)),
        child: Row(
          children: [
            const Icon(Icons.wb_sunny_rounded, color: Colors.orange, size: 24),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('TIPS HARI INI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F3E11))),
                  SizedBox(height: 2),
                  Text('Pastikan data tersimpan sebelum meninggalkan kandang.', style: TextStyle(fontSize: 12, color: Colors.black87)),
                ],
              ),
            ),
            TextButton(
              onPressed: widget.isSyncing ? null : _confirmReset,
              child: const Text(
                'Reset',
                style: TextStyle(color: Color(0xFF1B5E20), fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmReset() async {
    final shouldReset = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset checklist?'),
        content: const Text('Semua status checklist hari ini akan dikembalikan ke belum selesai.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Reset')),
        ],
      ),
    );
    if (shouldReset == true) {
      await widget.onResetDaily();
    }
  }

  Color _getProgressColor(int percent) {
    if (percent <= 25) return const Color(0xFFFF3D00);
    if (percent <= 50) return Colors.orange;
    if (percent <= 75) return Colors.yellow.shade700;
    return const Color(0xFF26D057);
  }

  FeedingBatch? _batchForTask(String taskId, {String? executionId}) {
    if (executionId != null && executionId.isNotEmpty) {
      final executionBatch = widget.batchByExecutionId[executionId];
      if (executionBatch != null) return executionBatch;

      final exactExecutionBatches = widget.feedingBatches.where((batch) => batch.taskExecutionId == executionId).toList();
      if (exactExecutionBatches.isNotEmpty) return _pickBestBatch(exactExecutionBatches);
    }

    final directBatch = widget.batchByTaskId[taskId];
    final candidates = <FeedingBatch>[
      if (directBatch != null) directBatch,
      ...widget.feedingBatches.where((batch) => batch.taskId == taskId && (batch.taskExecutionId == null || batch.taskExecutionId!.isEmpty)),
    ].fold<List<FeedingBatch>>([], (unique, batch) {
      if (!unique.any((item) => item.id == batch.id)) unique.add(batch);
      return unique;
    });
    if (candidates.isEmpty) return null;
    return _pickBestBatch(candidates);
  }

  bool _isFeedingTask(String title) => title.toLowerCase().contains('pakan');

  String _batchExpansionKey(String taskId, FeedingBatch? batch, {String? executionId}) {
    final batchId = batch?.id ?? '';
    if (batchId.isNotEmpty) return 'batch:$batchId';
    if (executionId != null && executionId.isNotEmpty) return 'execution:$executionId';
    return 'task:$taskId';
  }

  bool _shouldShowBatchDetail(FeedingBatch? batch, String batchKey) {
    if (batch == null) return true;
    if (batch.isPreparing && !batch.isFinalized) return true;
    return _expandedBatchKeys.contains(batchKey);
  }

  void _expandBatchDetail(String batchKey) {
    setState(() => _expandedBatchKeys.add(batchKey));
  }

  void _collapseBatchDetail(String batchKey) {
    setState(() => _expandedBatchKeys.remove(batchKey));
  }

  FeedingBatch? _pickBestBatch(List<FeedingBatch> batches) {
    if (batches.isEmpty) return null;
    final sorted = [...batches];
    sorted.sort((a, b) {
      final rankDiff = _batchRank(b) - _batchRank(a);
      if (rankDiff != 0) return rankDiff;
      return _batchTime(b).compareTo(_batchTime(a));
    });
    return sorted.first;
  }

  int _batchRank(FeedingBatch batch) {
    if (batch.isFinalized) return 4;
    if (batch.isPreparing && batch.hasScaleData) return 3;
    if (batch.isPreparing) return 2;
    return 1;
  }

  DateTime _batchTime(FeedingBatch batch) {
    return DateTime.tryParse(batch.finalizedAt ?? '') ??
        DateTime.tryParse(batch.createdAt ?? '') ??
        DateTime.tryParse(batch.tanggal) ??
        DateTime.fromMillisecondsSinceEpoch(0);
  }

  List<_BatchPhaseGroup> _groupIngredientsByPhase(List<FeedingBatchIngredient> ingredients) {
    final groups = <String, List<FeedingBatchIngredient>>{};
    for (final item in ingredients) {
      final phase = item.phase.isEmpty ? 'Gabungan' : item.phase;
      groups.putIfAbsent(phase, () => <FeedingBatchIngredient>[]).add(item);
    }
    return groups.entries.map((entry) => _BatchPhaseGroup(entry.key, entry.value)).toList();
  }

  List<_FeedBatchTotal> _totalIngredientsByFeed(List<FeedingBatchIngredient> ingredients) {
    final totals = <String, _FeedBatchTotal>{};
    for (final item in ingredients) {
      final key = item.feedId?.isNotEmpty == true ? item.feedId! : item.feedName.toLowerCase();
      final current = totals[key] ?? _FeedBatchTotal(feedName: item.feedName);
      totals[key] = current.copyWith(
        planned: current.planned + item.plannedAmount,
        weighed: current.weighed + item.weighedAmount,
        deducted: current.deducted + item.deductedAmount,
      );
    }
    final values = totals.values.toList();
    values.sort((a, b) => a.feedName.compareTo(b.feedName));
    return values;
  }

  Color _varianceColor(double value) {
    if (value.abs() <= 0.01) return const Color(0xFF155724);
    if (value > 0) return const Color(0xFFE53E3E);
    return const Color(0xFFD69E2E);
  }

  IconData _feedIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('jagung')) return Icons.grain_rounded;
    if (lower.contains('azolla') || lower.contains('rumput') || lower.contains('hijau')) return Icons.grass_rounded;
    if (lower.contains('dedak') || lower.contains('bekatul')) return Icons.rice_bowl_rounded;
    if (lower.contains('protein') || lower.contains('bsf') || lower.contains('ikan')) return Icons.egg_alt_rounded;
    return Icons.restaurant_menu_rounded;
  }

  String _formatKg(double value, [String unit = 'kg']) => '${_fmt(value)} $unit';

  String _fmt(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }

  String _timeOfDay(DateTime value) {
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    final second = value.second.toString().padLeft(2, '0');
    return '$hour:$minute:$second';
  }

  String _todayLabel() {
    final now = DateTime.now();
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return '${days[now.weekday - 1]}, ${now.day} ${months[now.month - 1]} ${now.year}';
  }
}

class _BatchPhaseGroup {
  final String phase;
  final List<FeedingBatchIngredient> items;

  const _BatchPhaseGroup(this.phase, this.items);
}

class _FeedBatchTotal {
  final String feedName;
  final double planned;
  final double weighed;
  final double deducted;

  const _FeedBatchTotal({
    required this.feedName,
    this.planned = 0,
    this.weighed = 0,
    this.deducted = 0,
  });

  _FeedBatchTotal copyWith({
    double? planned,
    double? weighed,
    double? deducted,
  }) {
    return _FeedBatchTotal(
      feedName: feedName,
      planned: planned ?? this.planned,
      weighed: weighed ?? this.weighed,
      deducted: deducted ?? this.deducted,
    );
  }
}

class _BatchNotice extends StatelessWidget {
  final String message;

  const _BatchNotice({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FC),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        message,
        style: const TextStyle(fontSize: 10, color: Color(0xFF718096), height: 1.5),
      ),
    );
  }
}
