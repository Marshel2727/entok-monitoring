import 'package:flutter/material.dart';

import '../models/keeper_models.dart';
import '../services/task_reminder_service.dart';
import '../theme/app_theme.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import 'dart:convert';

class AccountScreen extends StatelessWidget {
  final ApiService api;
  final AppUser? user;
  final Future<void> Function() onLogout;
  final Future<void> Function()? onNotificationSettingsChanged;

  const AccountScreen({
    super.key,
    required this.api,
    required this.user,
    required this.onLogout,
    this.onNotificationSettingsChanged,
  });

  @override
  Widget build(BuildContext context) {
    final name = user?.name ?? 'Penjaga Entok';
    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            children: [
              const EntokTopHeader(title: 'Kelola Akun Penjaga', showBack: true),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                  children: [
                    Center(
                      child: Container(
                        width: 118,
                        height: 118,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: EntokColors.green, width: 5),
                          boxShadow: [
                            BoxShadow(
                              color: EntokColors.green.withValues(alpha: 0.18),
                              blurRadius: 18,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: user?.profileImage != null &&
                              user!.profileImage!.isNotEmpty
                              ? Image.network(
                            api.assetUrl(
                              user!.profileImage,
                            ),
                            fit: BoxFit.cover,

                            errorBuilder:
                                (_, __, ___) =>
                            const Icon(
                              Icons.person_rounded,
                              color: EntokColors.green,
                              size: 60,
                            ),
                          )
                              : const Icon(
                            Icons.person_rounded,
                            color: EntokColors.green,
                            size: 60,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 26),
                    Text(
                      name,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 24, color: EntokColors.text, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      user?.role == 'PENGAWAS' ? 'Pengawas Kandang' : 'Penjaga Kandang',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 15, color: EntokColors.muted, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 36),
                    _AccountMenuTile(
                      icon: Icons.person_outline_rounded,
                      title: 'Edit Profil Penjaga',
                      onTap: () async {
                        final updatedUser = await Navigator.push<AppUser>(
                          context,
                          MaterialPageRoute(builder: (_) => EditProfileScreen(api: api, user: user)),
                        );
                        if (updatedUser != null && context.mounted) {
                          Navigator.pop(context, updatedUser);
                        }
                      },
                    ),
                    _AccountMenuTile(
                      icon: Icons.notifications_none_rounded,
                      title: 'Pengaturan Notifikasi',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => NotificationSettingsScreen(
                            onSettingsChanged: onNotificationSettingsChanged,
                          ),
                        ),
                      ),
                    ),
                    _AccountMenuTile(
                      icon: Icons.help_outline_rounded,
                      title: 'Bantuan & Dukungan',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SupportScreen())),
                    ),
                    const SizedBox(height: 44),
                    EntokPrimaryButton(
                      label: 'KELUAR AKUN',
                      danger: true,
                      icon: Icons.logout_rounded,
                      onPressed: () async {
                        await onLogout();
                        if (context.mounted) Navigator.pop(context);
                      },
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

class EditProfileScreen extends StatefulWidget {
  final ApiService api;
  final AppUser? user;

  const EditProfileScreen({
    super.key,
    required this.api,
    required this.user,
  });

  @override
  State<EditProfileScreen> createState() =>
      _EditProfileScreenState();
}

class _EditProfileScreenState
    extends State<EditProfileScreen> {
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  File? _profileImage;
  bool _hidePassword = true;

  @override
  void initState() {
    super.initState();

    _nameController.text =
        widget.user?.name ?? '';

    _usernameController.text =
        widget.user?.username ?? '';
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();

    final image = await picker.pickImage(
      source: ImageSource.gallery,
    );

    if (image != null) {
      setState(() {
        _profileImage = File(image.path);
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {

    String? imageBase64;

    if (_profileImage != null) {
      final bytes = await _profileImage!.readAsBytes();
      imageBase64 = 'data:image/jpeg;base64,${base64Encode(bytes)}';
    }

    try {

      final updatedUser =
      await widget.api.updateProfile(
        name: _nameController.text.trim(),
        username: _usernameController.text.trim(),
        password: _passwordController.text.trim(),
        profileImage: imageBase64,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Profil berhasil diperbarui"),
        ),
      );

      Navigator.pop(context, updatedUser);

    } catch (e) {

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );

    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: 450,
          ),
          child: Column(
            children: [
              const EntokTopHeader(
                title: 'Edit Profil Penjaga',
                showBack: true
              ),

              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(
                    24,
                    28,
                    24,
                    24,
                  ),
                  children: [

                    Center(
                      child: Stack(
                        children: [

                          Container(
                            width: 128,
                            height: 128,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFFCFF7DF),
                            ),
                  child: ClipOval(
                    child: _profileImage != null
                        ? Image.file(
                      _profileImage!,
                      fit: BoxFit.cover,
                    )
                        : widget.user?.profileImage != null &&
                        widget.user!.profileImage!.isNotEmpty
                        ? Image.network(
                      widget.api.assetUrl(widget.user!.profileImage),
                      fit: BoxFit.cover,
                    )
                        : const Icon(
                      Icons.person_rounded,
                      color: EntokColors.green,
                      size: 72,
                    ),
                  ),
                          ),

                          Positioned(
                            right: 0,
                            bottom: 6,
                            child: GestureDetector(
                              onTap: _pickImage,
                              child: Container(
                                width: 52,
                                height: 52,
                                decoration: const BoxDecoration(
                                  color: EntokColors.green,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.photo_camera_rounded,
                                  color: Colors.white,
                                  size: 26,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 34),

                    const _PageFieldLabel(
                      'Nama Lengkap',
                    ),

                    TextField(
                      controller: _nameController,
                      decoration:
                      entokInputDecoration(
                        'Nama Lengkap',
                        Icons.person_outline_rounded,
                      ),
                    ),

                    const SizedBox(height: 24),

                    const _PageFieldLabel(
                      'Username',
                    ),

                    TextField(
                      controller:
                      _usernameController,
                      decoration:
                      entokInputDecoration(
                        'Username',
                        Icons.badge_outlined,
                      ),
                    ),

                    const SizedBox(height: 24),

                    const _PageFieldLabel(
                      'Password Baru',
                    ),

                    TextField(
                      controller: _passwordController,
                      obscureText: _hidePassword,
                      decoration: entokInputDecoration(
                        'Password Baru',
                        Icons.lock_outline_rounded,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _hidePassword
                                ? Icons.visibility_off_rounded
                                : Icons.visibility_rounded,
                          ),
                          onPressed: () {
                            setState(() {
                              _hidePassword = !_hidePassword;
                            });
                          },
                        ),
                      ),
                    ),

                    const SizedBox(height: 54),

                    EntokPrimaryButton(
                      label:
                      'SIMPAN PERUBAHAN',
                      onPressed:
                      _saveProfile,
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

class NotificationSettingsScreen extends StatefulWidget {
  final Future<void> Function()? onSettingsChanged;

  const NotificationSettingsScreen({
    super.key,
    this.onSettingsChanged,
  });

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  String _reminderLeadOption = TaskReminderService.reminderBoth;
  int _customReminderMinutes = 10;
  bool _isLoadingNotificationSettings = true;
  String? _customReminderError;
  final TextEditingController _customReminderController = TextEditingController(text: '10');

  Map<String, bool> _settings = TaskReminderService.defaultNotificationSettings;

  @override
  void initState() {
    super.initState();
    _loadNotificationSettings();
  }

  @override
  void dispose() {
    _customReminderController.dispose();
    super.dispose();
  }

  Future<void> _loadNotificationSettings() async {
    final option = await TaskReminderService.instance.getReminderLeadOption();
    final customMinutes = await TaskReminderService.instance.getCustomReminderMinutes();
    final settings = await TaskReminderService.instance.getNotificationSettings();
    if (!mounted) return;
    setState(() {
      _reminderLeadOption = option;
      _customReminderMinutes = customMinutes;
      _customReminderController.text = customMinutes.toString();
      _settings = settings;
      _isLoadingNotificationSettings = false;
    });
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
              const EntokTopHeader(title: 'Pengaturan Notifikasi', showBack: true),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 30, 24, 24),
                  children: [
                    const _SectionTitle('Waktu Pengingat'),
                    EntokCard(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: _isLoadingNotificationSettings
                          ? const Padding(
                              padding: EdgeInsets.all(18),
                              child: Center(child: CircularProgressIndicator(color: EntokColors.green)),
                            )
                          : Column(
                              children: [
                                _ReminderOptionTile(
                                  title: '1 menit sebelum tugas',
                                  subtitle: 'Untuk pengingat sangat dekat sebelum mulai.',
                                  value: TaskReminderService.reminderOneMinute,
                                  groupValue: _reminderLeadOption,
                                  onChanged: _setReminderLeadOption,
                                ),
                                _ReminderOptionTile(
                                  title: '30 menit sebelum tugas',
                                  subtitle: 'Cocok kalau tugas sudah rutin dan persiapannya singkat.',
                                  value: TaskReminderService.reminderThirtyMinutes,
                                  groupValue: _reminderLeadOption,
                                  onChanged: _setReminderLeadOption,
                                ),
                                _ReminderOptionTile(
                                  title: '1 jam sebelum tugas',
                                  subtitle: 'Lebih aman untuk tugas yang perlu persiapan bahan atau alat.',
                                  value: TaskReminderService.reminderOneHour,
                                  groupValue: _reminderLeadOption,
                                  onChanged: _setReminderLeadOption,
                                ),
                                _ReminderOptionTile(
                                  title: 'Keduanya',
                                  subtitle: 'Kirim pengingat 1 jam dan 30 menit sebelum jadwal.',
                                  value: TaskReminderService.reminderBoth,
                                  groupValue: _reminderLeadOption,
                                  onChanged: _setReminderLeadOption,
                                ),
                                _ReminderOptionTile(
                                  title: 'Custom menit',
                                  subtitle: 'Atur sendiri jarak pengingat sebelum tugas.',
                                  value: TaskReminderService.reminderCustom,
                                  groupValue: _reminderLeadOption,
                                  onChanged: _setReminderLeadOption,
                                ),
                                if (_reminderLeadOption == TaskReminderService.reminderCustom)
                                  _CustomReminderMinutesField(
                                    controller: _customReminderController,
                                    errorText: _customReminderError,
                                    onApply: _applyCustomReminderMinutes,
                                  ),
                              ],
                            ),
                    ),
                    const SizedBox(height: 16),
                    EntokPrimaryButton(
                      label: 'TES NOTIFIKASI',
                      icon: Icons.notifications_active_rounded,
                      onPressed: _sendTestNotification,
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Gunakan tombol ini setelah install APK untuk memastikan izin dan channel notifikasi Android sudah aktif.',
                      style: TextStyle(fontSize: 12, color: EntokColors.muted, height: 1.35),
                    ),
                    const SizedBox(height: 26),
                    const _SectionTitle('Aktivitas Kandang'),
                    _SwitchTile(
                      icon: Icons.restaurant_rounded,
                      title: 'Pengingat Pakan',
                      subtitle: 'Notifikasi jadwal pakan pagi & sore',
                      value: _isEnabled(TaskReminderService.settingFeedReminder),
                      onChanged: _set(TaskReminderService.settingFeedReminder),
                    ),
                    _SwitchTile(
                      icon: Icons.cleaning_services_rounded,
                      title: 'Kebersihan Kandang',
                      subtitle: 'Pengingat jadwal kuras kolam & kandang',
                      value: _isEnabled(TaskReminderService.settingCleaningReminder),
                      onChanged: _set(TaskReminderService.settingCleaningReminder),
                    ),
                    _SwitchTile(
                      icon: Icons.medical_services_rounded,
                      title: 'Kesehatan & Vaksin',
                      subtitle: 'Notifikasi jadwal vitamin & cek kesehatan',
                      value: _isEnabled(TaskReminderService.settingHealthReminder),
                      onChanged: _set(TaskReminderService.settingHealthReminder),
                    ),
                    _SwitchTile(
                      icon: Icons.water_drop_rounded,
                      title: 'Cek Stok Air & Pakan',
                      subtitle: 'Peringatan stok pakan rendah dan tugas cek air',
                      value: _isEnabled(TaskReminderService.settingStockReminder),
                      onChanged: _set(TaskReminderService.settingStockReminder),
                    ),
                    const SizedBox(height: 26),
                    const _SectionTitle('Mode Khusus'),
                    _SwitchTile(
                      icon: Icons.notifications_off_rounded,
                      title: 'Jangan Ganggu (DND)',
                      subtitle: 'Matikan semua notifikasi sementara',
                      value: _isEnabled(TaskReminderService.settingDoNotDisturb),
                      onChanged: _set(TaskReminderService.settingDoNotDisturb),
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

  bool _isEnabled(String key) {
    return _settings[key] ?? TaskReminderService.defaultNotificationSettings[key] ?? false;
  }

  ValueChanged<bool> _set(String key) {
    return (value) async {
      setState(() => _settings = {..._settings, key: value});
      await TaskReminderService.instance.setNotificationSetting(key, value);
      await widget.onSettingsChanged?.call();
    };
  }

  Future<void> _setReminderLeadOption(String value) async {
    setState(() => _reminderLeadOption = value);
    await TaskReminderService.instance.setReminderLeadOption(value);
    if (value == TaskReminderService.reminderCustom) {
      await TaskReminderService.instance.setCustomReminderMinutes(_customReminderMinutes);
    }
    await widget.onSettingsChanged?.call();
  }

  Future<void> _applyCustomReminderMinutes() async {
    final parsed = int.tryParse(_customReminderController.text.trim());
    if (parsed == null || parsed < 1) {
      setState(() => _customReminderError = 'Minimal 1 menit.');
      return;
    }

    final minutes = parsed > 1440 ? 1440 : parsed;
    setState(() {
      _customReminderMinutes = minutes;
      _customReminderController.text = minutes.toString();
      _customReminderError = null;
      _reminderLeadOption = TaskReminderService.reminderCustom;
    });

    await TaskReminderService.instance.setCustomReminderMinutes(minutes);
    await TaskReminderService.instance.setReminderLeadOption(TaskReminderService.reminderCustom);
    await widget.onSettingsChanged?.call();
  }

  Future<void> _sendTestNotification() async {
    final isSent = await TaskReminderService.instance.showTestNotification();
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isSent
              ? 'Notifikasi tes dikirim. Cek panel notifikasi HP.'
              : 'Izin notifikasi belum aktif. Aktifkan izin notifikasi untuk aplikasi ini di pengaturan Android.',
        ),
        backgroundColor: isSent ? EntokColors.greenDark : EntokColors.danger,
      ),
    );
  }
}

class SecurityScreen extends StatelessWidget {
  final AppUser? user;
  final Future<void> Function() onLogout;

  const SecurityScreen({super.key, required this.user, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final employeeId = _employeeId(user);
    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            children: [
              const EntokTopHeader(title: 'Keamanan Akun', showBack: true),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 30, 24, 24),
                  children: [
                    const _SectionTitle('Identitas Pengguna'),
                    EntokCard(
                      child: Row(
                        children: [
                          const CircleAvatar(radius: 30, backgroundColor: EntokColors.green, child: Icon(Icons.person_rounded, color: Colors.white, size: 34)),
                          const SizedBox(width: 22),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(user?.name ?? 'Penjaga Entok', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: EntokColors.text)),
                                const SizedBox(height: 4),
                                Text('ID Karyawan: $employeeId', style: const TextStyle(fontSize: 13, color: EntokColors.muted)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 34),
                    const _SectionTitle('Perangkat Anda'),
                    const EntokCard(
                      child: Row(
                        children: [
                          EntokIconBox(icon: Icons.phone_android_rounded),
                          SizedBox(width: 20),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Android Device', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: EntokColors.text)),
                                SizedBox(height: 4),
                                Text('Aktif saat ini', style: TextStyle(fontSize: 13, color: EntokColors.muted)),
                              ],
                            ),
                          ),
                          _CurrentDeviceBadge(),
                        ],
                      ),
                    ),
                    const SizedBox(height: 34),
                    const _SectionTitle('Lokasi Operasional'),
                    const EntokCard(
                      child: Row(
                        children: [
                          EntokIconBox(icon: Icons.location_on_rounded),
                          SizedBox(width: 20),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Lokasi Kandang Terdeteksi', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: EntokColors.text)),
                                SizedBox(height: 4),
                                Text('Area Peternakan Entok', style: TextStyle(fontSize: 13, color: EntokColors.muted)),
                              ],
                            ),
                          ),
                          Icon(Icons.check_circle_rounded, color: EntokColors.green, size: 34),
                        ],
                      ),
                    ),
                    const SizedBox(height: 90),
                    EntokPrimaryButton(
                      label: 'KELUAR SESI',
                      danger: true,
                      icon: Icons.logout_rounded,
                      onPressed: () async {
                        await onLogout();
                        if (context.mounted) Navigator.popUntil(context, (route) => route.isFirst);
                      },
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

  String _employeeId(AppUser? user) {
    final id = user?.id ?? '';
    if (id.isEmpty) return 'ENTOK-001';
    final shortId = id.length > 8 ? id.substring(0, 8) : id;
    return shortId.toUpperCase();
  }
}

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            children: [
              const EntokTopHeader(title: 'Bantuan & Dukungan', showBack: true),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 30, 24, 24),
                  children: [
                    const Text('Ada kendala di kandang?', style: TextStyle(fontSize: 20, color: EntokColors.text, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 14),
                    const Text('Pilih layanan bantuan di bawah ini agar kami segera membantu Anda.', style: TextStyle(fontSize: 15, color: EntokColors.muted, height: 1.35)),
                    const SizedBox(height: 38),
                    _SupportTile(icon: Icons.chat_bubble_rounded, title: 'Hubungi Admin via WhatsApp', subtitle: 'Respon cepat untuk masalah mendesak', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ContactAdminScreen()))),
                    _SupportTile(icon: Icons.menu_book_rounded, title: 'Panduan Penggunaan', subtitle: 'Cara mudah mengelola data entok', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const UsageGuideScreen()))),
                    const SizedBox(height: 76),
                    const Center(child: Text('Versi Aplikasi 1.0.0', style: TextStyle(fontSize: 18, color: Color(0xFFA7AFBB)))),
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

class ContactAdminScreen extends StatelessWidget {
  const ContactAdminScreen({super.key});

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
                title: 'Hubungi Admin EntokFlow',
                showBack: true
              ),

              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    24,
                    80, // sebelumnya 80, saya perkecil
                    24,
                    24,
                  ),
                  child: Column(
                    children: [
                      const CircleAvatar(
                        radius: 58,
                        backgroundColor: EntokColors.mint,
                        child: Icon(
                          Icons.chat_bubble_rounded,
                          color: EntokColors.green,
                          size: 58,
                        ),
                      ),

                      const SizedBox(height: 40),

                      const Text(
                        'Butuh Bantuan?',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 26,
                          color: EntokColors.text,
                          fontWeight: FontWeight.w900,
                        ),
                      ),

                      const SizedBox(height: 20),

                      const Text(
                        'Tim admin kami siap membantu Anda. Tekan tombol di bawah untuk menyalin nomor WhatsApp kami.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          color: EntokColors.muted,
                          height: 1.35,
                        ),
                      ),

                      const SizedBox(height: 30),

                      EntokPrimaryButton(
                        label: 'HUBUNGI ADMIN',
                        icon: Icons.phone_android_rounded,
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: EntokColors.warning,
                              margin: const EdgeInsets.all(16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              content: Row(
                                children: [
                                  const Icon(
                                    Icons.info_rounded,
                                    color: Colors.white,
                                  ),
                                  const SizedBox(width: 10),
                                  const Expanded(
                                    child: Text(
                                      'Nomor admin belum dikonfigurasi di aplikasi.',
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ],
                              ),
                              duration: const Duration(seconds: 3),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class UsageGuideScreen extends StatelessWidget {
  const UsageGuideScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Cek Checklist Harian', "Lihat daftar tugas harian Anda di menu Home. Pastikan semua kegiatan seperti 'Beri Pakan' dan 'Bersihkan Kandang' diselesaikan tepat waktu."),
      ('Pemberian Pakan', 'Buka menu Checklist untuk melihat detail batch racikan pakan. Pastikan takaran sesuai instruksi sebelum finalisasi.'),
      ('Finalisasi Tugas', 'Setelah menyelesaikan kegiatan, tandai checklist agar laporan pekerjaan tercatat.'),
      ('Lihat Panduan & Racikan', 'Gunakan menu Panduan untuk melihat tata cara kerja atau komposisi racikan pakan terbaru.'),
    ];
    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            children: [
              const EntokTopHeader(title: 'Panduan Penggunaan', showBack: true),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 30, 24, 24),
                  children: [
                    const Text('Cara Mengelola Kandang', style: TextStyle(fontSize: 21, color: EntokColors.text, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 28),
                    for (var i = 0; i < items.length; i++) ...[
                      EntokCard(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(color: EntokColors.mint, borderRadius: BorderRadius.circular(14)),
                              child: Center(child: Text('${i + 1}', style: const TextStyle(color: EntokColors.green, fontSize: 15, fontWeight: FontWeight.w900))),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(items[i].$1, style: const TextStyle(fontSize: 18, color: EntokColors.text, fontWeight: FontWeight.w900)),
                                  const SizedBox(height: 8),
                                  Text(items[i].$2, style: const TextStyle(fontSize: 14, color: EntokColors.muted, height: 1.45)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),
                    ],
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

class _AccountMenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _AccountMenuTile({required this.icon, required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: EntokCard(
        padding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 10,
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Row(
            children: [

              SizedBox(
                width: 46,
                height: 46,
                child: EntokIconBox(
                  icon: icon,
                ),
              ),

              const SizedBox(width: 14),

              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    color: EntokColors.text,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),

              const Icon(
                Icons.chevron_right_rounded,
                color: Colors.grey,
                size: 28,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SupportTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _SupportTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: EntokCard(
        padding: const EdgeInsets.all(18),
        child: InkWell(
          onTap: onTap,
          child: Row(
            children: [
              EntokIconBox(icon: icon),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 17, color: EntokColors.text, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 6),
                    Text(subtitle, style: const TextStyle(fontSize: 14, color: EntokColors.muted, height: 1.25)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: Colors.grey, size: 34),
            ],
          ),
        ),
      ),
    );
  }
}

class _SwitchTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SwitchTile({required this.icon, required this.title, required this.subtitle, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: EntokCard(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            EntokIconBox(icon: icon),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 17, color: Colors.black, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text(subtitle, style: const TextStyle(fontSize: 14, color: Colors.black54, height: 1.25)),
                ],
              ),
            ),
            Switch(value: value, onChanged: onChanged, activeThumbColor: EntokColors.green),
          ],
        ),
      ),
    );
  }
}

class _ReminderOptionTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final String value;
  final String groupValue;
  final ValueChanged<String> onChanged;

  const _ReminderOptionTile({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.groupValue,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final selected = value == groupValue;
    return InkWell(
      onTap: () => onChanged(value),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded,
              color: selected ? EntokColors.green : EntokColors.muted,
              size: 24,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      color: selected ? EntokColors.greenDark : EntokColors.text,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 13, color: EntokColors.muted, height: 1.25),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CustomReminderMinutesField extends StatelessWidget {
  final TextEditingController controller;
  final String? errorText;
  final Future<void> Function() onApply;

  const _CustomReminderMinutesField({
    required this.controller,
    required this.errorText,
    required this.onApply,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 4, 22, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => onApply(),
                  decoration: InputDecoration(
                    hintText: 'Contoh: 15',
                    suffixText: 'menit',
                    errorText: errorText,
                    filled: true,
                    fillColor: const Color(0xFFF6FAF8),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFFD8E8DF)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFFD8E8DF)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: EntokColors.green, width: 2),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: onApply,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: EntokColors.green,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Terapkan', style: TextStyle(fontWeight: FontWeight.w900)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Bisa diisi mulai 1 menit. Nilai di atas 1440 menit akan dibatasi ke 1440.',
            style: TextStyle(fontSize: 12, color: EntokColors.muted, height: 1.35),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Text(title, style: const TextStyle(fontSize: 18, color: EntokColors.muted, fontWeight: FontWeight.w900)),
    );
  }
}

class _PageFieldLabel extends StatelessWidget {
  final String label;

  const _PageFieldLabel(this.label);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(label, style: const TextStyle(fontSize: 15, color: EntokColors.text, fontWeight: FontWeight.w900)),
    );
  }
}

class _CurrentDeviceBadge extends StatelessWidget {
  const _CurrentDeviceBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
      decoration: BoxDecoration(color: EntokColors.mintStrong, borderRadius: BorderRadius.circular(14)),
      child: const Text('HP Ini', style: TextStyle(color: EntokColors.greenDark, fontWeight: FontWeight.w900)),
    );
  }
}
