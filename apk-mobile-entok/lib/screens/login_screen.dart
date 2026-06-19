import 'package:flutter/material.dart';

import '../services/api_service.dart';

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
  final _registerNameController = TextEditingController();
  final _registerUsernameController = TextEditingController();
  final _registerPasswordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _registerNameController.dispose();
    _registerUsernameController.dispose();
    _registerPasswordController.dispose();
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
      setState(() => _error = err.message);
    } catch (_) {
      setState(() => _error = 'Login gagal. Coba lagi sebentar.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openRegisterDialog() async {
    _registerNameController.clear();
    _registerUsernameController.clear();
    _registerPasswordController.clear();
    String? dialogError;
    var isSubmitting = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> submit() async {
              final name = _registerNameController.text.trim();
              final username = _registerUsernameController.text.trim();
              final password = _registerPasswordController.text;
              if (name.isEmpty || username.isEmpty || password.isEmpty) {
                setDialogState(() => dialogError = 'Semua field wajib diisi.');
                return;
              }

              setDialogState(() {
                isSubmitting = true;
                dialogError = null;
              });

              try {
                await widget.api.registerPublic(
                  name: name,
                  username: username,
                  password: password,
                );
                if (!dialogContext.mounted) return;
                Navigator.pop(dialogContext);
                _usernameController.text = username;
                _passwordController.text = password;
                setState(() => _error = null);
                await _login();
              } on ApiException catch (err) {
                setDialogState(() => dialogError = err.message);
              } catch (_) {
                setDialogState(() => dialogError = 'Gagal daftar akun.');
              } finally {
                if (dialogContext.mounted) {
                  setDialogState(() => isSubmitting = false);
                }
              }
            }

            return AlertDialog(
              title: const Text('Daftar Akun Penjaga'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (dialogError != null) ...[
                      Text(dialogError!, style: const TextStyle(color: Color(0xFFC62828), fontSize: 12)),
                      const SizedBox(height: 10),
                    ],
                    TextField(
                      controller: _registerNameController,
                      decoration: _inputDecoration('Nama lengkap', Icons.badge_outlined),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _registerUsernameController,
                      decoration: _inputDecoration('Username', Icons.person_outline_rounded),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _registerPasswordController,
                      obscureText: true,
                      decoration: _inputDecoration('Kata sandi', Icons.lock_outline_rounded),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(dialogContext),
                  child: const Text('Batal'),
                ),
                TextButton(
                  onPressed: isSubmitting ? null : submit,
                  child: Text(isSubmitting ? 'Mendaftar...' : 'Daftar'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Container(
            color: Colors.white,
            child: ListView(
              padding: EdgeInsets.fromLTRB(
                24,
                MediaQuery.of(context).padding.top + 44,
                24,
                24,
              ),
              children: [
                Container(
                  height: 190,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1B5E20), Color(0xFF26D057)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.assignment_turned_in_rounded, color: Colors.white, size: 58),
                      SizedBox(height: 14),
                      Text(
                        'Portal Penjaga Entok',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 22),
                      ),
                      SizedBox(height: 6),
                      Text(
                        'Masuk untuk checklist dan panduan harian',
                        style: TextStyle(color: Color(0xDDFFFFFF), fontSize: 13),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                const Text(
                  'Selamat Datang',
                  style: TextStyle(
                    color: Color(0xFF1B5E20),
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Gunakan akun penjaga atau pengawas yang sudah ada di database.',
                  style: TextStyle(color: Colors.black54, height: 1.4),
                ),
                const SizedBox(height: 22),
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEBEE),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFFCDD2)),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Color(0xFFC62828), fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(
                  controller: _usernameController,
                  textInputAction: TextInputAction.next,
                  decoration: _inputDecoration('Username', Icons.person_outline_rounded),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  onSubmitted: (_) => _login(),
                  decoration: _inputDecoration('Kata sandi', Icons.lock_outline_rounded),
                ),
                const SizedBox(height: 22),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _login,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B5E20),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                          )
                        : const Text('MASUK', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: _isLoading ? null : _openRegisterDialog,
                  child: const Text(
                    'Belum punya akun? Daftar Di Sini',
                    style: TextStyle(color: Color(0xFF8B5A24), fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'API: https://api-entok.marshelportfolio.me/api',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.black38, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: const Color(0xFF1B5E20)),
      filled: true,
      fillColor: const Color(0xFFF8FAF8),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE0E7E0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF26D057), width: 1.6),
      ),
    );
  }
}
