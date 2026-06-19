from marshmallow import EXCLUDE, Schema, ValidationError, fields, validate, validates_schema


class BaseSchema(Schema):
    class Meta:
        unknown = EXCLUDE


def validation_error_response(errors):
    return {
        'status': 'error',
        'message': 'Validasi data gagal',
        'errors': errors,
    }, 400


def load_or_error(schema, data):
    try:
        return schema.load(data or {}), None
    except ValidationError as exc:
        return None, validation_error_response(exc.messages)


def UUIDString(**kwargs):
    return fields.Str(validate=validate.Length(min=1, max=50), **kwargs)


class LoginSchema(BaseSchema):
    username = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=50),
        error_messages={'required': 'Username wajib diisi.'},
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=255),
        error_messages={'required': 'Password wajib diisi.'},
    )


class UserSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={'required': 'Nama wajib diisi.'},
    )
    email = fields.Email(allow_none=True)
    username = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=50),
        error_messages={'required': 'Username wajib diisi.'},
    )
    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=3, max=255),
        error_messages={'required': 'Password wajib diisi.'},
    )
    role = fields.Str(load_default='PENJAGA', validate=validate.OneOf(['PENGAWAS', 'PENJAGA']))
    shift = fields.Str(allow_none=True, validate=validate.OneOf(['PAGI', 'SORE', 'FULL_TIME', None]))
    status = fields.Str(load_default='AKTIF', validate=validate.OneOf(['AKTIF', 'NONAKTIF']))
    joined_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class UserUpdateSchema(UserSchema):
    name = fields.Str(validate=validate.Length(min=2, max=100))
    username = fields.Str(validate=validate.Length(min=3, max=50))
    password = fields.Str(load_only=True, allow_none=True, validate=validate.Length(min=0, max=255))
    role = fields.Str(validate=validate.OneOf(['PENGAWAS', 'PENJAGA']))


class PublicRegisterSchema(BaseSchema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={'required': 'Nama wajib diisi.'},
    )
    username = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=50),
        error_messages={'required': 'Username wajib diisi.'},
    )
    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=3, max=255),
        error_messages={'required': 'Password wajib diisi.'},
    )
    email = fields.Email(allow_none=True)
    shift = fields.Str(load_default='PAGI', validate=validate.OneOf(['PAGI', 'SORE', 'FULL_TIME']))


class CatalogSchema(BaseSchema):
    id = UUIDString(allow_none=True)
    nama = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    deskripsi = fields.Str(required=True, validate=validate.Length(min=3, max=1000))
    harga = fields.Int(required=True, validate=validate.Range(min=1))
    stok = fields.Int(required=True, validate=validate.Range(min=0))
    satuan = fields.Str(load_default='Ekor', validate=validate.Length(min=1, max=20))
    tag = fields.Str(load_default='NEW', validate=validate.OneOf(['TANGGUH', 'READY', 'LIMITED', 'NEW']))
    img = fields.Str(allow_none=True, load_default='')


class FeedNutritionSchema(BaseSchema):
    protein = fields.Float(load_default=0.0, validate=validate.Range(min=0, max=100))
    karbohidrat = fields.Float(load_default=0.0, validate=validate.Range(min=0, max=100))
    lemak = fields.Float(load_default=0.0, validate=validate.Range(min=0, max=100))
    serat = fields.Float(load_default=0.0, validate=validate.Range(min=0, max=100))
    mineral = fields.Float(load_default=0.0, validate=validate.Range(min=0, max=100))


class FeedSchema(BaseSchema):
    id = UUIDString(allow_none=True)
    nama = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    kategori = fields.Str(required=True, validate=validate.Length(min=2, max=50))
    stok = fields.Float(load_default=0.0, validate=validate.Range(min=0))
    ambangBatas = fields.Float(load_default=5.0, validate=validate.Range(min=0))
    nutrisi = fields.Nested(FeedNutritionSchema, load_default=dict)


class FeedTransactionSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    feed_id = UUIDString(required=True)
    type = fields.Str(required=True, validate=validate.OneOf(['IN', 'OUT']))
    amount = fields.Float(required=True, validate=validate.Range(min=0.01))
    description = fields.Str(allow_none=True, validate=validate.Length(max=500))
    user_id = UUIDString(allow_none=True)
    created_at = fields.DateTime(dump_only=True)


class FeedRestockSchema(BaseSchema):
    amount = fields.Float(required=True, validate=validate.Range(min=0.01), error_messages={'required': 'Jumlah restock wajib diisi.'})
    description = fields.Str(load_default='', validate=validate.Length(max=500))


class GrowthPhaseSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    phase_key = fields.Str(required=True, validate=validate.Length(min=2, max=50))
    min_age_days = fields.Int(allow_none=True, validate=validate.Range(min=0))
    max_age_days = fields.Int(allow_none=True, validate=validate.Range(min=0))
    sort_order = fields.Int(load_default=0, validate=validate.Range(min=0))


class FormulationSchema(BaseSchema):
    id = UUIDString(allow_none=True)
    phase_id = UUIDString(allow_none=True)
    fase = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    targetKonsumsi = fields.Float(required=True, validate=validate.Range(min=0.01))
    kategori = fields.Str(required=True, validate=validate.Length(min=2, max=50))
    komposisi = fields.Dict(
        keys=fields.Str(validate=validate.Length(min=1, max=100)),
        values=fields.Float(validate=validate.Range(min=0.01, max=100)),
        required=True,
    )
    pakanAlternatif = fields.List(fields.Str(validate=validate.Length(min=1, max=100)), load_default=list)

    @validates_schema
    def validate_composition_total(self, data, **kwargs):
        composition = data.get('komposisi') or {}
        if not composition:
            raise ValidationError({'komposisi': ['Komposisi pakan minimal berisi satu bahan.']})
        total = sum(float(value) for value in composition.values())
        if abs(total - 100.0) > 0.01:
            raise ValidationError({'komposisi': [f'Total komposisi harus 100%, saat ini {total:.2f}%.']})


class PopulationSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    phase_id = UUIDString(allow_none=True)
    fase = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    nilaiBaru = fields.Int(required=True, validate=validate.Range(min=0))


class PopulationLogSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    phase_id = UUIDString(allow_none=True)
    phase = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    old_value = fields.Int(required=True, validate=validate.Range(min=0))
    new_value = fields.Int(required=True, validate=validate.Range(min=0))
    difference = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    logged_at = fields.DateTime(dump_only=True)


class TaskStepSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    no = fields.Int(required=True, validate=validate.Range(min=1))
    text = fields.Str(required=True, validate=validate.Length(min=2, max=1000))
    thumbnailImg = fields.Str(allow_none=True, load_default='')


class TaskSchema(BaseSchema):
    id = UUIDString(allow_none=True)
    nama = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    waktu = fields.Str(required=True, validate=validate.Length(min=4, max=20))
    deskripsi = fields.Str(required=True, validate=validate.Length(min=3, max=1000))
    img = fields.Str(allow_none=True, load_default='')
    infoDetail = fields.Str(allow_none=True, load_default='', validate=validate.Length(max=1000))
    perhatikan = fields.Str(allow_none=True, load_default='', validate=validate.Length(max=1000))
    catatan = fields.Str(allow_none=True, load_default='', validate=validate.Length(max=1000))
    langkah = fields.List(fields.Nested(TaskStepSchema), load_default=list)


class TaskExecutionSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    task_id = UUIDString(required=True)
    keeper_id = UUIDString(required=True)
    execution_date = fields.Date(required=True)
    is_completed = fields.Bool(load_default=False)
    completed_at = fields.DateTime(allow_none=True)


class ChecklistToggleSchema(BaseSchema):
    task_id = UUIDString(required=True, error_messages={'required': 'task_id wajib diisi.'})
    date = fields.Str(required=True, validate=validate.Regexp(r'^\d{4}-\d{2}-\d{2}$', error='Format tanggal harus YYYY-MM-DD.'))
    is_completed = fields.Bool(required=True, error_messages={'required': 'is_completed wajib diisi.'})


class DateOnlySchema(BaseSchema):
    date = fields.Str(required=True, validate=validate.Regexp(r'^\d{4}-\d{2}-\d{2}$', error='Format tanggal harus YYYY-MM-DD.'))


class TimbanganSchema(BaseSchema):
    id = fields.Int(allow_none=True, validate=validate.Range(min=1))
    nama = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    deskripsi = fields.Str(allow_none=True, load_default='', validate=validate.Length(max=1000))
    tipe = fields.Str(load_default='DEDICATED', validate=validate.OneOf(['DEDICATED', 'MULTI']))
    status = fields.Str(dump_only=True, validate=validate.OneOf(['ONLINE', 'OFFLINE']))
    default_label = fields.Str(allow_none=True, load_default=None, validate=validate.Length(max=100))


class TimbanganStatusSchema(BaseSchema):
    status = fields.Str(required=True, validate=validate.OneOf(['ONLINE', 'OFFLINE']))


class TimbanganReadingSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    timbangan_id = fields.Int(required=True, validate=validate.Range(min=1), error_messages={'required': 'timbangan_id wajib diisi.'})
    value = fields.Float(required=True, validate=validate.Range(min=0), error_messages={'required': 'value wajib diisi.'})
    unit = fields.Str(load_default='kg', validate=validate.Length(min=1, max=20))
    label = fields.Str(load_default='', validate=validate.Length(max=100))
    feed_id = UUIDString(allow_none=True)
    recorded_at = fields.DateTime(dump_only=True)


class FeedingBatchSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    date = fields.Str(load_default=None, allow_none=True, validate=validate.Regexp(r'^\d{4}-\d{2}-\d{2}$', error='Format tanggal harus YYYY-MM-DD.'))
    task_id = UUIDString(allow_none=True)
    task_execution_id = UUIDString(allow_none=True)
    keeper_id = UUIDString(dump_only=True)
    status = fields.Str(dump_only=True, validate=validate.OneOf(['PREPARING', 'FINALIZED', 'CANCELLED']))
    tolerance_percent = fields.Float(load_default=10.0, validate=validate.Range(min=0, max=100))
    notes = fields.Str(allow_none=True, validate=validate.Length(max=1000))


class FeedingBatchIngredientSchema(BaseSchema):
    id = fields.Int(dump_only=True)
    batch_id = UUIDString(required=True)
    feed_id = UUIDString(allow_none=True)
    phase_id = UUIDString(allow_none=True)
    feed_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    phase = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    population_count = fields.Int(load_default=0, validate=validate.Range(min=0))
    target_consumption = fields.Float(load_default=0.0, validate=validate.Range(min=0))
    planned_amount = fields.Float(load_default=0.0, validate=validate.Range(min=0))
    weighed_amount = fields.Float(load_default=0.0, validate=validate.Range(min=0))
    deducted_amount = fields.Float(load_default=0.0, validate=validate.Range(min=0))
    variance_amount = fields.Float(load_default=0.0)
    unit = fields.Str(load_default='kg', validate=validate.Length(min=1, max=20))


class FeedingBatchScaleReadingSchema(BaseSchema):
    timbangan_id = fields.Int(load_default=2, validate=validate.Range(min=1))
    label = fields.Str(validate=validate.Length(min=1, max=100))
    feed_name = fields.Str(validate=validate.Length(min=1, max=100))
    phase = fields.Str(validate=validate.Length(min=1, max=100))
    fase = fields.Str(validate=validate.Length(min=1, max=100))
    phase_id = UUIDString(allow_none=True)
    fase_id = UUIDString(allow_none=True)
    value = fields.Float(validate=validate.Range(min=0))
    amount = fields.Float(validate=validate.Range(min=0))
    unit = fields.Str(load_default='kg', validate=validate.Length(min=1, max=20))
    mode = fields.Str(load_default='SET', validate=validate.OneOf(['SET', 'ADD']))
    date = fields.Str(allow_none=True, validate=validate.Regexp(r'^\d{4}-\d{2}-\d{2}$', error='Format tanggal harus YYYY-MM-DD.'))

    @validates_schema
    def validate_aliases(self, data, **kwargs):
        if not data.get('label') and not data.get('feed_name'):
            raise ValidationError({'label': ['label atau feed_name wajib diisi.']})
        if not data.get('phase') and not data.get('fase') and not data.get('phase_id') and not data.get('fase_id'):
            raise ValidationError({'fase': ['phase/fase atau phase_id wajib diisi.']})
        if data.get('value') is None and data.get('amount') is None:
            raise ValidationError({'value': ['value atau amount wajib diisi.']})


class FeedingBatchScaleReadingBulkItemSchema(BaseSchema):
    timbangan_id = fields.Int(validate=validate.Range(min=1))
    label = fields.Str(validate=validate.Length(min=1, max=100))
    feed_name = fields.Str(validate=validate.Length(min=1, max=100))
    phase = fields.Str(validate=validate.Length(min=1, max=100))
    fase = fields.Str(validate=validate.Length(min=1, max=100))
    phase_id = UUIDString(allow_none=True)
    fase_id = UUIDString(allow_none=True)
    value = fields.Float(validate=validate.Range(min=0))
    amount = fields.Float(validate=validate.Range(min=0))
    unit = fields.Str(validate=validate.Length(min=1, max=20))
    mode = fields.Str(validate=validate.OneOf(['SET', 'ADD']))
    date = fields.Str(allow_none=True, validate=validate.Regexp(r'^\d{4}-\d{2}-\d{2}$', error='Format tanggal harus YYYY-MM-DD.'))
    kode = fields.Int(validate=validate.Range(min=0))

    @validates_schema
    def validate_aliases(self, data, **kwargs):
        if not data.get('label') and not data.get('feed_name'):
            raise ValidationError({'label': ['label atau feed_name wajib diisi.']})
        if not data.get('phase') and not data.get('fase') and not data.get('phase_id') and not data.get('fase_id'):
            raise ValidationError({'fase': ['phase/fase atau phase_id wajib diisi.']})
        if data.get('value') is None and data.get('amount') is None:
            raise ValidationError({'value': ['value atau amount wajib diisi.']})


class FeedingBatchScaleReadingBulkSchema(BaseSchema):
    timbangan_id = fields.Int(load_default=2, validate=validate.Range(min=1))
    date = fields.Str(allow_none=True, validate=validate.Regexp(r'^\d{4}-\d{2}-\d{2}$', error='Format tanggal harus YYYY-MM-DD.'))
    unit = fields.Str(load_default='kg', validate=validate.Length(min=1, max=20))
    mode = fields.Str(load_default='SET', validate=validate.OneOf(['SET', 'ADD']))
    items = fields.List(
        fields.Nested(FeedingBatchScaleReadingBulkItemSchema),
        required=True,
        validate=validate.Length(min=1),
        error_messages={'required': 'items wajib diisi.'},
    )


class FeedingBatchWeightSchema(BaseSchema):
    ingredient_id = fields.Int(required=True, validate=validate.Range(min=1))
    amount = fields.Float(required=True, validate=validate.Range(min=0))
    timbangan_id = fields.Int(load_default=2, validate=validate.Range(min=1))


class ActivityLogSchema(BaseSchema):
    id = UUIDString(dump_only=True)
    type = fields.Str(required=True, validate=validate.OneOf(['RESTOCK', 'FORMULASI', 'INVENTARIS', 'SISTEM']))
    description = fields.Str(required=True, validate=validate.Length(min=1, max=1000))
    user_id = UUIDString(allow_none=True)
    logged_at = fields.DateTime(dump_only=True)
