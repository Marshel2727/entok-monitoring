import 'package:flutter/material.dart';

import '../models/keeper_models.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatelessWidget {
  final AppUser? user;
  final List<Map<String, dynamic>> kegiatanList;
  final double progress;
  final bool isSyncing;
  final String? error;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onOpenAccount;

  const HomeScreen({
    super.key,
    required this.user,
    required this.kegiatanList,
    required this.progress,
    required this.isSyncing,
    required this.error,
    required this.onRefresh,
    required this.onOpenAccount,
  });

  Color _getProgressColor(int percent) {
    if (percent <= 25) {
      return const Color(0xFFFF3D00);
    } else if (percent <= 50) {
      return Colors.orange;
    } else if (percent <= 75) {
      return Colors.yellow.shade700;
    } else {
      return const Color(0xFF26D057);
    }
  }

  @override
  Widget build(BuildContext context) {
    int totalSelesai = kegiatanList.where((item) => item['isDone'] == true).length;
    int totalKegiatan = kegiatanList.length;
    int progressPercent = (progress * 100).toInt();

    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: RefreshIndicator(
              color: EntokColors.green,
              onRefresh: onRefresh,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    if (error != null) ...[
                      _buildErrorBox(error!),
                      const SizedBox(height: 16),
                    ],
                    _buildProgressCard(progressPercent, totalSelesai, totalKegiatan),
                    const SizedBox(height: 42),
                    _buildChecklistSection(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return EntokTopHeader(
      title: 'Selamat Pagi, ${user?.name ?? 'Penjaga'}!',
      subtitle: isSyncing ? 'Menyinkronkan data...' : 'Berikut kegiatan hari ini',
      actionIcon: Icons.person_rounded,
      onAction: onOpenAccount,
    );
  }

  Widget _buildErrorBox(String message) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFEBEE),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFFCDD2)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Color(0xFFC62828), size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Color(0xFFC62828), fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressCard(int progressPercent, int totalSelesai, int totalKegiatan) {
    Color dynamicColor = _getProgressColor(progressPercent);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        decoration: BoxDecoration(
          color: EntokColors.mint,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFD9F5E4)),
          boxShadow: [
            BoxShadow(
              color: EntokColors.green.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, 8),
            )
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 74,
                    height: 74,
                    child: CircularProgressIndicator(
                      value: progress,
                    backgroundColor: const Color(0xFFE2E7F0),
                      valueColor: AlwaysStoppedAnimation<Color>(dynamicColor),
                      strokeWidth: 8,
                      strokeCap: StrokeCap.round,
                    ),
                  ),
                  // PERBAIKAN: Menampilkan kembali teks persentase di tengah lingkaran
                  Text(
                    '$progressPercent%',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Progress Hari Ini',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                        color: EntokColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${totalKegiatan - totalSelesai} kegiatan belum selesai',
                      style: const TextStyle(fontSize: 16, color: EntokColors.muted, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        Icon(Icons.check_rounded, size: 18, color: EntokColors.green),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Semangat berkegiatan harian',
                            style: TextStyle(fontSize: 14, color: EntokColors.greenDark, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
                    )
                  ],
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChecklistSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.edit_note_rounded, color: Color(0xFF1B5E20), size: 24),
              SizedBox(width: 8),
              Text(
                  'CHECKLIST HARI INI',
                  style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: EntokColors.text,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: kegiatanList.length,
              separatorBuilder: (context, index) => const SizedBox(height: 20),
              itemBuilder: (context, index) {
                final item = kegiatanList[index];
                final bool isDone = item['isDone'] ?? false;

                return EntokCard(
                  padding: const EdgeInsets.all(20),
                  radius: 26,
                  child: Row(
                    children: [
                      Container(
                        width: 62,
                        height: 62,
                        decoration: BoxDecoration(
                          color: EntokColors.green,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: item['imageUrl'] != null
                              ? Image.network(item['imageUrl'], fit: BoxFit.cover)
                              : Icon(item['icon'] ?? Icons.assignment_rounded, color: Colors.white, size: 34),
                        ),
                      ),
                      const SizedBox(width: 18),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['title'] ?? '',
                              style: const TextStyle(
                                fontSize: 23,
                                fontWeight: FontWeight.w900,
                                color: EntokColors.text,
                                decoration: TextDecoration.none,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              item['desc'] ?? item['time'] ?? '',
                              style: const TextStyle(
                                fontSize: 16,
                                color: EntokColors.muted,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isDone ? EntokColors.green : Colors.white,
                          border: Border.all(
                            color: isDone ? EntokColors.green : Colors.black54,
                            width: 2.5,
                          ),
                        ),
                        child: isDone ? const Icon(Icons.check, size: 18, color: Colors.white) : null,
                      ),
                    ],
                  ),
                );
              },
          ),
        ],
      ),
    );
  }
}
