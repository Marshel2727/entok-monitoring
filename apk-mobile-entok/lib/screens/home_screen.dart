import 'package:flutter/material.dart';

import '../models/keeper_models.dart';
import '../services/api_service.dart';
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
                    const SizedBox(height: 18),
                    _buildChecklistSection(),
                    _buildTipsCard(),
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
      title: 'Selamat Beraktivitas, ${user?.name ?? 'Penjaga'}!',
      subtitle: isSyncing ? 'Menyinkronkan data...' : 'Berikut kegiatan hari ini',
      actionIcon: Icons.person_rounded,
      profileImage: user?.profileImage != null && user!.profileImage!.isNotEmpty ? ApiService().assetUrl(user!.profileImage) : null,
      onAction: onOpenAccount,
    );
  }

  Widget _buildTipsCard() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [
              Color(0xFFE8FFF0),
              Color(0xFFF8FFFA),
            ],
          ),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFC9F0D7)),
          boxShadow: [
            BoxShadow(
              color: EntokColors.green.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4CC),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.wb_sunny_rounded, color: Colors.orange, size: 30),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tips Hari Ini',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F3E11)),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Pastikan kandang selalu bersih dan kering agar entok tetap sehat, nyaman, dan terhindar dari penyakit.',
                    style: TextStyle(fontSize: 14, color: EntokColors.muted, height: 1.5, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
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
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 64,
                    height: 64,
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
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Progress Hari Ini',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: EntokColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${totalKegiatan - totalSelesai} kegiatan belum selesai',
                      style: const TextStyle(fontSize: 14, color: EntokColors.muted, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        Icon(Icons.check_rounded, size: 18, color: EntokColors.green),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Semangat berkegiatan harian',
                            style: TextStyle(fontSize: 12, color: EntokColors.greenDark, fontWeight: FontWeight.w800),
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
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: EntokColors.text,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ListView.separated(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: kegiatanList.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = kegiatanList[index];
                final bool isDone = item['isDone'] ?? false;

                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Colors.white, Color(0xFFF7FFF9)],
                    ),
                    border: Border.all(color: const Color(0xFFD9F3E2)),
                    boxShadow: [
                      BoxShadow(
                        color: EntokColors.green.withValues(alpha: 0.08),
                        blurRadius: 14,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.08),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: item['imageUrl'] != null && item['imageUrl'].toString().isNotEmpty
                              ? Image.network(
                                  item['imageUrl'],
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    color: EntokColors.green,
                                    child: Icon(item['icon'] ?? Icons.assignment_rounded, color: Colors.white, size: 30),
                                  ),
                                )
                              : Container(
                                  color: EntokColors.green,
                                  child: Icon(item['icon'] ?? Icons.assignment_rounded, color: Colors.white, size: 30),
                                ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['title'] ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 16.5,
                                fontWeight: FontWeight.w900,
                                color: EntokColors.text,
                                height: 1.2,
                                decoration: TextDecoration.none,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              item['desc'] ?? item['time'] ?? '',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 13,
                                color: EntokColors.muted,
                                height: 1.45,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 78,
                        height: 72,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              item['time'] ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.right,
                              style: const TextStyle(
                                fontSize: 12,
                                color: EntokColors.muted,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const Spacer(),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 250),
                              width: 30,
                              height: 30,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isDone ? EntokColors.green : Colors.white,
                                border: Border.all(
                                  color: isDone ? EntokColors.green : const Color(0xFFD8DEE5),
                                  width: 2,
                                ),
                              ),
                              child: isDone ? const Icon(Icons.check_rounded, size: 15, color: Colors.white) : null,
                            ),
                          ],
                        ),
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
