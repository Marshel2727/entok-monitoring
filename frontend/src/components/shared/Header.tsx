'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { LuSun, LuMoon, LuCheck, LuGlobe } from 'react-icons/lu';

export default function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  // Helper to resolve title from path
  const getPageTitle = () => {
    if (pathname.includes('/dashboard/pakan')) return 'KELOLA PAKAN & KARTU STOK';
    if (pathname.includes('/dashboard/formulasi')) return 'MASTER FORMULASI & RANSUM';
    if (pathname.includes('/dashboard/populasi')) return 'KELOLA POPULASI BEBEK';
    if (pathname.includes('/dashboard/katalog')) return 'KATALOG PRODUK';
    if (pathname.includes('/dashboard/tugas')) return 'MASTER TUGAS SOP PENJAGA';
    if (pathname.includes('/dashboard/akun-penjaga')) return 'KELOLA AKUN PENJAGA';
    if (pathname.includes('/dashboard/riwayat')) return 'RIWAYAT AKTIVITAS';
    if (pathname.includes('/dashboard/notifikasi')) return 'NOTIFIKASI ALARM';
    if (pathname.includes('/dashboard/profil')) return 'PROFIL PENGAWAS';
    return 'DASHBOARD SUPPLY CHAIN ENTOK'.toUpperCase();
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="page-main-title">{getPageTitle()}</h2>
        <div className="system-status">
          <span className="status-indicator"></span>
          <span>SISTEM OPERASIONAL: AKTIF</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-actions" aria-label="Akses cepat">
          <Link href="/penjaga" className="topbar-action-link" title="Buka Checklist Penjaga">
            <LuCheck size={15} />
            <span>PORTAL PENJAGA</span>
          </Link>
          <Link href="/website-publik" className="topbar-action-link" title="Buka Website Publik">
            <LuGlobe size={15} />
            <span>KATALOG PRODUK</span>
          </Link>
        </div>

        <button 
          onClick={toggleTheme}
          className="icon-button"
          title="Ganti Tema"
          style={{ cursor: 'pointer' }}
        >
          {theme === 'dark' ? <LuSun size={18} /> : <LuMoon size={18} />}
        </button>

        <div className="user-avatar" title="Avatar">
          🦆
        </div>
      </div>
    </header>
  );
}
