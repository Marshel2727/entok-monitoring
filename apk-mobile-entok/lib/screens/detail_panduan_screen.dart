import 'package:flutter/material.dart';
import '../models/panduan_model.dart';

class DetailPanduanScreen extends StatefulWidget {
  final PanduanModel dataPanduan;

  const DetailPanduanScreen({super.key, required this.dataPanduan});

  @override
  State<DetailPanduanScreen> createState() => _DetailPanduanScreenState();
}

class _DetailPanduanScreenState extends State<DetailPanduanScreen> {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 450),
        child: Container(
          color: Colors.white,
          child: Scaffold(
            backgroundColor: const Color(0xFFF5F5F5),
            body: CustomScrollView(
              slivers: [
                // ==================== HEADER DENGAN BANNER ====================
                SliverAppBar(
                  expandedHeight: 200,
                  pinned: true,
                  backgroundColor: const Color(0xFF26D057),
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context), // Kembali ke daftar panduan
                  ),
                  flexibleSpace: FlexibleSpaceBar(
                    background: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          widget.dataPanduan.bannerImageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              color: const Color(0xFFE8F5E9),
                              child: const Center(
                                child: Icon(Icons.image_not_supported, size: 48, color: Color(0xFF1B5E20)),
                              ),
                            );
                          },
                        ),
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.3),
                                Colors.black.withValues(alpha: 0.6),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // ==================== JUDUL DAN DESKRIPSI ====================
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: const Color(0xFFC2F8C4),
                              child: Icon(
                                widget.dataPanduan.iconTopik,
                                color: const Color(0xFF1B5E20),
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.dataPanduan.title,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1B5E20),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    widget.dataPanduan.subtitle,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                // ==================== LANGKAH-LANGKAH ====================
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Langkah-Langkah',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1B5E20),
                          ),
                        ),
                        const SizedBox(height: 4),
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: const EdgeInsets.only(top: 2),
                          itemCount: widget.dataPanduan.langkahList.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final langkah = widget.dataPanduan.langkahList[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF26D057),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${langkah.nomor}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        gradient: const LinearGradient(
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                          colors: [Colors.white, Color(0xFFF7FFF8)],
                                        ),
                                        borderRadius: BorderRadius.circular(18),
                                        border: Border.all(
                                          color: const Color(0xFFD8F2E1),
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.05),
                                            blurRadius: 10,
                                            offset: const Offset(0, 4),
                                          ),
                                        ],
                                      ),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 40,
                                            height: 40,
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFC2F8C4),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Icon(
                                              langkah.iconLangkah,
                                              color: const Color(0xFF1B5E20),
                                              size: 20,
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Text(
                                              langkah.deskripsi,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: Colors.black87,
                                                height: 1.4,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 16)),

                // ==================== BOX PERHATIAN ====================
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFFFFF5F5), Color(0xFFFFEBEE)],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFFEF5350),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.red.withValues(alpha: 0.08),
                            blurRadius: 12,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.warning_rounded,
                            color: Color(0xFFEF5350),
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'PERHATIAN',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    color: Color(0xFFEF5350),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.dataPanduan.perhatian,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.black87,
                                    height: 1.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 12)),

                // ==================== BOX CATATAN ====================
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFFF3F9FF), Color(0xFFE3F2FD)],
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFF1976D2),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blue.withValues(alpha: 0.08),
                            blurRadius: 12,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.lightbulb_rounded,
                            color: Color(0xFF1976D2),
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'CATATAN',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    color: Color(0xFF1976D2),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.dataPanduan.catatan,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.black87,
                                    height: 1.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
