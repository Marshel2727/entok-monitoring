'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LuLayoutDashboard, 
  LuTrendingUp, 
  LuWheat, 
  LuHistory, 
  LuTestTube, 
  LuTerminal,
  LuClipboardList,
  LuBird,
  LuLogOut,
  LuChevronDown,
  LuChevronRight,
  LuStore,
  LuBookOpen,
  LuUsers
} from 'react-icons/lu';

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

interface MenuGroup {
  groupName: string;
  icon: React.ReactNode;
  items: MenuItem[];
}

type MenuEntry = 
  | { type: 'item'; data: MenuItem }
  | { type: 'group'; data: MenuGroup };

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState<{[key: string]: boolean}>({});

  const menuItems: MenuEntry[] = [
    {
      type: 'item',
      data: { name: 'DASHBOARD', icon: <LuLayoutDashboard size={16} />, path: '/dashboard' }
    },
    {
      type: 'item',
      data: { name: 'GRAFIK RANTAI PAKAN', icon: <LuTrendingUp size={16} />, path: '/dashboard/feed-charts' }
    },
    {
      type: 'item',
      data: { name: 'MANAJEMEN AKUN', icon: <LuUsers size={16} />, path: '/dashboard/akun-penjaga' }
    },
    {
      type: 'group',
      data: {
        groupName: 'OPERASIONAL PRODUKSI',
        icon: <LuWheat size={16} />,
        items: [
          { name: 'MANAJEMEN POPULASI TERNAK', icon: <LuBird size={14} />, path: '/dashboard/populasi' },
          { name: 'MANAJEMEN PAKAN', icon: <LuWheat size={14} />, path: '/dashboard/pakan' },
          { name: 'FORMULASI RANSUM', icon: <LuTestTube size={14} />, path: '/dashboard/formulasi' },
        ]
      }
    },
    {
      type: 'group',
      data: {
        groupName: 'PORTAL PENJAGA',
        icon: <LuClipboardList size={16} />,
        items: [
          { name: 'MANAJEMEN TUGAS HARIAN', icon: <LuClipboardList size={14} />, path: '/dashboard/tugas' },
          { name: 'PANDUAN PEMBERIAN PAKAN', icon: <LuBookOpen size={14} />, path: '/dashboard/acuan-pakan' },
        ]
      }
    },
    {
      type: 'group',
      data: {
        groupName: 'WEBSITE & KATALOG',
        icon: <LuStore size={16} />,
        items: [
          { name: 'KELOLA KATALOG', icon: <LuStore size={14} />, path: '/dashboard/katalog' }
        ]
      }
    },
    {
      type: 'item',
      data: { name: 'RIWAYAT AKTIVITAS', icon: <LuHistory size={16} />, path: '/dashboard/riwayat' }
    }
  ];

  // Auto-open groups on mount & pathname changes
  useEffect(() => {
    const newOpenGroups = { ...openGroups };
    let changed = false;
    menuItems.forEach(entry => {
      if (entry.type === 'group') {
        const group = entry.data;
        const hasActiveChild = group.items.some(item => pathname === item.path);
        if (hasActiveChild && !openGroups[group.groupName]) {
          newOpenGroups[group.groupName] = true;
          changed = true;
        }
      }
    });
    if (changed) {
      setOpenGroups(newOpenGroups);
    }
  }, [pathname]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LuTerminal size={20} style={{ color: 'var(--accent-light)' }} />
          <span>MONITORING SI ENTOK</span>
        </div>
        
        <Link 
          href="/dashboard/profil"
          className="profile-card"
          style={{ cursor: 'pointer', textDecoration: 'none', display: 'block' }}
          title="Klik untuk membuka Pengaturan Profil"
        >
          <div className="profile-welcome">Selamat datang,</div>
          <div className="profile-name">{user?.nama || 'Kepala Pengawas'}</div>
        </Link>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((entry) => {
          if (entry.type === 'item') {
            const item = entry.data;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          } else {
            const group = entry.data;
            const isOpen = !!openGroups[group.groupName];
            return (
              <div key={group.groupName} style={{ display: 'flex', flexDirection: 'column' }}>
                <div 
                  className="nav-group-header"
                  onClick={() => toggleGroup(group.groupName)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {group.icon}
                    <span>{group.groupName}</span>
                  </div>
                  {isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
                </div>

                {/* Group items */}
                <div 
                  style={{
                    display: isOpen ? 'flex' : 'none',
                    flexDirection: 'column',
                    gap: '2px',
                    paddingLeft: '12px',
                    marginTop: '2px'
                  }}
                >
                  {group.items.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        href={item.path}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        style={{
                          paddingLeft: '16px',
                          fontSize: '12.5px'
                        }}
                      >
                        <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center', opacity: 0.8 }}>{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }
        })}
      </nav>
      
      <div style={{ padding: '8px 16px 0 16px' }} className="no-print">
        <a
          href="#logout"
          className="nav-item"
          onClick={(e) => {
            e.preventDefault();
            if (window.confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
              logout();
            }
          }}
          style={{ 
            color: 'var(--danger)', 
            border: '1px dashed rgba(239, 68, 68, 0.2)', 
            justifyContent: 'center',
            backgroundColor: 'rgba(239, 68, 68, 0.03)',
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <span style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
            <LuLogOut size={16} />
          </span>
          <span>LOGOUT</span>
        </a>
      </div>
      
      <div style={{ marginTop: '8px', padding: '16px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        ENTOK-SYSTEM v1.0.0
      </div>
    </aside>
  );
}
