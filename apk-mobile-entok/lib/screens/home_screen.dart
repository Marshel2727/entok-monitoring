import 'package:flutter/material.dart';

import '../models/keeper_models.dart';

class HomeScreen extends StatelessWidget {
  final AppUser? user;
  final List<Map<String, dynamic>> kegiatanList;
  final double progress;
  final bool isSyncing;
  final String? error;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onLogout;

  const HomeScreen({
    super.key,
    required this.user,
    required this.kegiatanList,
    required this.progress,
    required this.isSyncing,
    required this.error,
    required this.onRefresh,
    required this.onLogout,
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
      backgroundColor: const Color(0xFFF5F5F5),
      body: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 16),
                  if (error != null) ...[
                    _buildErrorBox(error!),
                    const SizedBox(height: 16),
                  ],
                  _buildProgressCard(progressPercent, totalSelesai, totalKegiatan),
                  const SizedBox(height: 16),
                  _buildKegiatanDilakukanCard(),
                  const SizedBox(height: 24),
                  _buildChecklistSection(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF26D057),
      padding: EdgeInsets.fromLTRB(
        20, 
        MediaQuery.of(context).padding.top + 16, 
        20, 
        20,
      ), 
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: Color(0xFFFF5722),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.face_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Selamat Pagi, ${user?.name ?? 'Penjaga'}!',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isSyncing ? 'Menyinkronkan data...' : 'Berikut kegiatan hari ini',
                  style: const TextStyle(
                    color: Color(0xCCFFFFFF),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 72,
            height: 32,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: Icon(
                    isSyncing ? Icons.sync_rounded : Icons.refresh_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                  onPressed: isSyncing ? null : () => onRefresh(),
                ),
                const SizedBox(width: 10),
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: const Icon(Icons.logout_rounded, color: Colors.white, size: 21),
                  onPressed: () => onLogout(),
                ),
              ],
            ),
          ),
        ],
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
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
                      backgroundColor: const Color(0xFFE8F5E9),
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
                      'Progress Hari ini',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Colors.black54,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$totalSelesai/$totalKegiatan kegiatan sudah selesai',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: dynamicColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.check_circle, size: 16, color: Color(0xFF26D057)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Semangat! Melakukan kegiatan hari ini',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
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

  Widget _buildKegiatanDilakukanCard() {
    final belumSelesaiList = kegiatanList.where((item) => item['isDone'] != true).toList();

    Map<String, dynamic> kegiatan;
    if (belumSelesaiList.isNotEmpty) {
      kegiatan = belumSelesaiList.first;
    } else {
      if (kegiatanList.isNotEmpty) {
        kegiatan = kegiatanList.last;
      } else {
        return const SizedBox.shrink();
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFFB9F6CA),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF26D057).withValues(alpha: 0.12),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.access_time_filled_rounded, color: Colors.black87, size: 18),
                SizedBox(width: 8),
                Text(
                  'Item Kegiatan Sedang Berjalan',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              kegiatan['title'] ?? '',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.fromLTRB(8, 3, 8, 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              kegiatan['time'] ?? '',
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        kegiatan['desc'] ?? '',
                        style: const TextStyle(fontSize: 13, color: Colors.black54, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: kegiatan['imageUrl'] != null 
                        ? Image.network(kegiatan['imageUrl'], fit: BoxFit.cover)
                        : const Icon(Icons.assignment, color: Color(0xFF1B5E20), size: 36),
                  ),
                )
              ],
            )
          ],
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
                'Checklist Hari Ini',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1B5E20),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF99FFAB),
              borderRadius: BorderRadius.circular(18),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: kegiatanList.length,
              separatorBuilder: (context, index) => Container(
                height: 1,
                color: Colors.white.withValues(alpha: 0.4),
              ),
              itemBuilder: (context, index) {
                final item = kegiatanList[index];
                final bool isWaktunya = item['isWaktunya'] ?? false;
                final bool isDone = item['isDone'] ?? false;

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white24,
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(23),
                          child: item['imageUrl'] != null
                              ? Image.network(item['imageUrl'], fit: BoxFit.cover)
                              : const Icon(Icons.fiber_manual_record, color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['title'] ?? '',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1B5E20),
                                decoration: TextDecoration.none,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item['time'] ?? '',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.black45,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.fromLTRB(10, 4, 10, 5),
                        decoration: BoxDecoration(
                          color: isDone 
                              ? const Color(0xFF26D057) 
                              : (isWaktunya ? const Color(0xFFC79121) : const Color(0xFF757575)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          isDone 
                              ? 'Selesai' 
                              : (isWaktunya ? 'Waktunya' : 'Belum Waktunya'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isDone ? const Color(0xFF00E676) : Colors.white.withValues(alpha: 0.4),
                          border: Border.all(
                            color: isDone ? const Color(0xFF00E676) : const Color(0xFF1B5E20).withValues(alpha: 0.5), 
                            width: 2,
                          ),
                        ),
                        child: isDone
                            ? const Icon(Icons.check, size: 16, color: Colors.white)
                            : null,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
