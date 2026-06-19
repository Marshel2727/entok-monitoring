import 'package:flutter/material.dart';

class LangkahPanduan {
  final int nomor;
  final String deskripsi;
  final IconData iconLangkah;

  LangkahPanduan({required this.nomor, required this.deskripsi, required this.iconLangkah});
}

class PanduanModel {
  final String title;
  final String subtitle;
  final IconData iconTopik;
  final String bannerImageUrl;
  final List<LangkahPanduan> langkahList;
  final String perhatian;
  final String catatan;

  PanduanModel({
    required this.title,
    required this.subtitle,
    required this.iconTopik,
    required this.bannerImageUrl,
    required this.langkahList,
    required this.perhatian,
    required this.catatan,
  });
}