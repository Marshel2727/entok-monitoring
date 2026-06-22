import 'dart:math';
import 'dart:typed_data';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../models/keeper_models.dart';

class TaskReminderService {
  TaskReminderService._();

  static final TaskReminderService instance = TaskReminderService._();

  static const _scheduledIdsKey = 'entok_task_reminder_notification_ids';
  static const _reminderLeadOptionKey = 'entok_task_reminder_lead_option';
  static const _customReminderMinutesKey = 'entok_custom_reminder_minutes';
  static const _notificationSettingPrefix = 'entok_notification_setting_';
  static const _stockAlertIdsPrefix = 'entok_stock_alert_ids_';
  static const _missedAlertIdsPrefix = 'entok_missed_task_alert_ids_';
  static const _channelId = 'entok_task_reminders_v2';
  static const _channelName = 'Pengingat Tugas';
  static const _channelDescription = 'Notifikasi pengingat sebelum jadwal tugas penjaga.';
  static const _witaLocationName = 'Asia/Makassar';

  static const reminderOneMinute = '1';
  static const reminderThirtyMinutes = '30';
  static const reminderOneHour = '60';
  static const reminderBoth = 'both';
  static const reminderCustom = 'custom';

  static const settingFeedReminder = 'feed_reminder';
  static const settingCleaningReminder = 'cleaning_reminder';
  static const settingHealthReminder = 'health_reminder';
  static const settingStockReminder = 'stock_reminder';
  static const settingDoNotDisturb = 'do_not_disturb';

  static const Map<String, bool> defaultNotificationSettings = {
    settingFeedReminder: true,
    settingCleaningReminder: true,
    settingHealthReminder: true,
    settingStockReminder: false,
    settingDoNotDisturb: false,
  };

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  final Int64List _vibrationPattern = Int64List.fromList(const [0, 600, 250, 600]);
  bool _initialized = false;
  bool _available = false;
  bool _permissionRequested = false;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      tz_data.initializeTimeZones();
      tz.setLocalLocation(tz.getLocation(_witaLocationName));

      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      await _notifications.initialize(
        settings: const InitializationSettings(
          android: androidSettings,
          iOS: darwinSettings,
          macOS: darwinSettings,
        ),
      );
      await _ensureAndroidNotificationChannel();

      _available = true;
    } catch (_) {
      _available = false;
    } finally {
      _initialized = true;
    }
  }

  Future<bool> showTestNotification() async {
    await initialize();
    if (!_available) return false;

    final isAllowed = await requestNotificationPermission();
    if (!isAllowed) return false;

    await _notifications.show(
      id: _notificationId('test|${DateTime.now().millisecondsSinceEpoch}'),
      title: 'Tes notifikasi Entok',
      body: 'Notifikasi aktif. Pengingat tugas akan muncul sesuai jadwal WITA.',
      notificationDetails: _notificationDetails(),
      payload: 'test',
    );

    return true;
  }

  Future<void> showPushNotification({
    required String title,
    required String body,
    String payload = 'push',
  }) async {
    await initialize();
    if (!_available) return;
    if (!await requestNotificationPermission()) return;

    await _notifications.show(
      id: _notificationId('push|$payload|${DateTime.now().millisecondsSinceEpoch}'),
      title: title,
      body: body,
      notificationDetails: _notificationDetails(),
      payload: payload,
    );
  }

  Future<void> scheduleDailyTaskReminders({
    required String date,
    required List<KeeperTask> tasks,
    List<int>? reminderMinutes,
  }) async {
    await initialize();
    if (!_available) return;
    await cancelTaskReminders();

    final settings = await getNotificationSettings();
    if (settings[settingDoNotDisturb] == true) return;
    if (!await _requestPermissions()) return;

    final now = tz.TZDateTime.now(tz.local);
    final scheduledIds = <int>[];
    final selectedReminderMinutes = reminderMinutes ?? await getReminderMinutes();
    final sortedReminderMinutes = [...selectedReminderMinutes]..sort((a, b) => b.compareTo(a));

    for (final task in tasks) {
      if (_isCompleted(task)) continue;
      if (!_shouldNotifyTask(task, settings)) continue;

      final taskTime = _parseTaskDateTime(date, task.waktu);
      if (taskTime == null) continue;

      for (final minutesBefore in sortedReminderMinutes) {
        final reminderTime = tz.TZDateTime.from(
          taskTime.subtract(Duration(minutes: minutesBefore)),
          tz.local,
        );
        if (!reminderTime.isAfter(now.add(const Duration(seconds: 10)))) continue;

        final id = _notificationId('${task.id}|${task.waktu}|$date|$minutesBefore');
        await _notifications.zonedSchedule(
          id: id,
          title: 'Pengingat tugas',
          body: _bodyFor(task, minutesBefore),
          scheduledDate: reminderTime,
          notificationDetails: _notificationDetails(),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          payload: 'task:${task.id}',
        );
        scheduledIds.add(id);
      }

      if (taskTime.isAfter(now.add(const Duration(seconds: 10)))) {
        final id = _notificationId('due|${task.id}|${task.waktu}|$date');
        await _notifications.zonedSchedule(
          id: id,
          title: 'Misi dimulai sekarang',
          body: _bodyForDueTask(task),
          scheduledDate: taskTime,
          notificationDetails: _notificationDetails(),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          payload: 'task:${task.id}',
        );
        scheduledIds.add(id);
      }

      final missedTime = tz.TZDateTime.from(taskTime.add(const Duration(minutes: 1)), tz.local);
      if (missedTime.isAfter(now.add(const Duration(seconds: 10)))) {
        final id = _notificationId('missed-scheduled|${task.id}|${task.waktu}|$date');
        await _notifications.zonedSchedule(
          id: id,
          title: 'Misi terlewat',
          body: _bodyForMissedTask(task),
          scheduledDate: missedTime,
          notificationDetails: _notificationDetails(),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          payload: 'missed:${task.id}',
        );
        scheduledIds.add(id);
      }
    }

    await _storeScheduledIds(scheduledIds);
    await _notifyMissedTasks(date: date, tasks: tasks, settings: settings);
  }

  Future<void> notifyLowFeedStock({
    required String date,
    required List<FeedItem> feeds,
  }) async {
    await initialize();
    if (!_available) return;

    final settings = await getNotificationSettings();
    if (settings[settingDoNotDisturb] == true || settings[settingStockReminder] != true) return;

    final lowFeeds = feeds.where((feed) => feed.stok <= feed.ambangBatas).toList();
    if (lowFeeds.isEmpty) return;

    if (!await _requestPermissions()) return;

    final prefs = await SharedPreferences.getInstance();
    final key = '$_stockAlertIdsPrefix$date';
    final alreadySent = (prefs.getStringList(key) ?? const []).toSet();
    final pendingFeeds = lowFeeds.where((feed) => !alreadySent.contains(feed.id)).toList();
    if (pendingFeeds.isEmpty) return;

    final title = pendingFeeds.length == 1 ? 'Stok pakan hampir habis' : '${pendingFeeds.length} stok pakan hampir habis';
    final body = pendingFeeds
        .take(3)
        .map((feed) => '${feed.nama}: ${_formatStock(feed.stok)} kg')
        .join(', ');

    await _notifications.show(
      id: _notificationId('stock|$date|${pendingFeeds.map((feed) => feed.id).join('|')}'),
      title: title,
      body: body,
      notificationDetails: _notificationDetails(),
      payload: 'stock:$date',
    );

    await prefs.setStringList(key, {...alreadySent, ...pendingFeeds.map((feed) => feed.id)}.toList());
  }

  Future<String> getReminderLeadOption() async {
    final prefs = await SharedPreferences.getInstance();
    final option = prefs.getString(_reminderLeadOptionKey);
    if (option == reminderOneMinute ||
        option == reminderThirtyMinutes ||
        option == reminderOneHour ||
        option == reminderBoth ||
        option == reminderCustom) {
      return option!;
    }
    return reminderBoth;
  }

  Future<void> setReminderLeadOption(String option) async {
    if (option != reminderOneMinute &&
        option != reminderThirtyMinutes &&
        option != reminderOneHour &&
        option != reminderBoth &&
        option != reminderCustom) {
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_reminderLeadOptionKey, option);
    await cancelTaskReminders();
  }

  Future<int> getCustomReminderMinutes() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.getInt(_customReminderMinutesKey) ?? 10;
    return max(1, min(value, 1440));
  }

  Future<void> setCustomReminderMinutes(int minutes) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_customReminderMinutesKey, max(1, min(minutes, 1440)));
    await cancelTaskReminders();
  }

  Future<List<int>> getReminderMinutes() async {
    final option = await getReminderLeadOption();
    if (option == reminderOneMinute) return const [1];
    if (option == reminderThirtyMinutes) return const [30];
    if (option == reminderOneHour) return const [60];
    if (option == reminderCustom) return [await getCustomReminderMinutes()];
    return const [60, 30];
  }

  Future<Map<String, bool>> getNotificationSettings() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      for (final entry in defaultNotificationSettings.entries)
        entry.key: prefs.getBool('$_notificationSettingPrefix${entry.key}') ?? entry.value,
    };
  }

  Future<void> setNotificationSetting(String key, bool value) async {
    if (!defaultNotificationSettings.containsKey(key)) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_notificationSettingPrefix$key', value);

    if (key == settingDoNotDisturb || !value) {
      await cancelTaskReminders();
    }
  }

  Future<void> cancelTaskReminders() async {
    await initialize();
    if (!_available) return;
    final prefs = await SharedPreferences.getInstance();
    final ids = prefs.getStringList(_scheduledIdsKey) ?? const [];

    for (final rawId in ids) {
      final id = int.tryParse(rawId);
      if (id != null) {
        await _notifications.cancel(id: id);
      }
    }

    await prefs.remove(_scheduledIdsKey);
  }

  bool _isCompleted(KeeperTask task) {
    return task is DailyChecklistItem && task.isCompleted;
  }

  bool _shouldNotifyTask(KeeperTask task, Map<String, bool> settings) {
    final text = '${task.nama} ${task.deskripsi}'.toLowerCase();

    if (_containsAny(text, const ['pakan', 'makan', 'racikan'])) {
      return settings[settingFeedReminder] == true;
    }
    if (_containsAny(text, const ['bersih', 'kandang', 'kuras', 'kolam'])) {
      return settings[settingCleaningReminder] == true;
    }
    if (_containsAny(text, const ['sehat', 'vaksin', 'vitamin', 'obat'])) {
      return settings[settingHealthReminder] == true;
    }
    if (_containsAny(text, const ['air', 'minum', 'stok'])) {
      return settings[settingStockReminder] == true;
    }

    return true;
  }

  bool _containsAny(String value, List<String> keywords) {
    return keywords.any((keyword) => value.contains(keyword));
  }

  Future<bool> requestNotificationPermission() async {
    await initialize();
    if (!_available) return false;

    final androidNotifications = _notifications.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (androidNotifications == null) {
      _permissionRequested = true;
      return true;
    }

    final isEnabled = await androidNotifications.areNotificationsEnabled();
    if (isEnabled == true) {
      _permissionRequested = true;
      return true;
    }

    final isGranted = await androidNotifications.requestNotificationsPermission();
    _permissionRequested = true;
    if (isGranted != null) return isGranted;
    return await androidNotifications.areNotificationsEnabled() ?? false;
  }

  Future<bool> _requestPermissions() async {
    if (_permissionRequested) {
      final androidNotifications = _notifications.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (androidNotifications == null) return true;
      return await androidNotifications.areNotificationsEnabled() ?? false;
    }

    return requestNotificationPermission();
  }

  Future<void> _ensureAndroidNotificationChannel() async {
    await _notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(
          AndroidNotificationChannel(
            _channelId,
            _channelName,
            description: _channelDescription,
            importance: Importance.max,
            playSound: true,
            enableVibration: true,
            vibrationPattern: _vibrationPattern,
            showBadge: true,
          ),
        );
  }

  Future<void> _notifyMissedTasks({
    required String date,
    required List<KeeperTask> tasks,
    required Map<String, bool> settings,
  }) async {
    final now = tz.TZDateTime.now(tz.local);
    final missedTasks = tasks.where((task) {
      if (_isCompleted(task) || !_shouldNotifyTask(task, settings)) return false;
      final taskTime = _parseTaskDateTime(date, task.waktu);
      return taskTime != null && taskTime.isBefore(now.subtract(const Duration(minutes: 1)));
    }).toList();

    if (missedTasks.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    final key = '$_missedAlertIdsPrefix$date';
    final alreadySent = (prefs.getStringList(key) ?? const []).toSet();
    final pendingTasks = missedTasks.where((task) => !alreadySent.contains(task.id)).toList();
    if (pendingTasks.isEmpty) return;

    final title = pendingTasks.length == 1 ? '1 misi terlewat' : '${pendingTasks.length} misi terlewat';
    final body = pendingTasks
        .take(3)
        .map((task) => '${task.nama} (${formatTaskTimeForDisplay(task.waktu)})')
        .join(', ');

    await _notifications.show(
      id: _notificationId('missed|$date|${pendingTasks.map((task) => task.id).join('|')}'),
      title: title,
      body: '$body. Buka checklist dan selesaikan tugas yang belum done.',
      notificationDetails: _notificationDetails(),
      payload: 'missed:$date',
    );

    await prefs.setStringList(key, {...alreadySent, ...pendingTasks.map((task) => task.id)}.toList());
  }

  tz.TZDateTime? _parseTaskDateTime(String date, String rawTime) {
    final dateMatch = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(date);
    if (dateMatch == null) return null;

    final parsedTime = _parseHourMinute(rawTime);
    if (parsedTime == null) return null;

    return tz.TZDateTime(
      tz.local,
      int.parse(dateMatch.group(1)!),
      int.parse(dateMatch.group(2)!),
      int.parse(dateMatch.group(3)!),
      parsedTime.$1,
      parsedTime.$2,
    );
  }

  String _bodyFor(KeeperTask task, int minutesBefore) {
    final reminderText = minutesBefore >= 60 ? '1 jam lagi' : '$minutesBefore menit lagi';
    final time = task.waktu.isEmpty ? 'jadwal tugas' : 'pukul ${formatTaskTimeForDisplay(task.waktu)}';
    return '${task.nama} dimulai $reminderText ($time). Siapkan checklist kandang.';
  }

  String _bodyForDueTask(KeeperTask task) {
    final time = task.waktu.isEmpty ? 'sekarang' : formatTaskTimeForDisplay(task.waktu);
    return '${task.nama} sudah waktunya dikerjakan ($time). Buka checklist penjaga.';
  }

  String _bodyForMissedTask(KeeperTask task) {
    final time = task.waktu.isEmpty ? 'jadwal tugas' : formatTaskTimeForDisplay(task.waktu);
    return '${task.nama} belum dicentang setelah jadwal $time. Segera cek checklist.';
  }

  NotificationDetails _notificationDetails() {
    return NotificationDetails(
      android: AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDescription,
        importance: Importance.max,
        priority: Priority.max,
        category: AndroidNotificationCategory.reminder,
        enableVibration: true,
        vibrationPattern: _vibrationPattern,
        playSound: true,
        visibility: NotificationVisibility.public,
        ticker: 'Pengingat tugas penjaga',
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
      macOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );
  }

  static String formatTaskTimeForDisplay(String rawTime) {
    final parsed = _parseHourMinute(rawTime);
    if (parsed == null) return rawTime.replaceAll(RegExp(r'\s*WITA\s*', caseSensitive: false), '').trim();

    final hour = parsed.$1;
    final minute = parsed.$2;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour % 12 == 0 ? 12 : hour % 12;
    return '$displayHour:${minute.toString().padLeft(2, '0')} $period';
  }

  static (int, int)? _parseHourMinute(String rawTime) {
    final time = rawTime
        .toUpperCase()
        .replaceAll(RegExp(r'\bWITA\b'), '')
        .replaceAll(RegExp(r'\bWIB\b'), '')
        .replaceAll(RegExp(r'\bWIT\b'), '')
        .trim();
    final hasAm = RegExp(r'\bA\.?M\.?\b').hasMatch(time);
    final hasPm = RegExp(r'\bP\.?M\.?\b').hasMatch(time);
    final timeMatch = RegExp(r'(\d{1,2})[:.](\d{2})').firstMatch(time);
    final numberMatches = RegExp(r'\d+').allMatches(time).map((match) => match.group(0) ?? '').toList();

    int? hour;
    var minute = 0;

    if (timeMatch != null) {
      hour = int.tryParse(timeMatch.group(1) ?? '');
      minute = int.tryParse(timeMatch.group(2) ?? '') ?? 0;
    } else if (numberMatches.isNotEmpty) {
      hour = int.tryParse(numberMatches.first);
      if (numberMatches.length > 1) {
        minute = int.tryParse(numberMatches[1]) ?? 0;
      }
    }

    if (hour == null || minute < 0 || minute > 59) return null;

    if (hasAm || hasPm) {
      if (hour < 1 || hour > 12) return null;
      if (hasAm && hour == 12) hour = 0;
      if (hasPm && hour < 12) hour += 12;
    }

    if (hour < 0 || hour > 23) return null;
    return (hour, minute);
  }

  String _formatStock(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(1);
  }

  int _notificationId(String seed) {
    var hash = 2166136261;
    for (final codeUnit in seed.codeUnits) {
      hash ^= codeUnit;
      hash = (hash * 16777619) & 0x7fffffff;
    }
    return max(1, hash);
  }

  Future<void> _storeScheduledIds(List<int> ids) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_scheduledIdsKey, ids.map((id) => id.toString()).toList());
  }
}
