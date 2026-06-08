# Entok Monitoring

Aplikasi monitoring peternakan entok dengan backend Flask, database MySQL, dan frontend Next.js.

## Struktur Project

- `backend/` - REST API Flask, model database, migrasi, dan service bisnis.
- `frontend/` - Dashboard web, portal penjaga, website publik, dan integrasi API.

## Setup Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Sesuaikan isi `backend/.env` dengan database lokal.

Jalankan migrasi:

```bash
flask db upgrade
```

Jalankan backend:

```bash
python main.py
```

## Setup Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Frontend berjalan di `http://localhost:3000`.

## Catatan IoT

Endpoint utama untuk data timbangan:

```http
POST /api/timbangan/readings
```

Endpoint khusus batch racikan dari Timbangan 2:

```http
POST /api/feeding-batches/scale-readings
```

File `.env`, hasil build, dependency, cache, dan upload runtime tidak ikut disimpan di GitHub.
