import 'package:flutter/material.dart';
import 'main_navigation.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'services/task_reminder_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await TaskReminderService.instance.initialize();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dashboard Penjaga Entok',
      debugShowCheckedModeBanner: false,
      theme: EntokTheme.data(),
      builder: (context, child) {
        final media = MediaQuery.of(context);
        final width = media.size.width;
        final scale = width < 360
            ? 0.82
            : width < 390
                ? 0.88
                : width < 430
                    ? 0.92
                    : 0.96;

        return MediaQuery(
          data: media.copyWith(textScaler: TextScaler.linear(scale)),
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final ApiService _api = ApiService();
  bool _isBooting = true;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    await _api.restoreSession();
    if (mounted) {
      setState(() => _isBooting = false);
    }
  }

  Future<void> _logout() async {
    await TaskReminderService.instance.cancelTaskReminders();
    await _api.logout();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (_isBooting) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: Color(0xFF26D057))),
      );
    }

    if (!_api.isLoggedIn) {
      return LoginScreen(
        api: _api,
        onLoggedIn: () => setState(() {}),
      );
    }

    return MainNavigationScreen(
      api: _api,
      onLogout: _logout,
    );
  }
}
