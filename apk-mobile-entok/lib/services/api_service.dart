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
  static const String apiBaseUrl = 'https://api-entok.bengkelit.id/api';
  static const String assetBaseUrl = 'https://api-entok.bengkelit.id';
  static const String frontendAssetBaseUrl = 'https://dashboard-entok.bengkelit.id';

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

  Future<AppUser> updateProfile({
    required String name,
    required String username,
    String? password,
    String? profileImage,
  }) async {
    final response = await _send(
      'PUT',
      '/auth/profile',
      body: {
        'name': name,
        'username': username,
        if (password != null && password.isNotEmpty) 'password': password,
        if (profileImage != null && profileImage.isNotEmpty) 'profile_image': profileImage,
      },
    );

    final userData = Map<String, dynamic>.from(response['data'] ?? {});
    _user = AppUser.fromJson(userData);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(_user!.toJson()));

    return _user!;
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

  Future<FeedingBatch?> createFeedingBatch(String date, String? taskId, [String? taskExecutionId]) async {
    final response = await _send(
      'POST',
      '/feeding-batches',
      body: {
        'date': date,
        if (taskId != null && taskId.isNotEmpty) 'task_id': taskId,
        if (taskExecutionId != null && taskExecutionId.isNotEmpty) 'task_execution_id': taskExecutionId,
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
    final source = path?.trim() ?? '';
    if (source.isEmpty) return '';
    if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('data:')) {
      return source;
    }
    if (source.startsWith('/images/') || source.startsWith('/_next/')) {
      return '$frontendAssetBaseUrl$source';
    }
    if (source.startsWith('/static/')) {
      return '$assetBaseUrl$source';
    }
    if (source.startsWith('/')) return '$assetBaseUrl$source';
    return '$assetBaseUrl/$source';
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
        case 'PUT':
          response = await http.put(uri, headers: headers, body: jsonEncode(body ?? {}));
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
