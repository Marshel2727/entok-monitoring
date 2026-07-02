class AppUser {
  final String id;
  final String name;
  final String username;
  final String role;
  final String? shift;
  final String? status;
  final String? profileImage;

  const AppUser({
    required this.id,
    required this.name,
    required this.username,
    required this.role,
    this.shift,
    this.status,
    this.profileImage,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: '${json['id'] ?? ''}',
      name: '${json['name'] ?? json['nama'] ?? 'Penjaga'}',
      username: '${json['username'] ?? ''}',
      role: '${json['role'] ?? 'PENJAGA'}',
      shift: json['shift']?.toString(),
      status: json['status']?.toString(),
      profileImage: json['profile_image']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'username': username,
        'role': role,
        'shift': shift,
        'status': status,
        'profile_image': profileImage,
      };
}

class TaskStepModel {
  final int no;
  final String text;
  final String thumbnailImg;

  const TaskStepModel({
    required this.no,
    required this.text,
    this.thumbnailImg = '',
  });

  factory TaskStepModel.fromJson(Map<String, dynamic> json) {
    return TaskStepModel(
      no: _asInt(json['no']),
      text: '${json['text'] ?? ''}',
      thumbnailImg: '${json['thumbnailImg'] ?? ''}',
    );
  }
}

class KeeperTask {
  final String id;
  final String nama;
  final String waktu;
  final String deskripsi;
  final String img;
  final String infoDetail;
  final String perhatikan;
  final String catatan;
  final List<TaskStepModel> langkah;

  const KeeperTask({
    required this.id,
    required this.nama,
    required this.waktu,
    required this.deskripsi,
    this.img = '',
    this.infoDetail = '',
    this.perhatikan = '',
    this.catatan = '',
    this.langkah = const [],
  });

  factory KeeperTask.fromJson(Map<String, dynamic> json) {
    return KeeperTask(
      id: '${json['id'] ?? json['task_id'] ?? ''}',
      nama: '${json['nama'] ?? json['task_title'] ?? ''}',
      waktu: '${json['waktu'] ?? ''}',
      deskripsi: '${json['deskripsi'] ?? ''}',
      img: '${json['img'] ?? ''}',
      infoDetail: '${json['infoDetail'] ?? ''}',
      perhatikan: '${json['perhatikan'] ?? ''}',
      catatan: '${json['catatan'] ?? ''}',
      langkah: _asList(json['langkah'])
          .whereType<Map>()
          .map((item) => TaskStepModel.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
    );
  }
}

class DailyChecklistItem extends KeeperTask {
  final String taskId;
  final bool isCompleted;
  final String? completedAt;
  final String executionId;

  const DailyChecklistItem({
    required super.id,
    required this.taskId,
    required super.nama,
    required super.waktu,
    required super.deskripsi,
    required this.isCompleted,
    this.completedAt,
    this.executionId = '',
    super.img,
    super.infoDetail,
    super.perhatikan,
    super.catatan,
    super.langkah,
  });

  factory DailyChecklistItem.fromJson(Map<String, dynamic> json) {
    final taskId = '${json['task_id'] ?? json['id'] ?? ''}';
    final executionId = '${json['execution_id'] ?? ''}';
    return DailyChecklistItem(
      id: taskId,
      taskId: taskId,
      nama: '${json['nama'] ?? ''}',
      waktu: '${json['waktu'] ?? ''}',
      deskripsi: '${json['deskripsi'] ?? ''}',
      img: '${json['img'] ?? ''}',
      isCompleted: json['is_completed'] == true,
      completedAt: json['completed_at']?.toString(),
      executionId: executionId,
      infoDetail: '${json['infoDetail'] ?? ''}',
      perhatikan: '${json['perhatikan'] ?? ''}',
      catatan: '${json['catatan'] ?? ''}',
      langkah: _asList(json['langkah'])
          .whereType<Map>()
          .map((item) => TaskStepModel.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
    );
  }
}

class FeedItem {
  final String id;
  final String nama;
  final String kategori;
  final double stok;
  final double ambangBatas;

  const FeedItem({
    required this.id,
    required this.nama,
    required this.kategori,
    required this.stok,
    required this.ambangBatas,
  });

  factory FeedItem.fromJson(Map<String, dynamic> json) {
    return FeedItem(
      id: '${json['id'] ?? ''}',
      nama: '${json['nama'] ?? ''}',
      kategori: '${json['kategori'] ?? ''}',
      stok: _asDouble(json['stok']),
      ambangBatas: _asDouble(json['ambangBatas']),
    );
  }
}

class FormulationItem {
  final String id;
  final String fase;
  final String kategori;
  final double targetKonsumsi;
  final Map<String, double> komposisi;
  final List<String> pakanAlternatif;

  const FormulationItem({
    required this.id,
    required this.fase,
    required this.kategori,
    required this.targetKonsumsi,
    required this.komposisi,
    required this.pakanAlternatif,
  });

  factory FormulationItem.fromJson(Map<String, dynamic> json) {
    final rawComposition = Map<String, dynamic>.from(json['komposisi'] ?? {});
    return FormulationItem(
      id: '${json['id'] ?? ''}',
      fase: '${json['fase'] ?? ''}',
      kategori: '${json['kategori'] ?? ''}',
      targetKonsumsi: _asDouble(json['targetKonsumsi']),
      komposisi: rawComposition.map((key, value) => MapEntry(key, _asDouble(value))),
      pakanAlternatif: _asList(json['pakanAlternatif']).map((item) => '$item').toList(),
    );
  }
}

class PopulationPhase {
  final String id;
  final String fase;
  final int jumlahEkor;

  const PopulationPhase({
    required this.id,
    required this.fase,
    required this.jumlahEkor,
  });

  factory PopulationPhase.fromJson(Map<String, dynamic> json) {
    return PopulationPhase(
      id: '${json['id'] ?? ''}',
      fase: '${json['fase'] ?? json['phase'] ?? ''}',
      jumlahEkor: _asInt(json['jumlah_ekor'] ?? json['total_ducks']),
    );
  }
}

class FeedingBatchIngredient {
  final int id;
  final String? feedId;
  final String? phaseId;
  final String feedName;
  final String phase;
  final int populationCount;
  final double targetConsumption;
  final double plannedAmount;
  final double weighedAmount;
  final double deductedAmount;
  final double varianceAmount;
  final String unit;

  const FeedingBatchIngredient({
    required this.id,
    this.feedId,
    this.phaseId,
    required this.feedName,
    required this.phase,
    required this.populationCount,
    required this.targetConsumption,
    required this.plannedAmount,
    required this.weighedAmount,
    required this.deductedAmount,
    required this.varianceAmount,
    required this.unit,
  });

  factory FeedingBatchIngredient.fromJson(Map<String, dynamic> json) {
    return FeedingBatchIngredient(
      id: _asInt(json['id']),
      feedId: json['feed_id']?.toString(),
      phaseId: json['phase_id']?.toString(),
      feedName: '${json['feed_name'] ?? ''}',
      phase: '${json['phase'] ?? ''}',
      populationCount: _asInt(json['population_count']),
      targetConsumption: _asDouble(json['target_consumption']),
      plannedAmount: _asDouble(json['planned_amount']),
      weighedAmount: _asDouble(json['weighed_amount']),
      deductedAmount: _asDouble(json['deducted_amount']),
      varianceAmount: _asDouble(json['variance_amount']),
      unit: '${json['unit'] ?? 'kg'}',
    );
  }
}

class FeedingBatch {
  final String id;
  final String tanggal;
  final String? taskId;
  final String? taskExecutionId;
  final String? keeperId;
  final String status;
  final double tolerancePercent;
  final String? createdAt;
  final String? finalizedAt;
  final String? notes;
  final List<FeedingBatchIngredient> ingredients;

  const FeedingBatch({
    required this.id,
    required this.tanggal,
    this.taskId,
    this.taskExecutionId,
    this.keeperId,
    required this.status,
    required this.tolerancePercent,
    this.createdAt,
    this.finalizedAt,
    this.notes,
    required this.ingredients,
  });

  bool get isFinalized => status == 'FINALIZED';
  bool get isReadyToFinalize => status == 'READY_TO_FINALIZE';
  bool get isPreparing => status == 'PREPARING' || isReadyToFinalize;
  bool get hasScaleData => ingredients.any((item) => item.weighedAmount > 0 || item.deductedAmount > 0);

  factory FeedingBatch.fromJson(Map<String, dynamic> json) {
    return FeedingBatch(
      id: '${json['id'] ?? ''}',
      tanggal: '${json['tanggal'] ?? ''}',
      taskId: json['task_id']?.toString(),
      taskExecutionId: json['task_execution_id']?.toString(),
      keeperId: json['keeper_id']?.toString(),
      status: '${json['status'] ?? 'PREPARING'}',
      tolerancePercent: _asDouble(json['tolerance_percent']),
      createdAt: json['created_at']?.toString(),
      finalizedAt: json['finalized_at']?.toString(),
      notes: json['notes']?.toString(),
      ingredients: _asList(json['ingredients'])
          .whereType<Map>()
          .map((item) => FeedingBatchIngredient.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
    );
  }
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

double _asDouble(dynamic value) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? 0.0;
}

List<dynamic> _asList(dynamic value) {
  if (value is List) return value;
  return const [];
}
