'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [showPanicModal, setShowPanicModal] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); setDeferredPrompt(e); setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Untuk memasang di HP: Buka menu browser lalu pilih "Tambahkan ke Layar Utama".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBanner(false);
    setDeferredPrompt(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans pb-24 relative overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER CLEAN & MINIMALIS */}
        <header className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[0.75rem] font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full uppercase tracking-wider">
              Sistem Kependudukan & Lingkungan RT
            </span>
            <h1 className="text-[1.5rem] md:text-[2rem] font-black text-slate-900 mt-3">
              Portal Digital Warga & RT
            </h1>
            <p className="text-[0.9rem] text-slate-500 mt-1 font-medium">
              Pelaporan Warga Pendatang, Manajemen Kos, & Iuran Kas Terpadu
            </p>
          </div>
        </header>

        {showInstallBanner && (
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📲</span>
              <div>
                <h3 className="font-black text-[1rem]">Pasang Aplikasi (PWA)</h3>
                <p className="text-[0.8rem] text-slate-300">Akses portal lebih cepat layaknya aplikasi native.</p>
              </div>
            </div>
            <button onClick={handleInstallClick} className="px-5 py-2.5 bg-white text-slate-900 font-black text-[0.85rem] rounded-xl shadow w-full md:w-auto hover:bg-slate-200 transition-colors">
              Install Sekarang
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CARD 1: WARGA */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-600 rounded-xl flex items-center justify-center text-xl transition-colors">👤</div>
              <h2 className="text-[1.1rem] font-black text-slate-900">Portal Warga</h2>
              <p className="text-[0.85rem] text-slate-500 leading-relaxed">Cek status kependudukan RT, data kamar, tagihan sewa, dan anggota sekamar.</p>
            </div>
            <Link href="/portal-warga" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-center rounded-xl text-[0.85rem] transition-colors">Buka Portal Warga</Link>
          </div>

          {/* CARD 2: OWNER */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-slate-100 group-hover:bg-amber-50 text-slate-700 group-hover:text-amber-600 rounded-xl flex items-center justify-center text-xl transition-colors">🏢</div>
              <h2 className="text-[1.1rem] font-black text-slate-900">Dasbor Pemilik Kos</h2>
              <p className="text-[0.85rem] text-slate-500 leading-relaxed">Kelola unit kos, pantau laba bersih, okupansi, dan catat pengeluaran operasional.</p>
            </div>
            <Link href="/owner" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-center rounded-xl text-[0.85rem] transition-colors">Masuk Dasbor Pemilik</Link>
          </div>

          {/* CARD 3: RT */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-slate-100 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-600 rounded-xl flex items-center justify-center text-xl transition-colors">🏛️</div>
              <h2 className="text-[1.1rem] font-black text-slate-900">Portal Pengurus RT</h2>
              <p className="text-[0.85rem] text-slate-500 leading-relaxed">Buku register warga, verifikasi dokumen UU PDP, kelola pengurus, & kas RT.</p>
            </div>
            <Link href="/login" className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-center rounded-xl text-[0.85rem] transition-colors">Masuk Dasbor RT</Link>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BUTTON (FAB) PANIC BUTTON - Solusi UI/UX Feedback */}
      <button 
        onClick={() => setShowPanicModal(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl transition-transform hover:scale-110 border-4 border-white shadow-red-600/30 cursor-pointer"
        title="Pusat Panggilan Darurat"
      >
        🚨
      </button>

      {/* MODAL PANIC BUTTON */}
      {showPanicModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4 pb-8 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up border border-slate-200">
            <div className="p-5 bg-red-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2"><span className="text-2xl animate-pulse">🆘</span><h3 className="font-black text-lg">Panggilan Darurat</h3></div>
              <button onClick={() => setShowPanicModal(false)} className="text-white hover:text-red-200 font-bold text-2xl cursor-pointer leading-none">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <a href="tel:113" className="flex justify-between items-center p-4 bg-slate-50 hover:bg-red-50 rounded-2xl border transition-colors cursor-pointer group">
                <div><h4 className="font-black text-slate-900">Pemadam Kebakaran</h4><p className="text-xs text-slate-500">Kebakaran & Evakuasi</p></div><span className="px-4 py-2 bg-red-600 group-hover:bg-red-700 text-white font-black rounded-xl shadow-sm transition-colors">113</span>
              </a>
              <a href="tel:110" className="flex justify-between items-center p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border transition-colors cursor-pointer group">
                <div><h4 className="font-black text-slate-900">Polisi</h4><p className="text-xs text-slate-500">Kriminalitas & Keamanan</p></div><span className="px-4 py-2 bg-blue-600 group-hover:bg-blue-700 text-white font-black rounded-xl shadow-sm transition-colors">110</span>
              </a>
              <a href="tel:119" className="flex justify-between items-center p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border transition-colors cursor-pointer group">
                <div><h4 className="font-black text-slate-900">Ambulans</h4><p className="text-xs text-slate-500">Gawat Darurat Medis</p></div><span className="px-4 py-2 bg-emerald-600 group-hover:bg-emerald-700 text-white font-black rounded-xl shadow-sm transition-colors">119</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}