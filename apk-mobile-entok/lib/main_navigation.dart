import 'dart:async';

import 'package:flutter/material.dart';

import 'models/keeper_models.dart';
import 'screens/account_screen.dart';
import 'screens/checklist_screen.dart';
import 'screens/home_screen.dart';
import 'screens/panduan_screen.dart';
import 'services/api_service.dart';
import 'services/task_reminder_service.dart';
import 'theme/app_theme.dart';

class MainNavigationScreen extends StatefulWidget {
  final ApiService api;
  final Future<void> Function() onLogout;

  const MainNavigationScreen({
    super.key,
    required this.api,
    required this.onLogout,
  });

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> with WidgetsBindingObserver {
  static const int _checklistTabIndex = 1;
  static const Duration _batchPollInterval = Duration(seconds: 2);
  static const Duration _batchErrorBackoff = Duration(seconds: 10);
  static const Duration _resumeRefreshInterval = Duration(seconds: 20);

  int _currentIndex = 1;
  bool _isLoading = true;
  bool _isSyncing = false;
  bool _isBatchPolling = false;
  bool _isAppForeground = true;
  String? _error;
  Timer? _batchRefreshTimer;
  DateTime? _lastDataLoadAt;
  DateTime? _lastBatchSyncAt;
  DateTime? _nextBatchSyncAttemptAt;
  int _batchSyncFailureCount = 0;
  bool _hasBatchSyncIssue = false;

  List<DailyChecklistItem> _checklist = [];
  List<KeeperTask> _tasks = [];
  List<FeedItem> _feeds = [];
  List<FormulationItem> _formulations = [];
  List<PopulationPhase> _populations = [];
  List<FeedingBatch> _feedingBatches = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadDailyData();
    _batchRefreshTimer = Timer.periodic(_batchPollInterval, (_) => _syncFeedingBatchesSilently());
  }

  @override
  void dispose() {
    _batchRefreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _isAppForeground = true;
      unawaited(_refreshIfStale(_resumeRefreshInterval));
      unawaited(_syncFeedingBatchesSilently(force: true));
    } else if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      _isAppForeground = false;
    }
  }

  String get _today {
    final wita = DateTime.now().toUtc().add(const Duration(hours: 8));
    final month = wita.month.toString().padLeft(2, '0');
    final day = wita.day.toString().padLeft(2, '0');
    return '${wita.year}-$month-$day';
  }

  double get _progress {
    if (_kegiatanList.isEmpty) return 0.0;
    final done = _kegiatanList.where((item) => item['isDone'] == true).length;
    return done / _kegiatanList.length;
  }

  List<Map<String, dynamic>> get _kegiatanList {
    final source = _checklist.isNotEmpty ? _checklist : _tasks;
    return source.map((item) {
      final isChecklist = item is DailyChecklistItem;
      return {
        'id': item.id,
        'taskId': isChecklist ? item.taskId : item.id,
        'executionId': isChecklist ? item.executionId : '',
        'title': item.nama,
        'time': TaskReminderService.formatTaskTimeForDisplay(item.waktu),
        'desc': item.deskripsi,
        'imageUrl': widget.api.assetUrl(item.img),
        'isDone': isChecklist ? item.isCompleted : false,
        'icon': _iconForTask(item.nama),
        'infoDetail': item.infoDetail,
        'perhatikan': item.perhatikan,
        'catatan': item.catatan,
        'langkah': item.langkah,
      };
    }).toList();
  }

  Map<String, FeedingBatch> get _batchByTaskId {
    final map = <String, FeedingBatch>{};
    for (final batch in _feedingBatches) {
      final taskId = batch.taskId;
      final executionId = batch.taskExecutionId;
      if (taskId != null && taskId.isNotEmpty && (executionId == null || executionId.isEmpty)) {
        map[taskId] = batch;
      }
    }
    return map;
  }

  Map<String, FeedingBatch> get _batchByExecutionId {
    final map = <String, FeedingBatch>{};
    for (final batch in _feedingBatches) {
      final executionId = batch.taskExecutionId;
      if (executionId != null && executionId.isNotEmpty) {
        map[executionId] = batch;
      }
    }
    return map;
  }

  bool get _hasPreparingBatch {
    return _feedingBatches.any((batch) => batch.isPreparing && !batch.isFinalized);
  }

  Future<void> _refreshIfStale(Duration minimumAge) async {
    if (!mounted || _isLoading || _isSyncing) return;
    final lastLoad = _lastDataLoadAt;
    if (lastLoad != null && DateTime.now().difference(lastLoad) < minimumAge) return;
    await _loadDailyData(showLoading: false);
  }

  Future<void> _syncFeedingBatchesSilently({bool force = false}) async {
    if (!mounted || !_isAppForeground || _currentIndex != _checklistTabIndex) return;
    if (_isLoading || _isSyncing || _isBatchPolling) return;
    if (!force && !_hasPreparingBatch) return;

    final nextAttempt = _nextBatchSyncAttemptAt;
    if (nextAttempt != null && DateTime.now().isBefore(nextAttempt)) return;

    _isBatchPolling = true;
    try {
      final batches = await widget.api.getTodayBatches(_today);
      if (!mounted) return;

      final wasSyncIssue = _hasBatchSyncIssue;
      _batchSyncFailureCount = 0;
      _hasBatchSyncIssue = false;
      _nextBatchSyncAttemptAt = null;

      final now = DateTime.now();
      final batchChanged = _feedingBatchSignature(batches) != _feedingBatchSignature(_feedingBatches);
      final shouldRefreshSyncUi = wasSyncIssue || _lastBatchSyncAt == null || now.difference(_lastBatchSyncAt!) >= const Duration(seconds: 10);

      _lastBatchSyncAt = now;
      if (batchChanged) {
        setState(() {
          _feedingBatches = batches;
        });
      } else if (shouldRefreshSyncUi) {
        setState(() {});
      }
    } on ApiException catch (err) {
      if (err.statusCode == 401 || err.statusCode == 403) {
        await widget.onLogout();
        return;
      }
      _markBatchSyncFailed();
    } catch (_) {
      _markBatchSyncFailed();
    } finally {
      _isBatchPolling = false;
    }
  }

  void _markBatchSyncFailed() {
    _batchSyncFailureCount += 1;
    if (_batchSyncFailureCount >= 3) {
      _nextBatchSyncAttemptAt = DateTime.now().add(_batchErrorBackoff);
      if (!_hasBatchSyncIssue && mounted) {
        setState(() => _hasBatchSyncIssue = true);
      } else {
        _hasBatchSyncIssue = true;
      }
    }
  }

  String _feedingBatchSignature(List<FeedingBatch> batches) {
    final parts = batches.map((batch) {
      final ingredients = [...batch.ingredients]
        ..sort((a, b) {
          final phaseCompare = a.phase.compareTo(b.phase);
          if (phaseCompare != 0) return phaseCompare;
          return a.feedName.compareTo(b.feedName);
        });
      final ingredientParts = ingredients.map((item) {
        return [
          item.id,
          item.feedId ?? '',
          item.phaseId ?? '',
          item.feedName,
          item.phase,
          item.populationCount,
          item.targetConsumption.toStringAsFixed(3),
          item.plannedAmount.toStringAsFixed(3),
          item.weighedAmount.toStringAsFixed(3),
          item.deductedAmount.toStringAsFixed(3),
          item.varianceAmount.toStringAsFixed(3),
          item.unit,
        ].join(':');
      }).join(',');

      return [
        batch.id,
        batch.tanggal,
        batch.taskId ?? '',
        batch.taskExecutionId ?? '',
        batch.status,
        batch.tolerancePercent.toStringAsFixed(3),
        batch.finalizedAt ?? '',
        ingredientParts,
      ].join('|');
    }).toList()
      ..sort();

    return parts.join('||');
  }

  Future<void> _loadDailyData({bool showLoading = true}) async {
    if (showLoading) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    } else {
      setState(() => _isSyncing = true);
    }

    try {
      final checklistFuture = widget.api.getChecklist(_today);
      final tasksFuture = widget.api.getTasks();
      final feedsFuture = widget.api.getFeeds();
      final formulationsFuture = widget.api.getFormulations();
      final populationsFuture = widget.api.getPopulations();
      final batchesFuture = widget.api.getTodayBatches(_today);

      final checklist = await checklistFuture;
      final tasks = await tasksFuture;
      final feeds = await feedsFuture;
      final formulations = await formulationsFuture;
      final populations = await populationsFuture;
      final batches = await batchesFuture;

      if (!mounted) return;
      setState(() {
        _checklist = checklist;
        _tasks = tasks;
        _feeds = feeds;
        _formulations = formulations;
        _populations = populations;
        _feedingBatches = batches;
        _error = null;
        _lastDataLoadAt = DateTime.now();
        _lastBatchSyncAt = DateTime.now();
        _hasBatchSyncIssue = false;
      });

      final reminderTasks = checklist.isNotEmpty ? checklist : tasks;
      unawaited(_syncNotifications(reminderTasks, feeds));
    } on ApiException catch (err) {
      if (err.statusCode == 401 || err.statusCode == 403) {
        await widget.onLogout();
        return;
      }
      if (mounted) setState(() => _error = err.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Gagal memuat data penjaga dari server.');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isSyncing = false;
        });
      }
    }
  }

  Future<void> _syncNotifications(List<KeeperTask> tasks, List<FeedItem> feeds) async {
    try {
      await TaskReminderService.instance.scheduleDailyTaskReminders(
        date: _today,
        tasks: tasks,
      );
      await TaskReminderService.instance.notifyLowFeedStock(
        date: _today,
        feeds: feeds,
      );
    } catch (_) {
      // Checklist tetap bisa dipakai walau izin notifikasi ditolak atau OS membatasi alarm.
    }
  }

  Future<void> _toggleTask(String taskId, bool isCompleted) async {
    await _runAction(() async {
      await widget.api.toggleChecklist(
        taskId: taskId,
        date: _today,
        isCompleted: isCompleted,
      );
      await _loadDailyData(showLoading: false);
    });
  }

  Future<void> _createFeedingBatch(String taskId, [String? taskExecutionId]) async {
    await _runAction(() async {
      await widget.api.createFeedingBatch(_today, taskId, taskExecutionId);
      await _loadDailyData(showLoading: false);
    });
  }

  Future<void> _finalizeFeedingBatch(String batchId) async {
    await _runAction(() async {
      await widget.api.finalizeFeedingBatch(batchId);
      await _loadDailyData(showLoading: false);
    });
  }

  Future<void> _cancelFeedingBatch(String batchId) async {
    await _runAction(() async {
      await widget.api.cancelFeedingBatch(batchId);
      await _loadDailyData(showLoading: false);
    });
  }

  Future<void> _resetDailyChecklist() async {
    await _runAction(() async {
      await widget.api.resetChecklist(_today);
      await _loadDailyData(showLoading: false);
    });
  }

  Future<void> _runAction(Future<void> Function() action) async {
    setState(() {
      _isSyncing = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (err) {
      if (mounted) setState(() => _error = err.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Aksi gagal diproses. Coba lagi.');
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  IconData _iconForTask(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('pakan')) return Icons.set_meal_rounded;
    if (lower.contains('air') || lower.contains('minum')) return Icons.water_drop_rounded;
    if (lower.contains('bersih') || lower.contains('kandang')) return Icons.cleaning_services_rounded;
    if (lower.contains('panen') || lower.contains('pertanian')) return Icons.agriculture_rounded;
    return Icons.assignment_turned_in_rounded;
  }

  Future<void> _openAccount() async {
    final updatedUser = await Navigator.push<AppUser?>(
      context,
      MaterialPageRoute(
        builder: (context) => AccountScreen(
          api: widget.api,
          user: widget.api.user,
          onLogout: widget.onLogout,
          onNotificationSettingsChanged: _syncCurrentNotifications,
        ),
      ),
    );

    if (updatedUser != null && mounted) {
      setState(() {});
    }
    unawaited(_syncCurrentNotifications());
  }

  Future<void> _syncCurrentNotifications() async {
    final reminderTasks = _checklist.isNotEmpty ? _checklist : _tasks;
    if (!mounted || reminderTasks.isEmpty) return;
    await _syncNotifications(reminderTasks, _feeds);
  }

  void _switchTab(int index) {
    if (_currentIndex == index) return;
    setState(() => _currentIndex = index);
    if (index == _checklistTabIndex) {
      unawaited(_refreshIfStale(_resumeRefreshInterval));
      unawaited(_syncFeedingBatchesSilently(force: true));
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(
        user: widget.api.user,
        kegiatanList: _kegiatanList,
        progress: _progress,
        isSyncing: _isSyncing,
        error: _error,
        onRefresh: () => _loadDailyData(showLoading: false),
        onOpenAccount: _openAccount,
      ),
      ChecklistScreen(
        kegiatanList: _kegiatanList,
        progress: _progress,
        isSyncing: _isSyncing,
        error: _error,
        feedingBatches: _feedingBatches,
        batchByTaskId: _batchByTaskId,
        batchByExecutionId: _batchByExecutionId,
        isLiveBatchPolling: _currentIndex == _checklistTabIndex && _hasPreparingBatch && !_hasBatchSyncIssue,
        hasBatchSyncIssue: _hasBatchSyncIssue,
        lastBatchSyncAt: _lastBatchSyncAt,
        onStatusChanged: _toggleTask,
        onCreateFeedingBatch: _createFeedingBatch,
        onFinalizeFeedingBatch: _finalizeFeedingBatch,
        onCancelFeedingBatch: _cancelFeedingBatch,
        onResetDaily: _resetDailyChecklist,
        onRefresh: () => _loadDailyData(showLoading: false),
        onOpenAccount: _openAccount,
      ),
      PanduanScreen(
        api: widget.api,
        tasks: _tasks,
        feeds: _feeds,
        formulations: _formulations,
        populations: _populations,
        onTabSwitch: _switchTab,
        onOpenAccount: _openAccount,
      ),
    ];

    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Container(
            color: EntokColors.background,
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF26D057)))
                : Column(
                    children: [
                      Expanded(child: pages[_currentIndex]),
                      _buildBottomNavigationBar(),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNavigationBar() {
    return Container(
      height: 74,
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(Icons.home_outlined, Icons.home_rounded, 'Home', 0),
          _buildNavItem(Icons.assignment_outlined, Icons.assignment_turned_in_rounded, 'Checklist', 1),
          _buildNavItem(Icons.help_center_outlined, Icons.help_center_rounded, 'Panduan', 2),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData outlineIcon, IconData solidIcon, String label, int index) {
    final isActive = _currentIndex == index;
    final color = isActive ? EntokColors.green : const Color(0xFF697281);
    return InkWell(
      onTap: () {
        _switchTab(index);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isActive ? solidIcon : outlineIcon, color: color, size: 30),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 15,
                fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
