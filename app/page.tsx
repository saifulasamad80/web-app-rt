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
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24 relative overflow-hidden flex items-center justify-center">
      {/* Background Ornaments untuk kesan modern */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

      <div className="max-w-5xl w-full space-y-8 relative z-10">

        {/* HEADER MODERN & TERPUSAT */}
        <header className="text-center pt-8 pb-4">
          <span className="text-[0.65rem] md:text-[0.75rem] font-black px-4 py-1.5 bg-slate-900 text-white rounded-full uppercase tracking-widest shadow-sm">
            Sistem Kependudukan & Lingkungan RT
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mt-6 tracking-tight">
            Portal Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Warga & RT</span>
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-4 font-medium max-w-2xl mx-auto leading-relaxed px-4">
            Platform terpadu untuk pelaporan pendatang, manajemen properti kos/kontrakan, dan pencatatan kas lingkungan secara transparan.
          </p>
        </header>

        {showInstallBanner && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 transform transition-all hover:scale-[1.01]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">📲</div>
              <div>
                <h3 className="font-black text-[1.05rem]">Pasang Aplikasi (PWA)</h3>
                <p className="text-[0.8rem] text-slate-300 font-medium">Akses portal lebih cepat layaknya aplikasi native di HP Anda.</p>
              </div>
            </div>
            <button onClick={handleInstallClick} className="px-6 py-3 bg-white text-slate-900 font-black text-[0.85rem] rounded-xl shadow-lg w-full md:w-auto hover:bg-slate-100 transition-colors">
              Install Sekarang
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARD 1: WARGA (THEME: BLUE) */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-6 group">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">👤</div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Portal Warga</h2>
                <p className="text-sm text-slate-500 leading-relaxed mt-2 font-medium">Cek status kependudukan, lengkapi dokumen, dan pantau histori tagihan sewa bulanan Anda.</p>
              </div>
            </div>
            <Link href="/portal-warga" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-center rounded-xl text-sm shadow-md shadow-blue-600/20 transition-colors">Buka Portal Warga</Link>
          </div>

          {/* CARD 2: OWNER (THEME: AMBER) */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-6 group">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">🏢</div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Pemilik Kos</h2>
                <p className="text-sm text-slate-500 leading-relaxed mt-2 font-medium">Kelola kamar, pantau tingkat okupansi, pencatatan lunas/belum, dan buku kas operasional.</p>
              </div>
            </div>
            {/* JANJI DITEPATI: Warna Dirubah Jadi Kuning/Amber */}
            <Link href="/owner" className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-center rounded-xl text-sm shadow-md shadow-amber-500/20 transition-colors">Masuk Dasbor Pemilik</Link>
          </div>

          {/* CARD 3: RT (THEME: EMERALD) */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-6 group">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">🏛️</div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Pengurus RT</h2>
                <p className="text-sm text-slate-500 leading-relaxed mt-2 font-medium">Validasi warga baru, manajemen pengurus, keamanan data audit, dan rekapitulasi kas lingkungan.</p>
              </div>
            </div>
            <Link href="/rt" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-center rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-colors">Masuk Dasbor RT</Link>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BUTTON (FAB) PANIC BUTTON */}
      <button 
        onClick={() => setShowPanicModal(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl transition-transform hover:scale-110 border-4 border-white shadow-red-600/40 cursor-pointer"
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