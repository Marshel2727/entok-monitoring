import 'package:flutter/material.dart';

import '../models/keeper_models.dart';
import '../models/panduan_model.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'detail_panduan_screen.dart';

class PanduanScreen extends StatefulWidget {
  final ApiService api;
  final List<KeeperTask> tasks;
  final List<FeedItem> feeds;
  final List<FormulationItem> formulations;
  final List<PopulationPhase> populations;
  final Function(int)? onTabSwitch;
  final Future<void> Function() onOpenAccount;

  const PanduanScreen({
    super.key,
    required this.api,
    required this.tasks,
    required this.feeds,
    required this.formulations,
    required this.populations,
    required this.onOpenAccount,
    this.onTabSwitch,
  });

  @override
  State<PanduanScreen> createState() => _PanduanScreenState();
}

class _PanduanScreenState extends State<PanduanScreen> {
  int _selectedTab = 0;

  @override
  Widget build(BuildContext context) {
    final listPanduan = widget.tasks.isNotEmpty ? widget.tasks.map(_panduanFromTask).toList() : _fallbackPanduan;

    return Scaffold(
      backgroundColor: EntokColors.background,
      body: Column(
        children: [
          EntokTopHeader(
            title: 'Panduan',
            subtitle: 'Panduan kerja dan racikan pakan',
            actionIcon: Icons.person_rounded,
            onAction: widget.onOpenAccount,
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 26, 24, 28),
              children: [
                _SegmentedTabs(
                  selectedIndex: _selectedTab,
                  onChanged: (index) => setState(() => _selectedTab = index),
                ),
                const SizedBox(height: 36),
                if (_selectedTab == 0) ...[
                  for (var i = 0; i < listPanduan.length; i++)
                    _GuideTile(
                      number: i + 1,
                      data: listPanduan[i],
                      onTap: () async {
                        final targetIndex = await Navigator.push<int>(
                          context,
                          MaterialPageRoute(builder: (context) => DetailPanduanScreen(dataPanduan: listPanduan[i])),
                        );
                        if (targetIndex != null && widget.onTabSwitch != null && context.mounted) {
                          widget.onTabSwitch!(targetIndex);
                        }
                      },
                    ),
                ] else ...[
                  if (widget.formulations.isEmpty)
                    const EntokCard(
                      color: EntokColors.mint,
                      child: Text(
                        'Belum ada data formulasi pakan dari backend.',
                        style: TextStyle(color: EntokColors.muted, fontWeight: FontWeight.w700),
                      ),
                    )
                  else
                    for (final formulation in widget.formulations) _RecipeCard(formulation: formulation, feeds: widget.feeds, populations: widget.populations),
                ],
              ],
            ),
          ),
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

    final imageUrl = widget.api.assetUrl(task.img);
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

  IconData _iconForTask(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('pakan')) return Icons.eco_rounded;
    if (lower.contains('air') || lower.contains('minum')) return Icons.water_drop_rounded;
    if (lower.contains('bersih') || lower.contains('kandang')) return Icons.cleaning_services_rounded;
    if (lower.contains('pertanian') || lower.contains('tanam')) return Icons.agriculture_rounded;
    return Icons.assignment_turned_in_rounded;
  }

  String _fallbackBanner(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('pakan')) return 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=600&auto=format&fit=crop';
    if (lower.contains('air')) return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600&auto=format&fit=crop';
    return 'https://images.unsplash.com/photo-1485872299829-c673f5194813?q=80&w=600&auto=format&fit=crop';
  }

  List<PanduanModel> get _fallbackPanduan => [
        PanduanModel(
          title: 'Beri Pakan',
          subtitle: 'Pemberian pakan sesuai batch racikan harian',
          iconTopik: Icons.eco_rounded,
          bannerImageUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=600&auto=format&fit=crop',
          langkahList: [
            LangkahPanduan(nomor: 1, deskripsi: 'Siapkan batch racikan dari menu Checklist.', iconLangkah: Icons.restaurant_menu_rounded),
            LangkahPanduan(nomor: 2, deskripsi: 'Pastikan data Timbangan 2 masuk sesuai target.', iconLangkah: Icons.scale_rounded),
            LangkahPanduan(nomor: 3, deskripsi: 'Finalisasi batch setelah semua bahan siap.', iconLangkah: Icons.task_alt_rounded),
          ],
          perhatian: 'Jangan finalisasi jika bahan belum sesuai target.',
          catatan: 'Data racikan tersimpan ke backend VPS.',
        ),
      ];
}

class _SegmentedTabs extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  const _SegmentedTabs({required this.selectedIndex, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 72,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F3F8),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 5)),
        ],
      ),
      child: Row(
        children: [
          _tab('Panduan Kerja', 0),
          _tab('Racikan Pakan', 1),
        ],
      ),
    );
  }

  Widget _tab(String label, int index) {
    final active = selectedIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? EntokColors.green : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
            boxShadow: active
                ? [
                    BoxShadow(color: EntokColors.green.withValues(alpha: 0.28), blurRadius: 16, offset: const Offset(0, 7)),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: active ? Colors.white : const Color(0xFF9CA8B8),
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }
}

class _GuideTile extends StatelessWidget {
  final int number;
  final PanduanModel data;
  final VoidCallback onTap;

  const _GuideTile({required this.number, required this.data, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: EntokCard(
        color: const Color(0xFFEAF8F1),
        borderColor: const Color(0xFFC8F0DC),
        radius: 24,
        padding: const EdgeInsets.all(20),
        elevated: false,
        child: InkWell(
          onTap: onTap,
          child: Row(
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
                child: Icon(data.iconTopik, color: EntokColors.green, size: 38),
              ),
              const SizedBox(width: 22),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('PANDUAN $number', style: const TextStyle(color: EntokColors.green, fontSize: 17, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 8),
                    Text(data.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: EntokColors.text, fontSize: 26, fontWeight: FontWeight.w900)),
                  ],
                ),
              ),
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, border: Border.all(color: const Color(0xFFE2EFE8))),
                child: const Icon(Icons.arrow_forward_rounded, color: EntokColors.green, size: 30),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecipeCard extends StatelessWidget {
  final FormulationItem formulation;
  final List<FeedItem> feeds;
  final List<PopulationPhase> populations;

  const _RecipeCard({required this.formulation, required this.feeds, required this.populations});

  @override
  Widget build(BuildContext context) {
    final population = populations.where((item) => item.fase.toLowerCase() == formulation.fase.toLowerCase()).fold<int>(0, (sum, item) => sum + item.jumlahEkor);
    final totalKg = population * formulation.targetKonsumsi / 1000;

    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: EntokCard(
        color: const Color(0xFFEAF8F1),
        borderColor: const Color(0xFFC8F0DC),
        radius: 24,
        padding: const EdgeInsets.all(22),
        elevated: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    formulation.fase.toUpperCase(),
                    style: const TextStyle(color: EntokColors.green, fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                  child: Text('Total: ${_fmt(totalKg)} kg', style: const TextStyle(color: EntokColors.green, fontSize: 16, fontWeight: FontWeight.w900)),
                ),
              ],
            ),
            const SizedBox(height: 22),
            Text(formulation.kategori, style: const TextStyle(color: EntokColors.text, fontSize: 23, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            Text('Target: ${_fmt(formulation.targetKonsumsi)} g/ekor ($population Ekor)', style: const TextStyle(color: EntokColors.muted, fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 26),
            const Divider(color: Color(0xFF9CE0BE)),
            const SizedBox(height: 16),
            for (final entry in formulation.komposisi.entries) _IngredientLine(name: entry.key, kg: totalKg * entry.value / 100, feeds: feeds),
          ],
        ),
      ),
    );
  }

  String _fmt(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }
}

class _IngredientLine extends StatelessWidget {
  final String name;
  final double kg;
  final List<FeedItem> feeds;

  const _IngredientLine({required this.name, required this.kg, required this.feeds});

  @override
  Widget build(BuildContext context) {
    FeedItem? feed;
    for (final item in feeds) {
      if (item.nama.toLowerCase() == name.toLowerCase()) {
        feed = item;
        break;
      }
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline_rounded, color: EntokColors.green, size: 24),
          const SizedBox(width: 14),
          Expanded(child: Text(name, style: const TextStyle(color: EntokColors.text, fontSize: 20, fontWeight: FontWeight.w900))),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${_fmt(kg)} kg', style: const TextStyle(color: EntokColors.text, fontSize: 20, fontWeight: FontWeight.w900)),
              if (feed != null) Text('Sisa: ${_fmt(feed.stok)} kg', style: const TextStyle(color: Color(0xFF9CA8B8), fontSize: 14, fontWeight: FontWeight.w700)),
            ],
          ),
        ],
      ),
    );
  }

  String _fmt(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }
}
