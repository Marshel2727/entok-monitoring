import 'package:flutter/material.dart';

import '../models/keeper_models.dart';
import '../theme/app_theme.dart';

class AccountScreen extends StatelessWidget {
  final AppUser? user;
  final Future<void> Function() onLogout;

  const AccountScreen({
    super.key,
    required this.user,
    required this.onLogout,
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
              const EntokTopHeader(title: 'Kelola Akun', showBack: true),
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
                        child: const Icon(Icons.emoji_nature_rounded, color: EntokColors.green, size: 60),
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
                      title: 'Edit Profil',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => EditProfileScreen(user: user))),
                    ),
                    _AccountMenuTile(
                      icon: Icons.notifications_none_rounded,
                      title: 'Pengaturan Notifikasi',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationSettingsScreen())),
                    ),
                    _AccountMenuTile(
                      icon: Icons.shield_outlined,
                      title: 'Keamanan',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => SecurityScreen(user: user, onLogout: onLogout))),
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

class EditProfileScreen extends StatelessWidget {
  final AppUser? user;

  const EditProfileScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 450),
          child: Column(
            children: [
              const EntokTopHeader(title: 'Edit Profil', showBack: true),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                  children: [
                    Center(
                      child: Stack(
                        children: [
                          Container(
                            width: 128,
                            height: 128,
                            decoration: const BoxDecoration(color: Color(0xFFCFF7DF), shape: BoxShape.circle),
                            child: const Icon(Icons.person_rounded, color: EntokColors.green, size: 72),
                          ),
                          Positioned(
                            right: 0,
                            bottom: 6,
                            child: Container(
                              width: 52,
                              height: 52,
                              decoration: const BoxDecoration(color: EntokColors.green, shape: BoxShape.circle),
                              child: const Icon(Icons.photo_camera_rounded, color: Colors.white, size: 26),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 34),
                    const _PageFieldLabel('Nama Lengkap'),
                    TextField(
                      controller: TextEditingController(text: user?.name ?? 'Penjaga Entok'),
                      decoration: entokInputDecoration('Nama Lengkap', Icons.person_outline_rounded),
                    ),
                    const SizedBox(height: 24),
                    const _PageFieldLabel('Nomor WhatsApp'),
                    TextField(decoration: entokInputDecoration('081234567890', Icons.chat_bubble_outline_rounded)),
                    const SizedBox(height: 24),
                    const _PageFieldLabel('Email'),
                    TextField(decoration: entokInputDecoration('email@farm.com', Icons.mail_outline_rounded)),
                    const SizedBox(height: 24),
                    const _PageFieldLabel('Password Baru'),
                    TextField(
                      obscureText: true,
                      decoration: entokInputDecoration(
                        'Password Baru',
                        Icons.lock_outline_rounded,
                        suffixIcon: const Icon(Icons.visibility_off_rounded, color: Colors.grey, size: 28),
                      ),
                    ),
                    const SizedBox(height: 54),
                    EntokPrimaryButton(label: 'SIMPAN PERUBAHAN', onPressed: () => Navigator.pop(context)),
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
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  final Map<String, bool> _settings = {
    'Pengingat Pakan': true,
    'Kebersihan Kandang': true,
    'Kesehatan & Vaksin': true,
    'Cek Stok Air & Pakan': false,
    'Jangan Ganggu (DND)': false,
  };

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
                    const _SectionTitle('Aktivitas Kandang'),
                    _SwitchTile(icon: Icons.restaurant_rounded, title: 'Pengingat Pakan', subtitle: 'Notifikasi jadwal pakan pagi & sore', value: _settings['Pengingat Pakan']!, onChanged: _set('Pengingat Pakan')),
                    _SwitchTile(icon: Icons.cleaning_services_rounded, title: 'Kebersihan Kandang', subtitle: 'Pengingat jadwal kuras kolam & kandang', value: _settings['Kebersihan Kandang']!, onChanged: _set('Kebersihan Kandang')),
                    _SwitchTile(icon: Icons.medical_services_rounded, title: 'Kesehatan & Vaksin', subtitle: 'Notifikasi jadwal vitamin & cek kesehatan', value: _settings['Kesehatan & Vaksin']!, onChanged: _set('Kesehatan & Vaksin')),
                    _SwitchTile(icon: Icons.water_drop_rounded, title: 'Cek Stok Air & Pakan', subtitle: 'Peringatan jika stok hampir habis', value: _settings['Cek Stok Air & Pakan']!, onChanged: _set('Cek Stok Air & Pakan')),
                    const SizedBox(height: 26),
                    const _SectionTitle('Mode Khusus'),
                    _SwitchTile(icon: Icons.notifications_off_rounded, title: 'Jangan Ganggu (DND)', subtitle: 'Matikan semua notifikasi sementara', value: _settings['Jangan Ganggu (DND)']!, onChanged: _set('Jangan Ganggu (DND)')),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  ValueChanged<bool> _set(String key) {
    return (value) => setState(() => _settings[key] = value);
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
              const EntokTopHeader(title: 'Hubungi Admin', showBack: true),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
                  child: Column(
                    children: [
                      const CircleAvatar(radius: 58, backgroundColor: EntokColors.mint, child: Icon(Icons.chat_bubble_rounded, color: EntokColors.green, size: 58)),
                      const SizedBox(height: 56),
                      const Text('Butuh Bantuan?', textAlign: TextAlign.center, style: TextStyle(fontSize: 26, color: EntokColors.text, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 24),
                      const Text('Tim admin kami siap membantu Anda. Tekan tombol di bawah untuk menyalin nomor WhatsApp kami.', textAlign: TextAlign.center, style: TextStyle(fontSize: 15, color: EntokColors.muted, height: 1.35)),
                      const Spacer(),
                      EntokPrimaryButton(label: 'SALIN NOMOR WHATSAPP', icon: Icons.phone_android_rounded, onPressed: () => Navigator.pop(context)),
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
                        padding: const EdgeInsets.all(22),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(color: EntokColors.mint, borderRadius: BorderRadius.circular(14)),
                              child: Center(child: Text('${i + 1}', style: const TextStyle(color: EntokColors.green, fontSize: 18, fontWeight: FontWeight.w900))),
                            ),
                            const SizedBox(width: 22),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(items[i].$1, style: const TextStyle(fontSize: 18, color: EntokColors.text, fontWeight: FontWeight.w900)),
                                  const SizedBox(height: 12),
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
      padding: const EdgeInsets.only(bottom: 18),
      child: EntokCard(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
        child: InkWell(
          onTap: onTap,
          child: Row(
            children: [
              EntokIconBox(icon: icon),
              const SizedBox(width: 16),
              Expanded(child: Text(title, style: const TextStyle(fontSize: 17, color: EntokColors.text, fontWeight: FontWeight.w900))),
              const Icon(Icons.chevron_right_rounded, color: Colors.grey, size: 34),
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
            Switch(value: value, onChanged: onChanged, activeColor: EntokColors.green),
          ],
        ),
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
