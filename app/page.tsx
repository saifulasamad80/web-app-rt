'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [showPanicModal, setShowPanicModal] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Untuk memasang di HP: Buka menu titik tiga browser Chrome / Safari, lalu pilih "Tambahkan ke Layar Utama" (Add to Home screen).');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  return (
    <main
      style={{ fontSize: `${zoomPercent}%` }}
      className="min-h-screen bg-slate-50 text-slate-900 p-3 md:p-8 transition-all font-sans"
    >
      <div className="max-w-5xl mx-auto space-y-5">

        {/* HEADER CERAH DENGAN WIDGET ZOOM */}
        <header className="bg-emerald-800 text-white p-5 md:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[0.75rem] font-extrabold px-3 py-1 bg-amber-400 text-slate-950 rounded-full uppercase tracking-wider">
              Sistem Kependudukan & Lingkungan RT
            </span>
            <h1 className="text-[1.5rem] md:text-[1.8rem] font-black text-white mt-2">
              Portal Digital Warga & Hunian RT
            </h1>
            <p className="text-[0.85rem] text-emerald-100 mt-1 font-medium">
              Layanan Pelaporan Warga Pendatang, Manajemen Kos/Kontrakan, & Iuran Kas RT
            </p>
          </div>

          <div className="bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1.5 shadow-inner">
            <span className="text-[0.75rem] font-bold text-emerald-300 px-1 flex items-center">T↕</span>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Kecilkan Teks"
              className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
            >
              A-
            </button>
            <span className="text-[0.7rem] font-mono font-black text-amber-300 px-1">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Perbesar Teks"
              className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
            >
              A+
            </button>
          </div>
        </header>

        {/* 📲 BANNER PROMPT INSTALL APLIKASI (PWA INSTALL) */}
        <div className="bg-emerald-900 text-white p-4 md:p-5 rounded-3xl shadow-lg border-2 border-emerald-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[2rem]">📲</span>
            <div>
              <h3 className="font-black text-[1rem] text-white">Pasang Aplikasi di Layar Utama HP</h3>
              <p className="text-[0.75rem] text-emerald-200 font-medium">Akses portal RT lebih cepat dan praktis layaknya aplikasi resmi tanpa browser.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full md:w-auto px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[0.85rem] rounded-2xl shadow transition-all cursor-pointer whitespace-nowrap"
          >
            ➕ Pasang Aplikasi (Install)
          </button>
        </div>

        {/* 🚨 PANIC BUTTON RESMI */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 md:p-6 rounded-3xl shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-2 border-red-400">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[1.5rem] animate-pulse">🚨🆘</span>
              <h2 className="text-[1.2rem] font-black uppercase tracking-wide">
                Pusat Panggilan Darurat (Panic Button)
              </h2>
            </div>
            <p className="text-[0.8rem] text-red-100 font-medium">
              Akses cepat: Damkar (113) • Polisi (110) • SAR (115) • Ambulans (119/118) • Pos Hansip RT
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPanicModal(true)}
            className="w-full md:w-auto px-6 py-3.5 bg-white hover:bg-amber-100 text-red-700 font-black text-[0.9rem] rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🚨 Buka Tombol Darurat</span>
          </button>
        </div>

        {/* 3 KARTU MENU UTAMA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">

          {/* 1. PORTAL WARGA / PENYEWA */}
          <div className="bg-white p-6 rounded-3xl border-2 border-emerald-200 shadow-md hover:border-emerald-500 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-[1.8rem] shadow-inner">
                👤
              </div>
              <h2 className="text-[1.1rem] font-black text-slate-900">Portal Warga / Penyewa</h2>
              <p className="text-[0.8rem] text-slate-600 leading-relaxed">
                Cek status kependudukan RT, data kamar, tagihan sewa, rekap 3 bulan, dan anggota sekamar.
              </p>
            </div>
            <Link
              href="/portal-warga"
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-center rounded-2xl shadow transition-all block text-[0.85rem]"
            >
              Buka Portal Warga →
            </Link>
          </div>

          {/* 2. DASBOR PEMILIK KOS */}
          <div className="bg-white p-6 rounded-3xl border-2 border-amber-200 shadow-md hover:border-amber-500 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-14 h-14 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center text-[1.8rem] shadow-inner">
                🏢
              </div>
              <h2 className="text-[1.1rem] font-black text-slate-900">Dasbor Pemilik Kos</h2>
              <p className="text-[0.8rem] text-slate-600 leading-relaxed">
                Login privat via WhatsApp & PIN. Rekap laba bersih, okupansi kamar, dan buku kas pengeluaran.
              </p>
            </div>
            <Link
              href="/owner"
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-center rounded-2xl shadow transition-all block text-[0.85rem]"
            >
              Masuk Dasbor Pemilik →
            </Link>
          </div>

          {/* 3. DASBOR PENGURUS RT */}
          <div className="bg-white p-6 rounded-3xl border-2 border-blue-200 shadow-md hover:border-blue-500 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-14 h-14 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center text-[1.8rem] shadow-inner">
                🏛️
              </div>
              <h2 className="text-[1.1rem] font-black text-slate-900">Portal Pengurus RT</h2>
              <p className="text-[0.8rem] text-slate-600 leading-relaxed">
                Buku register warga pendatang, verifikasi KTP/Buku Nikah (UU PDP), kelola pengurus, & kas RT.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-center rounded-2xl shadow transition-all block text-[0.85rem]"
            >
              Masuk Dasbor RT →
            </Link>
          </div>

        </div>

        {/* FOOTER */}
        <footer className="bg-white p-5 rounded-2xl border-2 border-slate-200 text-center text-slate-600 text-[0.75rem] space-y-1">
          <p className="font-bold text-slate-900">Sistem Pelayanan Kependudukan Digital Lingkungan RT Setempat</p>
          <p>Mematuhi Ketentuan UU Kependudukan & UU Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022)</p>
        </footer>

      </div>

      {/* MODAL PANIC BUTTON TERPADU */}
      {showPanicModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-red-300">
            <div className="p-4 bg-red-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[1.3rem]">🚨🆘</span>
                <h3 className="text-[1rem] font-black">Panggilan Darurat Lingkungan & Nasional</h3>
              </div>
              <button
                onClick={() => setShowPanicModal(false)}
                className="text-white hover:text-amber-300 font-bold text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-[0.8rem]">
              <p className="text-slate-600 text-[0.75rem] font-medium leading-tight">
                Sentuh tombol panggilan sesuai dengan jenis bantuan yang dibutuhkan segera di lokasi:
              </p>

              <div className="bg-red-50 p-3.5 rounded-2xl border-2 border-red-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-red-950 text-[0.85rem]">🚒 Pemadam Kebakaran (Damkar)</h4>
                  <p className="text-[0.7rem] text-red-800 font-medium">Kebakaran & penyelamatan evakuasi</p>
                </div>
                <a href="tel:113" className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[0.8rem] shadow">📞 113</a>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-2xl border-2 border-blue-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-blue-950 text-[0.85rem]">🚓 Kepolisian RI (Polisi)</h4>
                  <p className="text-[0.7rem] text-blue-800 font-medium">Tindak kriminal, keributan & kamtibmas</p>
                </div>
                <a href="tel:110" className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black text-[0.8rem] shadow">📞 110</a>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border-2 border-emerald-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-emerald-950 text-[0.85rem]">🚑 Ambulans / Gawat Darurat</h4>
                  <p className="text-[0.7rem] text-emerald-800 font-medium">Bantuan medis & rumah sakit (119/118)</p>
                </div>
                <div className="flex gap-1.5">
                  <a href="tel:119" className="px-2.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-[0.75rem] shadow">📞 119</a>
                  <a href="tel:118" className="px-2.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-black text-[0.75rem] shadow">118</a>
                </div>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-2xl border-2 border-amber-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-amber-950 text-[0.85rem]">🚁 SAR / BASARNAS</h4>
                  <p className="text-[0.7rem] text-amber-800 font-medium">Bencana alam & pertolongan darurat</p>
                </div>
                <a href="tel:115" className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-[0.8rem] shadow">📞 115</a>
              </div>

              <div className="bg-slate-100 p-3.5 rounded-2xl border-2 border-slate-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-slate-900 text-[0.85rem]">👮 Pos Hansip / Satpam Lingkungan</h4>
                  <p className="text-[0.7rem] text-slate-600 font-medium">Penanganan lokal RT 24 Jam</p>
                </div>
                <a href="tel:081299887766" className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[0.8rem] shadow">📞 Telepon</a>
              </div>
            </div>

            <div className="p-3 bg-slate-50 text-right border-t">
              <button
                onClick={() => setShowPanicModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[0.8rem] font-black rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
