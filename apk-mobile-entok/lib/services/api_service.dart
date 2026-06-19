import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/keeper_models.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiService {
  static const String apiBaseUrl = 'https://api-entok.marshelportfolio.me/api';
  static const String assetBaseUrl = 'https://api-entok.marshelportfolio.me';

  static const _tokenKey = 'entok_token';
  static const _userKey = 'entok_user';

  String? _token;
  AppUser? _user;

  String? get token => _token;
  AppUser? get user => _user;
  bool get isLoggedIn => _token != null && _user != null;

  Future<void> restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
    final userJson = prefs.getString(_userKey);
    if (userJson != null && userJson.isNotEmpty) {
      _user = AppUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
    }
  }

  Future<AppUser> login(String username, String password) async {
    final response = await _send(
      'POST',
      '/auth/login',
      auth: false,
      body: {
        'username': username,
        'password': password,
      },
    );

    final data = Map<String, dynamic>.from(response['data'] ?? {});
    _token = '${data['token'] ?? ''}';
    _user = AppUser.fromJson(Map<String, dynamic>.from(data['user'] ?? {}));

    if ((_token ?? '').isEmpty) {
      throw const ApiException('Token login tidak ditemukan dari server.');
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, _token!);
    await prefs.setString(_userKey, jsonEncode(_user!.toJson()));

    return _user!;
  }

  Future<void> registerPublic({
    required String name,
    required String username,
    required String password,
  }) async {
    await _send(
      'POST',
      '/auth/register-public',
      auth: false,
      body: {
        'name': name,
        'username': username,
        'password': password,
        'shift': 'PAGI',
      },
    );
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  Future<List<KeeperTask>> getTasks() async {
    final response = await _send('GET', '/tasks', auth: false);
    return _dataList(response).map((item) => KeeperTask.fromJson(item)).toList();
  }

  Future<List<DailyChecklistItem>> getChecklist(String date) async {
    final response = await _send('GET', '/tasks/checklist?date=$date');
    return _dataList(response).map((item) => DailyChecklistItem.fromJson(item)).toList();
  }

  Future<void> toggleChecklist({
    required String taskId,
    required String date,
    required bool isCompleted,
  }) async {
    await _send(
      'POST',
      '/tasks/checklist/toggle',
      body: {
        'task_id': taskId,
        'date': date,
        'is_completed': isCompleted,
      },
    );
  }

  Future<void> resetChecklist(String date) async {
    await _send('POST', '/tasks/checklist/reset', body: {'date': date});
  }

  Future<List<FeedItem>> getFeeds() async {
    final response = await _send('GET', '/feeds', auth: false);
    return _dataList(response).map((item) => FeedItem.fromJson(item)).toList();
  }

  Future<List<FormulationItem>> getFormulations() async {
    final response = await _send('GET', '/formulations', auth: false);
    return _dataList(response).map((item) => FormulationItem.fromJson(item)).toList();
  }

  Future<List<PopulationPhase>> getPopulations() async {
    final response = await _send('GET', '/populations', auth: false);
    return _dataList(response).map((item) => PopulationPhase.fromJson(item)).toList();
  }

  Future<List<FeedingBatch>> getTodayBatches(String date) async {
    final response = await _send('GET', '/feeding-batches/today?date=$date&all=1');
    return _dataList(response).map((item) => FeedingBatch.fromJson(item)).toList();
  }

  Future<FeedingBatch?> createFeedingBatch(String date, String? taskId) async {
    final response = await _send(
      'POST',
      '/feeding-batches',
      body: {
        'date': date,
        if (taskId != null && taskId.isNotEmpty) 'task_id': taskId,
      },
    );
    final data = response['data'];
    if (data is Map) return FeedingBatch.fromJson(Map<String, dynamic>.from(data));
    return null;
  }

  Future<FeedingBatch?> finalizeFeedingBatch(String batchId) async {
    final response = await _send('POST', '/feeding-batches/$batchId/finalize', body: {});
    final data = response['data'];
    if (data is Map) return FeedingBatch.fromJson(Map<String, dynamic>.from(data));
    return null;
  }

  Future<FeedingBatch?> cancelFeedingBatch(String batchId) async {
    final response = await _send('POST', '/feeding-batches/$batchId/cancel', body: {});
    final data = response['data'];
    if (data is Map) return FeedingBatch.fromJson(Map<String, dynamic>.from(data));
    return null;
  }

  String assetUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/')) return '$assetBaseUrl$path';
    return '$assetBaseUrl/$path';
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String endpoint, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final uri = Uri.parse('$apiBaseUrl$endpoint');
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (auth && _token != null) 'Authorization': 'Bearer $_token',
    };

    late http.Response response;
    try {
      switch (method) {
        case 'POST':
          response = await http.post(uri, headers: headers, body: jsonEncode(body ?? {}));
          break;
        case 'GET':
          response = await http.get(uri, headers: headers);
          break;
        default:
          throw ApiException('Method API tidak didukung: $method');
      }
    } catch (_) {
      throw const ApiException('Tidak bisa terhubung ke server. Periksa internet atau domain API.');
    }

    final decoded = _decodeResponse(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded['message']?.toString() ?? 'Request gagal (${response.statusCode}).';
      throw ApiException(message, response.statusCode);
    }

    return decoded;
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    try {
      final value = jsonDecode(response.body);
      if (value is Map) return Map<String, dynamic>.from(value);
    } catch (_) {
      // handled below
    }
    return {
      'status': response.statusCode >= 200 && response.statusCode < 300 ? 'success' : 'error',
      'message': response.body,
    };
  }

  List<Map<String, dynamic>> _dataList(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is List) {
      return data.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
    }
    return const [];
  }
}
