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
    final totalPlanned = ingredients.fold<double>(0, (sum, item) => sum + item.plannedAmount);
    final totalWeighed = ingredients.fold<double>(0, (sum, item) => sum + item.weighedAmount);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0x33000000),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Racikan pakan hari ini',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F3E11)),
                ),
              ),
              _batchStatusBadge(batch),
            ],
          ),
          const SizedBox(height: 8),
          if (!hasBatch)
            const Text(
              'Batch racikan belum dibuat dari backend.',
              style: TextStyle(fontSize: 12, color: Colors.black54),
            )
          else if (ingredients.isEmpty)
            const Text(
              'Batch ada, tapi belum ada detail komposisi.',
              style: TextStyle(fontSize: 12, color: Colors.black54),
            )
          else
            ...ingredients.take(6).map((item) {
              final phase = item.phase.isEmpty ? '' : ' (${item.phase})';
              return _pakanRow(
                '${item.feedName}$phase',
                '${_fmt(item.weighedAmount)}/${_fmt(item.plannedAmount)} ${item.unit}',
              );
            }),
          if (ingredients.length > 6)
            Text(
              '+${ingredients.length - 6} item lainnya',
              style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600),
            ),
          const Divider(color: Colors.black12, height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F3E11))),
              Text(
                '${_fmt(totalWeighed)}/${_fmt(totalPlanned)} kg',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey.shade900),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (!hasBatch)
            _smallActionButton('Buat Racikan', Icons.add_rounded, () => widget.onCreateFeedingBatch(taskId))
          else
            Row(
              children: [
                if (!batch.isFinalized)
                  Expanded(
                    child: _smallActionButton('Finalisasi', Icons.done_all_rounded, () => widget.onFinalizeFeedingBatch(batch.id)),
                  ),
                if (!batch.isFinalized) const SizedBox(width: 8),
                Expanded(
                  child: _smallActionButton('Batalkan', Icons.close_rounded, () => widget.onCancelFeedingBatch(batch.id), danger: true),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _batchStatusBadge(FeedingBatch? batch) {
    final label = batch == null ? 'BELUM ADA' : batch.status;
    final color = batch == null
        ? const Color(0xFF757575)
        : batch.isFinalized
            ? const Color(0xFF1B5E20)
            : const Color(0xFFC79121);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
    );
  }

  Widget _smallActionButton(String label, IconData icon, Future<void> Function() onPressed, {bool danger = false}) {
    return SizedBox(
      height: 34,
      child: ElevatedButton.icon(
        onPressed: widget.isSyncing ? null : () => onPressed(),
        icon: Icon(icon, size: 15),
        label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
        style: ElevatedButton.styleFrom(
          backgroundColor: danger ? const Color(0xFFFFEBEE) : Colors.white,
          foregroundColor: danger ? const Color(0xFFC62828) : const Color(0xFF1B5E20),
          elevation: 0,
          side: BorderSide(color: danger ? const Color(0xFFFFCDD2) : Colors.black12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
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

  Widget _pakanRow(String nama, String bobot) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(nama, style: const TextStyle(fontSize: 12, color: Colors.black87))),
          const SizedBox(width: 10),
          Text(bobot, style: TextStyle(fontSize: 12, color: Colors.grey.shade900, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  FeedingBatch? _batchForTask(String taskId) {
    if (widget.batchByTaskId.containsKey(taskId)) return widget.batchByTaskId[taskId];
    for (final batch in widget.feedingBatches) {
      if (batch.taskId == null || batch.taskId!.isEmpty) return batch;
    }
    return widget.feedingBatches.isNotEmpty ? widget.feedingBatches.first : null;
  }

  bool _isFeedingTask(String title) => title.toLowerCase().contains('pakan');

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
