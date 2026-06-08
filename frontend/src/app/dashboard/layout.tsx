'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, userRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        router.push('/login');
      } else if (userRole !== 'PENGAWAS') {
        router.push('/penjaga');
      }
    }
  }, [isLoggedIn, userRole, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{
        fontFamily: 'var(--font-mono)',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        [ MEMUAT DATA SISTEM... ]
      </div>
    );
  }

  if (!isLoggedIn || userRole !== 'PENGAWAS') {
    return null; // Don't render while redirecting
  }

  return (
    <div className="app-layout" style={{ fontFamily: 'var(--font-mono)' }}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel Content */}
      <div className="main-content">
        <Header />
        
        <main className="content-wrapper">
          {children}
        </main>
      </div>
    </div>
  );
}
