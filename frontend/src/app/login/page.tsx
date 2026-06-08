'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuArrowLeft, LuLock, LuUser } from 'react-icons/lu';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoggedIn, userRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      if (userRole === 'PENGAWAS') {
        router.push('/dashboard');
      } else if (userRole === 'PENJAGA') {
        router.push('/penjaga');
      }
    }
  }, [isLoggedIn, userRole, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username dan kata sandi wajib diisi.');
      return;
    }

    try {
      await login(username.trim(), password.trim());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Username atau kata sandi salah.';
      setError(message);
    }
  };

  return (
    <div className="public-theme" style={{ minHeight: '100vh', backgroundColor: 'var(--pub-bg)' }}>
      <button
        type="button"
        className="pub-btn pub-btn-outline"
        onClick={() => router.push('/')}
        style={{ position: 'fixed', top: 24, right: 32, zIndex: 10 }}
      >
        <LuArrowLeft size={16} />
        Kembali
      </button>

      <section className="pub-login-container" style={{ minHeight: '100vh' }}>
        <div className="pub-login-left">
          <img src="/images/white_duck_login.png" alt="Entok Premium" />
          <div className="pub-login-overlay">
            <h3 className="pub-login-overlay-title">Kualitas Tanpa Kompromi</h3>
            <p className="pub-login-overlay-desc">
              Ekosistem peternakan modern untuk pengawas dan penjaga kandang Entok Premium.
            </p>
          </div>
        </div>

        <div className="pub-login-right">
          <div className="pub-login-form-wrapper">
            <h1 className="pub-login-title">Selamat Datang</h1>
            <p className="pub-login-desc">Masuk sebagai pengawas atau penjaga kandang.</p>

            {error && (
              <div style={{ padding: '12px', border: '1px solid #f5c6cb', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="pub-form-group" style={{ marginBottom: 0 }}>
                <label className="pub-form-label" style={{ fontSize: '10px', color: '#4a5568' }}>USERNAME</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: 'var(--pub-text-muted)', display: 'flex', alignItems: 'center' }}>
                    <LuUser size={16} />
                  </span>
                  <input
                    type="text"
                    className="pub-form-input"
                    style={{ paddingLeft: '38px', backgroundColor: '#ffffff', borderColor: '#cbd5e0' }}
                    placeholder="Username Anda..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
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
                    placeholder="Masukkan kata sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="pub-btn pub-btn-primary"
                style={{ padding: '12px', width: '100%', fontWeight: 'bold', marginTop: '10px' }}
                disabled={isLoading}
              >
                {isLoading ? 'MEMPROSES...' : 'MASUK'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
