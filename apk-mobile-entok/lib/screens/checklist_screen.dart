import 'package:flutter/material.dart';

import '../models/keeper_models.dart';

class ChecklistScreen extends StatefulWidget {
  final List<Map<String, dynamic>> kegiatanList;
  final double progress;
  final bool isSyncing;
  final String? error;
  final List<FeedingBatch> feedingBatches;
  final Map<String, FeedingBatch> batchByTaskId;
  final Future<void> Function(String taskId, bool status) onStatusChanged;
  final Future<void> Function(String taskId) onCreateFeedingBatch;
  final Future<void> Function(String batchId) onFinalizeFeedingBatch;
  final Future<void> Function(String batchId) onCancelFeedingBatch;
  final Future<void> Function() onResetDaily;
  final Future<void> Function() onRefresh;

  const ChecklistScreen({
    super.key,
    required this.kegiatanList,
    required this.progress,
    required this.isSyncing,
    required this.error,
    required this.feedingBatches,
    required this.batchByTaskId,
    required this.onStatusChanged,
    required this.onCreateFeedingBatch,
    required this.onFinalizeFeedingBatch,
    required this.onCancelFeedingBatch,
    required this.onResetDaily,
    required this.onRefresh,
  });

  @override
  State<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends State<ChecklistScreen> {
  int? _selectedChecklistIndex;

  @override
  Widget build(BuildContext context) {
    final totalSelesai = widget.kegiatanList.where((item) => item['isDone'] == true).length;
    final totalKegiatan = widget.kegiatanList.length;
    final progressPercent = (widget.progress * 100).toInt();

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
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
                        const SizedBox(height: 16),
                        if (widget.error != null) ...[
                          _buildErrorBox(widget.error!),
                          const SizedBox(height: 16),
                        ],
                        _buildProgressCard(progressPercent, totalSelesai, totalKegiatan),
                        const SizedBox(height: 16),
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
                      padding: const EdgeInsets.symmetric(horizontal: 20),
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
      color: const Color(0xFF26D057),
      padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 16, 20, 20),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(color: Color(0xFFFF5722), shape: BoxShape.circle),
            child: const Icon(Icons.face_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Checklist Kegiatan',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.isSyncing ? 'Sinkronisasi data server...' : _todayLabel(),
                  style: const TextStyle(color: Color(0xCCFFFFFF), fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 32,
            height: 32,
            child: IconButton(
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: Icon(
                widget.isSyncing ? Icons.sync_rounded : Icons.refresh_rounded,
                color: Colors.white,
                size: 22,
              ),
              onPressed: widget.isSyncing ? null : () => widget.onRefresh(),
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
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
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
                  width: 74,
                  height: 74,
                  child: CircularProgressIndicator(
                    value: widget.progress,
                    backgroundColor: const Color(0xFFE8F5E9),
                    valueColor: AlwaysStoppedAnimation<Color>(_getProgressColor(progressPercent)),
                    strokeWidth: 8,
                    strokeCap: StrokeCap.round,
                  ),
                ),
                Text(
                  '$progressPercent%',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
              ],
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Progress Hari ini',
                    style: TextStyle(fontSize: 14, color: Colors.grey, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$totalSelesai/$totalKegiatan kegiatan sudah selesai',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: _getProgressColor(progressPercent)),
                  ),
                  const SizedBox(height: 8),
                  const Row(
                    children: [
                      Icon(Icons.check_circle, size: 16, color: Color(0xFF26D057)),
                      SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Data checklist tersimpan di server',
                          style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500),
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
    final feedingBatch = _batchForTask(taskId);

    var isWaktunya = false;
    if (!isDone) {
      if (index == 0) {
        isWaktunya = true;
      } else {
        isWaktunya = widget.kegiatanList[index - 1]['isDone'] == true;
      }
    }

    final isSelected = _selectedChecklistIndex == index;
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
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: isDone ? const Color(0xFFE8F5E9) : Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: statusColor, width: 2),
                ),
                child: Icon(statusIcon, color: statusColor, size: 18),
              ),
              Expanded(
                child: index != widget.kegiatanList.length - 1 ? Container(width: 2, color: lineLinkColor) : const SizedBox(height: 16),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedChecklistIndex = isSelected ? null : index;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDone ? const Color(0xFFC8E6C9) : const Color(0xFFC2F8C4),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isSelected ? const Color(0xFF26D057) : Colors.transparent, width: 2),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _taskAvatar(item),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['title'] ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F3E11)),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  item['time'] ?? '',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF2E5A30)),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 4),
                          _statusBadge(isDone, isWaktunya),
                          const SizedBox(width: 8),
                          _checkBubble(isDone),
                        ],
                      ),
                      if (_isFeedingTask(item['title'] ?? '')) ...[
                        const SizedBox(height: 12),
                        _buildFeedingBatchPanel(taskId, feedingBatch),
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

  Widget _taskAvatar(Map<String, dynamic> item) {
    final imageUrl = '${item['imageUrl'] ?? ''}';
    return Container(
      width: 40,
      height: 40,
      decoration: const BoxDecoration(color: Colors.white60, shape: BoxShape.circle),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: imageUrl.isNotEmpty
            ? Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Icon(item['icon'] ?? Icons.assignment, color: const Color(0xFF1B5E20), size: 20),
              )
            : Icon(item['icon'] ?? Icons.assignment, color: const Color(0xFF1B5E20), size: 20),
      ),
    );
  }

  Widget _statusBadge(bool isDone, bool isWaktunya) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isDone ? const Color(0xFF26D057) : (isWaktunya ? const Color(0xFFC79121) : const Color(0xFF757575)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        isDone ? 'Selesai' : (isWaktunya ? 'Waktunya' : 'Belum'),
        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _checkBubble(bool isDone) {
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: isDone ? const Color(0xFF26D057) : Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFF2E7D32), width: 2),
      ),
      child: isDone ? const Icon(Icons.check, color: Colors.white, size: 12) : null,
    );
  }

  Widget _buildFeedingBatchPanel(String taskId, FeedingBatch? batch) {
    final hasBatch = batch != null;
    final ingredients = batch?.ingredients ?? const <FeedingBatchIngredient>[];
    final groupedItems = _groupIngredientsByPhase(ingredients);
    final totalItems = _totalIngredientsByFeed(ingredients);
    final isFinalized = batch?.isFinalized == true;
    final isPreparing = batch?.isPreparing == true;
    final currentBatch = batch;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFDCE8E2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.07),
            blurRadius: 18,
            offset: const Offset(0, 8),
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
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFFFF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFD8F3E4)),
                ),
                child: const Icon(Icons.auto_awesome_rounded, color: Color(0xFF15D36B), size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Batch Racikan',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, color: Color(0xFF102033)),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Data Timbangan 2 masuk ke sini. Stok dipotong saat finalisasi.',
                      style: TextStyle(fontSize: 9, color: Color(0xFF68758F), height: 1.4),
                    ),
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
                  () => widget.onCreateFeedingBatch(taskId),
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
                  const SizedBox(height: 12),
                ],
                _stockSummaryCard(totalItems, isFinalized),
                if (currentBatch != null && isPreparing) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Toleransi selisih: ${_fmt(currentBatch.tolerancePercent)}% per bahan.',
                    style: const TextStyle(fontSize: 10, color: Color(0xFF68758F), fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 10),
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
                  const SizedBox(height: 10),
                  const _BatchNotice(message: 'Batch sudah final. Data timbang tersimpan dan stok sudah dipotong.'),
                ],
              ],
            ),
        ],
      ),
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
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Text(label, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w900)),
      ),
    );
  }

  Widget _phaseGroupCard(_BatchPhaseGroup group) {
    final first = group.items.isEmpty ? null : group.items.first;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCEFE4)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
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
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Text(
                  '${first?.populationCount ?? 0} ekor - target ${_fmt(first?.targetConsumption ?? 0)} gr/ekor',
                  style: const TextStyle(color: Color(0xFF68758F), fontSize: 9, fontWeight: FontWeight.w700),
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
      padding: const EdgeInsets.all(10),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFE8EEF2))),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(color: Color(0xFFEEF8F1), shape: BoxShape.circle),
            child: Icon(_feedIcon(item.feedName), color: const Color(0xFF1B5E20), size: 20),
          ),
          const SizedBox(width: 10),
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
                        style: const TextStyle(fontSize: 12, color: Color(0xFF102033), fontWeight: FontWeight.w900),
                      ),
                    ),
                    _scaleDataBadge(hasScaleData),
                  ],
                ),
                const SizedBox(height: 9),
                Row(
                  children: [
                    Expanded(child: _batchMetric('Target', _formatKg(item.plannedAmount, item.unit))),
                    const SizedBox(width: 7),
                    Expanded(child: _batchMetric('Timbang', _formatKg(item.weighedAmount, item.unit), color: hasScaleData ? const Color(0xFF102033) : const Color(0xFFA8B6C8))),
                    const SizedBox(width: 7),
                    Expanded(child: _batchMetric('Terpotong', _formatKg(item.deductedAmount, item.unit))),
                    const SizedBox(width: 7),
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: hasScaleData ? const Color(0xFFD4EDDA) : const Color(0xFFFFF3CD),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        hasScaleData ? 'MASUK' : 'MENUNGGU',
        style: TextStyle(
          color: hasScaleData ? const Color(0xFF155724) : const Color(0xFF856404),
          fontSize: 8,
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
          style: const TextStyle(fontSize: 8, color: Color(0xFF7C8AA1), fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w900),
          ),
        ),
      ],
    );
  }

  Widget _stockSummaryCard(List<_FeedBatchTotal> totalItems, bool isFinalized) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFF),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFDFE8F3)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE8EEF2)))),
            child: const Row(
              children: [
                Icon(Icons.inventory_2_outlined, color: Color(0xFF15D36B), size: 13),
                SizedBox(width: 7),
                Expanded(
                  child: Text(
                    'Total Pemotongan Stok Saat Finalisasi',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF102033)),
                  ),
                ),
              ],
            ),
          ),
          for (final item in totalItems)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFEEF2F5)))),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      item.feedName,
                      style: const TextStyle(fontSize: 10, color: Color(0xFF102033), fontWeight: FontWeight.w900),
                    ),
                  ),
                  Text(
                    'Target ${_formatKg(item.planned)}\nPotong ${_formatKg(isFinalized ? item.deducted : item.weighed)}',
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontSize: 10, color: Color(0xFF68758F), height: 1.35, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
        ],
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

  FeedingBatch? _batchForTask(String taskId) {
    final directBatch = widget.batchByTaskId[taskId];
    final candidates = <FeedingBatch>[
      if (directBatch != null) directBatch,
      ...widget.feedingBatches.where((batch) => batch.taskId == taskId),
      ...widget.feedingBatches.where((batch) => batch.taskId == null || batch.taskId!.isEmpty),
    ].fold<List<FeedingBatch>>([], (unique, batch) {
      if (!unique.any((item) => item.id == batch.id)) unique.add(batch);
      return unique;
    });
    if (candidates.isEmpty) return _pickBestBatch(widget.feedingBatches);
    return _pickBestBatch(candidates);
  }

  bool _isFeedingTask(String title) => title.toLowerCase().contains('pakan');

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

  String _todayLabel() {
    final now = DateTime.now().toUtc().add(const Duration(hours: 8));
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
