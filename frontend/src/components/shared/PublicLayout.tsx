"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LuPhone, 
  LuMail, 
  LuMapPin, 
  LuArrowRight, 
  LuCheck, 
  LuDownload, 
  LuMessageSquare,
  LuSun,
  LuMoon
} from 'react-icons/lu';
import { FeedItem, FormulasiItem, KatalogItem } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { resolveAssetUrl } from '@/services/api';

interface PublicLayoutProps {
  feedList: FeedItem[];
  formulasiList: FormulasiItem[];
  katalogList: KatalogItem[];
  tasksList?: any[];
  isPreview?: boolean;
  onBackToDashboard?: () => void;
  jumlahStarter?: number;
  jumlahGrower1?: number;
  jumlahGrower2?: number;
  jumlahFinisher?: number;
}

export default function PublicLayout({ 
  feedList, 
  formulasiList,
  katalogList,
  tasksList = [],
  isPreview = false,
  onBackToDashboard,
  jumlahStarter = 15,
  jumlahGrower1 = 25,
  jumlahGrower2 = 18,
  jumlahFinisher = 10
}: PublicLayoutProps) {
  const [activeSection, setActiveSection] = useState<'home' | 'katalog' | 'tentang' | 'kontak'>('home');
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  // Contact Form State
  const [contactForm, setContactForm] = useState({
    nama: '',
    email: '',
    subjek: 'Pemesanan Bibit',
    pesan: ''
  });
  const [isContactSubmitted, setIsContactSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsContactSubmitted(true);
    setTimeout(() => {
      setIsContactSubmitted(false);
      setContactForm({
        nama: '',
        email: '',
        subjek: 'Pemesanan Bibit',
        pesan: ''
      });
    }, 4000);
  };

  const handleWhatsAppChat = (productName: string) => {
    const text = encodeURIComponent(`Halo Entok Premium, saya tertarik untuk memesan atau berkonsultasi mengenai: ${productName}.`);
    window.open(`https://wa.me/6285281518983?text=${text}`, '_blank');
  };

  const handleContactWhatsApp = () => {
    const text = encodeURIComponent("Halo Entok Premium, saya ingin berkonsultasi mengenai kerjasama peternakan entok.");
    window.open(`https://wa.me/6285281518983?text=${text}`, '_blank');
  };

  return (
    <div className="public-theme">
      {isPreview && onBackToDashboard && (
        <div style={{
          backgroundColor: '#1e3f20',
          color: '#ffffff',
          padding: '8px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }} className="no-print">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            👁️ PRATINJAU WEBSITE PUBLIK (MODE PENGAWAS)
          </span>
          <button
            onClick={onBackToDashboard}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          >
            ← Kembali ke Dashboard
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <header className="public-navbar">
        <a href="#" className="public-logo" onClick={(e) => { e.preventDefault(); setActiveSection('home'); }}>
          Entok Premium
        </a>
        
        <nav className="public-nav-links">
          <span 
            className={`public-nav-link ${activeSection === 'home' ? 'active' : ''}`}
            onClick={() => setActiveSection('home')}
          >
            Home
          </span>
          <span 
            className={`public-nav-link ${activeSection === 'katalog' ? 'active' : ''}`}
            onClick={() => setActiveSection('katalog')}
          >
            Katalog
          </span>
          <span 
            className={`public-nav-link ${activeSection === 'tentang' ? 'active' : ''}`}
            onClick={() => setActiveSection('tentang')}
          >
            Tentang Kami
          </span>
          <span 
            className={`public-nav-link ${activeSection === 'kontak' ? 'active' : ''}`}
            onClick={() => setActiveSection('kontak')}
          >
            Kontak
          </span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="pub-btn"
            title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'} 
            onClick={toggleTheme}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {theme === 'light' ? <LuMoon size={16} /> : <LuSun size={16} />}
          </button>

          {!isPreview && (
            <button className="pub-btn pub-btn-primary" onClick={() => router.push('/login')}>
              Masuk
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="public-content">
        
        {/* SECTION 1: HOME */}
        {activeSection === 'home' && (
          <section className="pub-section">
            <div className="pub-hero-grid">
              <div className="pub-hero-left">
                <span className="pub-pill-badge">EST. 2026</span>
                <h1 className="pub-hero-title">
                  Entok Premium:
                  <span>Kualitas Ternak Unggul</span>
                </h1>
                <p className="pub-hero-desc">
                  Dedikasi kami untuk menghadirkan bibit dan entok dewasa kualitas ekspor melalui manajemen peternakan modern yang higienis dan berkelanjutan. Kami menerapkan standar pakan bernutrisi tinggi dan pemantauan IoT berkala untuk menghasilkan keturunan entok dengan daya tahan prima dan pertumbuhan optimal.
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                  <button className="pub-btn pub-btn-primary" style={{ padding: '12px 28px' }} onClick={() => setActiveSection('katalog')}>
                    Lihat Katalog <LuArrowRight size={16} style={{ marginLeft: '8px' }} />
                  </button>
                  <button className="pub-btn pub-btn-outline" style={{ padding: '12px 28px' }} onClick={() => setActiveSection('tentang')}>
                    Pelajari Kami
                  </button>
                </div>
              </div>
              <div className="pub-hero-image-container">
                <img src="/images/muscovy_duck_home.png" alt="Entok Premium Hero" />
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: KATALOG */}
        {activeSection === 'katalog' && (
          <section className="pub-section">
            <div className="pub-section-header">
              <h1 className="pub-section-title">Koleksi Unggulan</h1>
              <p className="pub-section-desc">
                Pilih keturunan entok terbaik untuk peternakan Anda. Kami menghadirkan seleksi bibit dan indukan berkualitas tinggi dengan standar perawatan premium yang menjamin kesehatan prima.
              </p>
            </div>

            {/* Product Cards Grid */}
            <div className="pub-cards-grid">
              {katalogList.map((item) => (
                <div key={item.id} className="pub-card">
                  <div className="pub-card-image-wrapper">
                    <img src={resolveAssetUrl(item.img, '/images/entok_jumbo_dewasa.png')} alt={item.nama} />
                    <span className={`pub-card-tag ${item.tag.toLowerCase()}`}>{item.tag}</span>
                  </div>
                  <div className="pub-card-body">
                    <h3 className="pub-card-title">{item.nama}</h3>
                    <p className="pub-card-desc">{item.deskripsi}</p>
                    <div>
                      <span className={`pub-card-stock ${item.stok > 5 ? 'enough' : 'warning'}`}>
                        Stok: {item.stok} {item.satuan}
                      </span>
                    </div>
                    <div className="pub-card-pricing-row">
                      <span className="pub-card-price-label">
                        {item.satuan === 'Box' ? 'Harga Per Box' : 'Harga Satuan'}
                      </span>
                      <span className="pub-card-price-value">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.harga)}
                      </span>
                    </div>
                    <button className="pub-btn pub-btn-primary" style={{ width: '100%', gap: '8px' }} onClick={() => handleWhatsAppChat(item.nama)}>
                      <LuMessageSquare size={16} /> Pesan via WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Specifications Comparison Table */}
            <div style={{ marginTop: '60px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--pub-primary)' }}>
                  Perbandingan Spesifikasi
                </h2>
                <button className="pub-btn pub-btn-white" style={{ fontSize: '12px', padding: '6px 14px', gap: '6px' }} onClick={() => alert("Brosur PDF berhasil diunduh (Simulasi)")}>
                  <LuDownload size={14} /> Unduh Brosur PDF
                </button>
              </div>

              <div className="pub-table-container">
                <table className="pub-table">
                  <thead>
                    <tr>
                      <th>Kategori</th>
                      <th>Bobot Rata-rata</th>
                      <th>Usia Produktif</th>
                      <th>Pakan Utama</th>
                      <th>Tujuan Ternak</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', color: 'var(--pub-primary)' }}>Jumbo Dewasa</td>
                      <td>4.5 - 6.0 kg</td>
                      <td>6 - 24 bulan</td>
                      <td>Sentrat &amp; Jagung</td>
                      <td>Indukan / Daging</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', color: 'var(--pub-primary)' }}>Bibit DOD</td>
                      <td>40 - 55 gram</td>
                      <td>N/A (Pembesaran)</td>
                      <td>Starter Crumble</td>
                      <td>Pembesaran Massal</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold', color: 'var(--pub-primary)' }}>Rambon</td>
                      <td>3.5 - 5.0 kg</td>
                      <td>7 - 30 bulan</td>
                      <td>Campuran Alami</td>
                      <td>Koleksi / Daging Premium</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Call to action Banner */}
            <div className="pub-banner">
              <div className="pub-banner-left">
                <h3 className="pub-banner-title">Butuh Konsultasi Keturunan?</h3>
                <p className="pub-banner-desc">
                  Tim ahli peternakan kami siap membantu Anda memilih paket ternak yang paling sesuai dengan kapasitas lahan dan target operasional Anda.
                </p>
              </div>
              <button className="pub-btn pub-btn-white" style={{ padding: '10px 24px' }} onClick={() => setActiveSection('kontak')}>
                Hubungi Ahli Kami
              </button>
            </div>
          </section>
        )}

        {/* SECTION 3: TENTANG KAMI */}
        {activeSection === 'tentang' && (
          <section className="pub-section">
            <div className="pub-about-section">
              <h1 className="pub-about-title">Standar Baru dalam Peternakan Modern</h1>
              <p className="pub-about-desc">
                Menghadirkan solusi peternakan modern dengan pemantauan kesehatan, manajemen pakan, dan data ternak yang terintegrasi untuk meningkatkan produktivitas secara efisien. Kami percaya kualitas unggulan dimulai dari nutrisi pakan berkualitas tinggi yang higienis.
              </p>

              {/* Ingredients Card Grid */}
              <div className="pub-cards-grid">
                
                {/* Ingredient Card 1 */}
                <div className="pub-card" style={{ color: 'var(--pub-text)' }}>
                  <div className="pub-card-image-wrapper" style={{ height: '180px' }}>
                    <img src="/images/azolla_microphylla.png" alt="Azolla Microphylla Segar" />
                  </div>
                  <div className="pub-card-body" style={{ gap: '10px', padding: '20px' }}>
                    <h3 className="pub-card-title" style={{ fontSize: '16px' }}>Azolla Microphylla Segar</h3>
                    <p className="pub-card-desc" style={{ fontSize: '12px' }}>
                      Azolla adalah tanaman paku air bernutrisi tinggi yang dapat digunakan sebagai pakan alternatif entok. Kandungan protein yang tinggi membantu mendukung pertumbuhan, kesehatan, dan produktivitas ternak secara alami.
                    </p>
                  </div>
                </div>

                {/* Ingredient Card 2 */}
                <div className="pub-card" style={{ color: 'var(--pub-text)' }}>
                  <div className="pub-card-image-wrapper" style={{ height: '180px' }}>
                    <img src="/images/larva_bsf.png" alt="Larva BSF Kering" />
                  </div>
                  <div className="pub-card-body" style={{ gap: '10px', padding: '20px' }}>
                    <h3 className="pub-card-title" style={{ fontSize: '16px' }}>Larva BSF Kering</h3>
                    <p className="pub-card-desc" style={{ fontSize: '12px' }}>
                      Larva BSF Kering merupakan pakan alami kaya protein yang membantu meningkatkan pertumbuhan, kesehatan, dan produktivitas entok secara optimal. Mengandung lemak baik dan asam amino esensial.
                    </p>
                  </div>
                </div>

                {/* Ingredient Card 3 */}
                <div className="pub-card" style={{ color: 'var(--pub-text)' }}>
                  <div className="pub-card-image-wrapper" style={{ height: '180px' }}>
                    <img src="/images/jagung_giling.png" alt="Jagung Giling" />
                  </div>
                  <div className="pub-card-body" style={{ gap: '10px', padding: '20px' }}>
                    <h3 className="pub-card-title" style={{ fontSize: '16px' }}>Jagung Giling</h3>
                    <p className="pub-card-desc" style={{ fontSize: '12px' }}>
                      Sumber karbohidrat utama yang membantu memenuhi kebutuhan energi harian serta mendukung pertumbuhan dan penggemukan entok. Jagung digiling secara higienis agar mudah dicerna bebek di semua umur.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: KONTAK */}
        {activeSection === 'kontak' && (
          <section className="pub-section">
            <div className="pub-contact-grid">
              
              {/* Left Column Info */}
              <div className="pub-contact-left">
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--pub-primary)', lineHeight: '1.2' }}>
                    Mulai Kerjasama Anda
                  </h1>
                  <p style={{ fontSize: '14px', color: 'var(--pub-text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                    Konsultasikan kebutuhan peternakan Anda dengan tim ahli kami. Kami siap membantu dari pemilihan bibit hingga manajemen pakan.
                  </p>
                </div>

                <div className="pub-contact-info-list">
                  
                  {/* Phone Item */}
                  <div className="pub-contact-info-item">
                    <div className="pub-contact-icon-wrapper">
                      <LuPhone size={18} />
                    </div>
                    <div>
                      <div className="pub-contact-info-label">Telepon / WhatsApp</div>
                      <div className="pub-contact-info-value">+62 852 8151 8983</div>
                    </div>
                  </div>

                  {/* Email Item */}
                  <div className="pub-contact-info-item">
                    <div className="pub-contact-icon-wrapper">
                      <LuMail size={18} />
                    </div>
                    <div>
                      <div className="pub-contact-info-label">Email Bisnis</div>
                      <div className="pub-contact-info-value">halo@entokpremium.com</div>
                    </div>
                  </div>

                  {/* Location Item */}
                  <div className="pub-contact-info-item">
                    <div className="pub-contact-icon-wrapper">
                      <LuMapPin size={18} />
                    </div>
                    <div>
                      <div className="pub-contact-info-label">Lokasi Peternakan</div>
                      <div className="pub-contact-info-value">Jl. AP Pettarani, Makassar, Indonesia</div>
                    </div>
                  </div>

                </div>

                <div>
                  <button className="pub-btn pub-btn-secondary" style={{ gap: '8px', padding: '12px 24px' }} onClick={handleContactWhatsApp}>
                    <LuMessageSquare size={16} /> Hubungi via WhatsApp
                  </button>
                </div>
              </div>

              {/* Right Column Form Card */}
              <div className="pub-contact-form-card">
                {isContactSubmitted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', textAlign: 'center', gap: '16px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#dbfbe3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pub-primary)' }}>
                      <LuCheck size={30} style={{ strokeWidth: 3 }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--pub-primary)' }}>Pesan Berhasil Terkirim!</h3>
                      <p style={{ fontSize: '13px', color: 'var(--pub-text-muted)', marginTop: '6px' }}>
                        Terima kasih sudah menghubungi kami. Tim kami akan segera menanggapi pesan Anda melalui email/WhatsApp dalam waktu 1x24 jam.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit}>
                    <div className="pub-form-group">
                      <label className="pub-form-label">Nama Lengkap</label>
                      <input 
                        type="text" 
                        className="pub-form-input" 
                        placeholder="Masukkan nama Anda"
                        value={contactForm.nama}
                        onChange={(e) => setContactForm({ ...contactForm, nama: e.target.value })}
                        required
                      />
                    </div>

                    <div className="pub-form-group">
                      <label className="pub-form-label">Alamat Email</label>
                      <input 
                        type="email" 
                        className="pub-form-input" 
                        placeholder="email@domain.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="pub-form-group">
                      <label className="pub-form-label">Subjek</label>
                      <select 
                        className="pub-form-select"
                        value={contactForm.subjek}
                        onChange={(e) => setContactForm({ ...contactForm, subjek: e.target.value })}
                      >
                        <option value="Pemesanan Bibit">Pemesanan Bibit / DOD</option>
                        <option value="Pemesanan Indukan">Pemesanan Indukan Dewasa</option>
                        <option value="Kemitraan Peternakan">Kemitraan &amp; Kerjasama</option>
                        <option value="Konsultasi Nutrisi">Konsultasi Nutrisi / Pakan</option>
                      </select>
                    </div>

                    <div className="pub-form-group">
                      <label className="pub-form-label">Pesan Anda</label>
                      <textarea 
                        className="pub-form-textarea" 
                        rows={4} 
                        placeholder="Tuliskan pesan atau pertanyaan Anda di sini..."
                        value={contactForm.pesan}
                        onChange={(e) => setContactForm({ ...contactForm, pesan: e.target.value })}
                        required
                      />
                    </div>

                    <button type="submit" className="pub-btn pub-btn-primary" style={{ width: '100%', padding: '12px' }}>
                      Kirim Pesan
                    </button>
                  </form>
                )}
              </div>

            </div>
          </section>
        )}

      </main>

      {/* Footer Branding Area */}
      <footer className="public-footer">
        <div className="public-footer-left">
          <strong>Entok Premium</strong>
          <span>© 2026 Entok Premium Catalog. All rights reserved.</span>
        </div>
        <div className="public-footer-right">
          <span className="public-footer-link" onClick={() => alert("Simulasi: Kebijakan Privasi")}>Kebijakan Privasi</span>
          <span className="public-footer-link" onClick={() => alert("Simulasi: Syarat & Ketentuan")}>Syarat &amp; Ketentuan</span>
          <span className="public-footer-link" onClick={() => alert("Simulasi: Pusat Bantuan")}>Bantuan</span>
        </div>
      </footer>
    </div>
  );
}
