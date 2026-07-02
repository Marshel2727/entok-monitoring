import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  final ApiService api;
  final VoidCallback onLoggedIn;

  const LoginScreen({
    super.key,
    required this.api,
    required this.onLoggedIn,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _hidePassword = true;
  String? _error;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;
    if (username.isEmpty || password.isEmpty) {
      setState(() => _error = 'Username dan kata sandi wajib diisi.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await widget.api.login(username, password);
      if (mounted) widget.onLoggedIn();
    } on ApiException catch (err) {
      if (mounted) setState(() => _error = err.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Login gagal. Coba lagi sebentar.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openRegisterPage() async {
    final credentials = await Navigator.push<_RegisterResult>(
      context,
      MaterialPageRoute(
        builder: (context) => RegisterScreen(api: widget.api),
      ),
    );
    if (credentials == null || !mounted) return;
    _usernameController.text = credentials.username;
    _passwordController.text = credentials.password;
    await _login();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            children: [
              const EntokTopHeader(
                title: 'Selamat Datang!',
                subtitle: 'Silakan login ke akun Anda',
                badgeIcon: Icons.lock_open_rounded,
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 36, 24, 24),
                  children: [
                    const Text(
                      'Login Akun',
                      style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: EntokColors.text),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Kelola kandang entok Anda dengan lebih mudah dan terorganisir.',
                      style: TextStyle(fontSize: 16, color: EntokColors.muted, height: 1.35, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 36),
                    if (_error != null) ...[
                      _ErrorBanner(message: _error!),
                      const SizedBox(height: 18),
                    ],
                    TextField(
                      controller: _usernameController,
                      textInputAction: TextInputAction.next,
                      decoration: entokInputDecoration('Username', Icons.person_outline_rounded),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _passwordController,
                      obscureText: _hidePassword,
                      onSubmitted: (_) => _login(),
                      decoration: entokInputDecoration(
                        'Password',
                        Icons.lock_outline_rounded,
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _hidePassword = !_hidePassword),
                          icon: Icon(
                            _hidePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                            color: Colors.grey,
                            size: 28,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 26),
                    EntokPrimaryButton(
                      label: _isLoading ? 'MEMPROSES...' : 'MASUK',
                      onPressed: _isLoading ? null : _login,
                    ),
                    const SizedBox(height: 46),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Belum punya akun? ',
                          style: TextStyle(color: EntokColors.muted, fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                        GestureDetector(
                          onTap: _isLoading ? null : _openRegisterPage,
                          child: const Text(
                            'Daftar Sekarang',
                            style: TextStyle(color: EntokColors.green, fontSize: 14, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RegisterScreen extends StatefulWidget {
  final ApiService api;

  const RegisterScreen({super.key, required this.api});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _hidePassword = true;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final name = _nameController.text.trim();
    final username = _usernameController.text.trim();
    final password = _passwordController.text;
    if (name.isEmpty || username.isEmpty || password.isEmpty) {
      setState(() => _error = 'Nama, username, dan password wajib diisi.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await widget.api.registerPublic(name: name, username: username, password: password);
      if (mounted) Navigator.pop(context, _RegisterResult(username, password));
    } on ApiException catch (err) {
      if (mounted) setState(() => _error = err.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Gagal daftar akun.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            children: [
              const EntokTopHeader(
                title: 'Buat Akun Baru',
                showBack: true,
                badgeIcon: Icons.person_add_alt_1_rounded,
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 36, 24, 24),
                  children: [
                    const Text(
                      'Pendaftaran Akun',
                      style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: EntokColors.text),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Isi formulir di bawah ini untuk mendaftar sebagai penjaga kandang.',
                      style: TextStyle(fontSize: 16, color: EntokColors.muted, height: 1.35, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 34),
                    if (_error != null) ...[
                      _ErrorBanner(message: _error!),
                      const SizedBox(height: 18),
                    ],
                    _FieldLabel('Nama Lengkap'),
                    TextField(controller: _nameController, decoration: entokInputDecoration('Pak Joko', Icons.person_outline_rounded)),
                    const SizedBox(height: 24),
                    _FieldLabel('Username'),
                    TextField(controller: _usernameController, decoration: entokInputDecoration('joko', Icons.badge_outlined)),
                    const SizedBox(height: 24),
                    _FieldLabel('Password'),
                    TextField(
                      controller: _passwordController,
                      obscureText: _hidePassword,
                      decoration: entokInputDecoration(
                        'Password',
                        Icons.lock_outline_rounded,
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _hidePassword = !_hidePassword),
                          icon: Icon(_hidePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded, color: Colors.grey, size: 28),
                        ),
                      ),
                    ),
                    const SizedBox(height: 38),
                    EntokPrimaryButton(
                      label: _isLoading ? 'MENDAFTAR...' : 'DAFTAR SEKARANG',
                      onPressed: _isLoading ? null : _register,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String label;

  const _FieldLabel(this.label);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        label,
        style: const TextStyle(fontSize: 15, color: EntokColors.text, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;

  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEBEE),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFFCDD2)),
      ),
      child: Text(message, style: const TextStyle(color: Color(0xFFC62828), fontWeight: FontWeight.w700)),
    );
  }
}

class _RegisterResult {
  final String username;
  final String password;

  const _RegisterResult(this.username, this.password);
}
