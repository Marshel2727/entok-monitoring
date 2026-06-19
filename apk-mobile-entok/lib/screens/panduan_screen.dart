import 'package:flutter/material.dart';

import '../models/keeper_models.dart';
import '../models/panduan_model.dart';
import '../services/api_service.dart';
import 'detail_panduan_screen.dart';

class PanduanScreen extends StatelessWidget {
  final ApiService api;
  final List<KeeperTask> tasks;
  final List<FeedItem> feeds;
  final List<FormulationItem> formulations;
  final List<PopulationPhase> populations;
  final Function(int)? onTabSwitch;

  const PanduanScreen({
    super.key,
    required this.api,
    required this.tasks,
    required this.feeds,
    required this.formulations,
    required this.populations,
    this.onTabSwitch,
  });

  @override
  Widget build(BuildContext context) {
    final listPanduan = tasks.isNotEmpty ? tasks.map(_panduanFromTask).toList() : _fallbackPanduan;

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
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 16,
                            offset: const Offset(0, 8),
                          )
                        ],
                      ),
                      child: Row(
                        children: [
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Panduan\nPenjaga Entok',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20)),
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'SOP diambil dari dashboard web dan tersambung ke backend VPS.',
                                  style: TextStyle(fontSize: 12, color: Colors.grey, height: 1.4),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          CircleAvatar(
                            radius: 36,
                            backgroundColor: const Color(0xFFE8F5E9),
                            child: Icon(tasks.isNotEmpty ? Icons.cloud_done_rounded : Icons.pets, size: 36, color: const Color(0xFF26D057)),
                          )
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                    child: Row(
                      children: [
                        Icon(Icons.library_books, color: Color(0xFF1B5E20), size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Topik Panduan',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: listPanduan.length,
                      itemBuilder: (context, index) {
                        final data = listPanduan[index];
                        return GestureDetector(
                          onTap: () async {
                            final targetIndex = await Navigator.push<int>(
                              context,
                              MaterialPageRoute(builder: (context) => DetailPanduanScreen(dataPanduan: data)),
                            );
                            if (targetIndex != null && onTabSwitch != null && context.mounted) {
                              onTabSwitch!(targetIndex);
                            }
                          },
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFC2F8C4),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: Colors.white60,
                                  child: Icon(data.iconTopik, color: const Color(0xFF1B5E20), size: 20),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        data.title,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F3E11)),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        data.subtitle,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF2E5A30)),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF1B5E20), size: 14)
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                    child: _buildApiSummaryCard(),
                  ),
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
      padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 16, 20, 20),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(color: Color(0xFFFF5722), shape: BoxShape.circle),
            child: const Icon(Icons.face_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Panduan', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                SizedBox(height: 4),
                Text('Panduan Kegiatan Harian', style: TextStyle(color: Color(0xCCFFFFFF), fontSize: 12, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          const Icon(Icons.verified_rounded, color: Colors.white, size: 22),
        ],
      ),
    );
  }

  PanduanModel _panduanFromTask(KeeperTask task) {
    final steps = task.langkah.isNotEmpty
        ? task.langkah
            .map((step) => LangkahPanduan(
                  nomor: step.no,
                  deskripsi: step.text,
                  iconLangkah: Icons.task_alt_rounded,
                ))
            .toList()
        : [
            LangkahPanduan(
              nomor: 1,
              deskripsi: task.deskripsi.isNotEmpty ? task.deskripsi : 'Ikuti instruksi tugas sesuai SOP kandang.',
              iconLangkah: Icons.check_circle_outline,
            ),
          ];

    final imageUrl = api.assetUrl(task.img);
    return PanduanModel(
      title: task.nama,
      subtitle: task.deskripsi,
      iconTopik: _iconForTask(task.nama),
      bannerImageUrl: imageUrl.isNotEmpty ? imageUrl : _fallbackBanner(task.nama),
      langkahList: steps,
      perhatian: task.perhatikan.isNotEmpty ? task.perhatikan : 'Pastikan kegiatan dilakukan sesuai urutan dan kondisi kandang aman.',
      catatan: task.catatan.isNotEmpty ? task.catatan : 'Laporkan ke pengawas jika ada kondisi tidak normal.',
    );
  }

  Widget _buildApiSummaryCard() {
    final totalPopulasi = populations.fold<int>(0, (sum, item) => sum + item.jumlahEkor);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.cloud_done_rounded, color: Color(0xFF1B5E20), size: 18),
              SizedBox(width: 8),
              Text('Ringkasan Data Backend', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1B5E20), fontSize: 13)),
            ],
          ),
          const SizedBox(height: 10),
          _summaryRow('Tugas SOP', '${tasks.length} item'),
          _summaryRow('Pakan tersedia', '${feeds.length} jenis'),
          _summaryRow('Formulasi', '${formulations.length} fase'),
          _summaryRow('Populasi tercatat', '$totalPopulasi ekor'),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F3E11))),
        ],
      ),
    );
  }

  IconData _iconForTask(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('pakan')) return Icons.restaurant_menu_rounded;
    if (lower.contains('air') || lower.contains('minum')) return Icons.water_drop_rounded;
    if (lower.contains('bersih') || lower.contains('kandang')) return Icons.cleaning_services_rounded;
    if (lower.contains('pertanian') || lower.contains('tanam')) return Icons.agriculture_rounded;
    return Icons.assignment_turned_in_rounded;
  }

  String _fallbackBanner(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('pakan')) {
      return 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=600&auto=format&fit=crop';
    }
    if (lower.contains('air')) {
      return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1485872299829-c673f5194813?q=80&w=600&auto=format&fit=crop';
  }

  List<PanduanModel> get _fallbackPanduan => [
        PanduanModel(
          title: 'Cara mencacah pakan',
          subtitle: 'Langkah mencacah pakan agar entok lebih mudah makan',
          iconTopik: Icons.restaurant_menu,
          bannerImageUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=600&auto=format&fit=crop',
          langkahList: [
            LangkahPanduan(nomor: 1, deskripsi: 'Pilih bahan pakan yang masih segar dan layak digunakan', iconLangkah: Icons.grass),
            LangkahPanduan(nomor: 2, deskripsi: 'Cuci bahan pakan dari kotoran atau debu', iconLangkah: Icons.water_drop),
            LangkahPanduan(nomor: 3, deskripsi: 'Potong bahan pakan menjadi ukuran yang mudah dimakan entok', iconLangkah: Icons.content_cut),
          ],
          perhatian: 'Jangan gunakan bahan pakan yang busuk berjamur.',
          catatan: 'Lakukan pencacahan secukupnya agar pakan tetap segar.',
        ),
      ];
}
