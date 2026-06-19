import 'package:flutter/material.dart';

import 'models/keeper_models.dart';
import 'screens/checklist_screen.dart';
import 'screens/home_screen.dart';
import 'screens/panduan_screen.dart';
import 'services/api_service.dart';

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

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 1;
  bool _isLoading = true;
  bool _isSyncing = false;
  String? _error;

  List<DailyChecklistItem> _checklist = [];
  List<KeeperTask> _tasks = [];
  List<FeedItem> _feeds = [];
  List<FormulationItem> _formulations = [];
  List<PopulationPhase> _populations = [];
  List<FeedingBatch> _feedingBatches = [];

  @override
  void initState() {
    super.initState();
    _loadDailyData();
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
        'title': item.nama,
        'time': item.waktu,
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
      if (taskId != null && taskId.isNotEmpty) {
        map[taskId] = batch;
      }
    }
    return map;
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
      });
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

  Future<void> _createFeedingBatch(String taskId) async {
    await _runAction(() async {
      await widget.api.createFeedingBatch(_today, taskId);
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
        onLogout: widget.onLogout,
      ),
      ChecklistScreen(
        kegiatanList: _kegiatanList,
        progress: _progress,
        isSyncing: _isSyncing,
        error: _error,
        feedingBatches: _feedingBatches,
        batchByTaskId: _batchByTaskId,
        onStatusChanged: _toggleTask,
        onCreateFeedingBatch: _createFeedingBatch,
        onFinalizeFeedingBatch: _finalizeFeedingBatch,
        onCancelFeedingBatch: _cancelFeedingBatch,
        onResetDaily: _resetDailyChecklist,
        onRefresh: () => _loadDailyData(showLoading: false),
      ),
      PanduanScreen(
        api: widget.api,
        tasks: _tasks,
        feeds: _feeds,
        formulations: _formulations,
        populations: _populations,
        onTabSwitch: (index) => setState(() => _currentIndex = index),
      ),
    ];

    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Container(
            color: Colors.white,
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
      height: 58,
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF26D057),
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
    final color = isActive ? const Color(0xFF1B5E20) : Colors.white;
    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isActive ? solidIcon : outlineIcon, color: color, size: 22),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
