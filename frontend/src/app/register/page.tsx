'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuArrowLeft, LuLock, LuMail, LuUser, LuUserPlus } from 'react-icons/lu';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth';

type ShiftOption = 'PAGI' | 'SORE' | 'FULL_TIME';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [shift, setShift] = useState<ShiftOption>('PAGI');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoggedIn, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.push(userRole === 'PENGAWAS' ? '/dashboard' : '/penjaga');
    }
  }, [isLoggedIn, userRole, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !username.trim() || !password || !confirmPassword) {
      setError('Nama, username, kata sandi, dan konfirmasi wajib diisi.');
      return;
    }

    if (password.length < 3) {
      setError('Kata sandi minimal 3 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi belum sama.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.registerPublicKeeper({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password,
        email: email.trim() || undefined,
        shift,
      });

      setSuccess(res.message || 'Akun penjaga berhasil dibuat. Silakan masuk.');
      setTimeout(() => router.push('/login'), 900);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membuat akun.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="public-theme" style={{ minHeight: '100vh', backgroundColor: 'var(--pub-bg)' }}>
      <button
        type="button"
        className="pub-btn pub-btn-outline"
        onClick={() => router.push('/login')}
        style={{ position: 'fixed', top: 24, right: 32, zIndex: 10 }}
      >
        <LuArrowLeft size={16} />
        Masuk
      </button>

      <section className="pub-login-container" style={{ minHeight: '100vh' }}>
        <div className="pub-login-left">
          <img src="/images/white_duck_login.png" alt="Entok Premium" />
          <div className="pub-login-overlay">
            <h3 className="pub-login-overlay-title">Akses Penjaga Kandang</h3>
            <p className="pub-login-overlay-desc">
              Daftar sebagai penjaga untuk mengakses checklist harian dan panduan operasional kandang.
            </p>
          </div>
        </div>

        <div className="pub-login-right">
          <div className="pub-login-form-wrapper">
            <h1 className="pub-login-title">Buat Akun Penjaga</h1>
            <p className="pub-login-desc">Akun baru otomatis aktif sebagai penjaga kandang.</p>

            {error && (
              <div style={{ padding: '12px', border: '1px solid #f5c6cb', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '12px', border: '1px solid #b7ebc6', backgroundColor: '#e8f8ed', color: '#14532d', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', fontWeight: 600 }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="pub-form-group" style={{ marginBottom: 0 }}>
                <label className="pub-form-label" style={{ fontSize: '10px', color: '#4a5568' }}>NAMA LENGKAP</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--pub-text-muted)', display: 'flex', alignItems: 'center' }}>
                    <LuUser size={16} />
                  </span>
                  <input
                    type="text"
                    className="pub-form-input"
                    style={{ paddingLeft: '38px', backgroundColor: '#ffffff', borderColor: '#cbd5e0' }}
                    placeholder="Nama penjaga..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="pub-form-group" style={{ marginBottom: 0 }}>
                <label className="pub-form-label" style={{ fontSize: '10px', color: '#4a5568' }}>USERNAME</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--pub-text-muted)', display: 'flex', alignItems: 'center' }}>
                    <LuUserPlus size={16} />
                  </span>
                  <input
                    type="text"
                    className="pub-form-input"
                    style={{ paddingLeft: '38px', backgroundColor: '#ffffff', borderColor: '#cbd5e0' }}
                    placeholder="Username login..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="pub-form-group" style={{ marginBottom: 0 }}>
                <label className="pub-form-label" style={{ fontSize: '10px', color: '#4a5568' }}>EMAIL OPSIONAL</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--pub-text-muted)', display: 'flex', alignItems: 'center' }}>
                    <LuMail size={16} />
                  </span>
                  <input
                    type="email"
                    className="pub-form-input"
                    style={{ paddingLeft: '38px', backgroundColor: '#ffffff', borderColor: '#cbd5e0' }}
                    placeholder="email@contoh.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="pub-form-group" style={{ marginBottom: 0 }}>
                <label className="pub-form-label" style={{ fontSize: '10px', color: '#4a5568' }}>SHIFT KERJA</label>
                <select
                  className="pub-form-input"
                  style={{ backgroundColor: '#ffffff', borderColor: '#cbd5e0' }}
                  value={shift}
                  onChange={(e) => setShift(e.target.value as ShiftOption)}
                  disabled={isSubmitting}
                >
                  <option value="PAGI">Pagi</option>
                  <option value="SORE">Sore</option>
                  <option value="FULL_TIME">Full Time</option>
                </select>
              </div>

              <div className="pub-form-group" style={{ marginBottom: 0 }}>
                <label className="pub-form-label" style={{ fontSize: '10px', color: '#4a5568' }}>KATA SANDI</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--pub-text-muted)', display: 'flex', alignItems: 'center' }}>
                    <LuLock size={16} />
                  </span>
                  <input
                    type="password"
                    className="pub-form-input"
                    style={{ paddingLeft: '38px', backgroundColor: '#ffffff', borderColor: '#cbd5e0' }}
                    placeholder="Buat kata sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="pub-form-group" style={{ marginBottom: 0 }}>
                <label className="pub-form-label" style={{ fontSize: '10px', color: '#4a5568' }}>KONFIRMASI KATA SANDI</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--pub-text-muted)', display: 'flex', alignItems: 'center' }}>
                    <LuLock size={16} />
                  </span>
                  <input
                    type="password"
                    className="pub-form-input"
                    style={{ paddingLeft: '38px', backgroundColor: '#ffffff', borderColor: '#cbd5e0' }}
                    placeholder="Ulangi kata sandi..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="pub-btn pub-btn-primary"
                style={{ padding: '12px', width: '100%', fontWeight: 'bold', marginTop: '8px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'MEMBUAT AKUN...' : 'DAFTAR'}
              </button>
            </form>

            <p className="pub-login-footer-text">
              Sudah punya akun?{' '}
              <button
                type="button"
                className="pub-login-footer-link"
                onClick={() => router.push('/login')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Masuk Di Sini
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
