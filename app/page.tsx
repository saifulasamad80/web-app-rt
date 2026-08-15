'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [textScale, setTextScale] = useState<'base' | 'lg'>('base');
  const fontClass = textScale === 'lg' ? 'text-base' : 'text-sm';
  const headingClass = textScale === 'lg' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl';

  return (
    <main className={`min-h-screen bg-slate-50 text-slate-900 ${fontClass} p-4 md:p-8`}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* HEADER CERAH DENGAN PENGATUR TEKS LANSIA */}
        <header className="bg-emerald-800 text-white p-5 md:p-7 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[11px] font-extrabold px-3 py-1 bg-amber-400 text-slate-950 rounded-full uppercase tracking-wider">
              Sistem Kependudukan & Lingkungan RT
            </span>
            <h1 className={`${headingClass} font-black text-white mt-2`}>
              Portal Digital Warga & Hunian RT
            </h1>
            <p className="text-xs md:text-sm text-emerald-100 mt-1 font-medium">
              Layanan Pelaporan Warga Pendatang, Manajemen Kos/Kontrakan, & Iuran Kas RT
            </p>
          </div>

          {/* WIDGET ZOOM TEKS T↕ A- A+ */}
          <div className="bg-emerald-950/80 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1 shadow-inner">
            <span className="text-xs font-bold text-emerald-300 px-2 flex items-center">T↕</span>
            <button
              type="button"
              onClick={() => setTextScale('base')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${textScale === 'base' ? 'bg-amber-400 text-slate-950 shadow' : 'bg-emerald-900 text-emerald-200 hover:bg-emerald-800'}`}
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setTextScale('lg')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${textScale === 'lg' ? 'bg-amber-400 text-slate-950 shadow' : 'bg-emerald-900 text-emerald-200 hover:bg-emerald-800'}`}
            >
              A+
            </button>
          </div>
        </header>

        {/* 3 KARTU MENU UTAMA (CERAH & KONTRAK TINGGI) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">

          {/* 1. PORTAL PENGHUNI / WARGA */}
          <div className="bg-white p-6 rounded-3xl border-2 border-emerald-200 shadow-md hover:border-emerald-500 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                👤
              </div>
              <h2 className="text-lg font-black text-slate-900">Portal Warga / Penyewa</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cek status verifikasi kependudukan RT, data kamar, tagihan sewa, dan kontak darurat RT/pengelola.
              </p>
            </div>
            <Link
              href="/portal-warga"
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-center rounded-2xl shadow transition-all block"
            >
              Buka Portal Warga →
            </Link>
          </div>

          {/* 2. DASBOR PEMILIK / PENGELOLA KOS */}
          <div className="bg-white p-6 rounded-3xl border-2 border-amber-200 shadow-md hover:border-amber-500 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-14 h-14 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                🏢
              </div>
              <h2 className="text-lg font-black text-slate-900">Dasbor Pemilik Kos</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kelola okupansi kamar, daftar penyewa, cetak poster QR lapor diri, dan pencatatan operasional kos.
              </p>
            </div>
            <Link
              href="/owner"
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-center rounded-2xl shadow transition-all block"
            >
              Masuk Dasbor Pemilik →
            </Link>
          </div>

          {/* 3. DASBOR PENGURUS RT */}
          <div className="bg-white p-6 rounded-3xl border-2 border-blue-200 shadow-md hover:border-blue-500 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-14 h-14 bg-blue-100 text-blue-900 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                🏛️
              </div>
              <h2 className="text-lg font-black text-slate-900">Portal Pengurus RT</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Buku register warga pendatang, verifikasi legalitas berkas KTP, reset PIN properti, dan kas iuran RT.
              </p>
            </div>
            <Link
              href="/rt"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-center rounded-2xl shadow transition-all block"
            >
              Masuk Dasbor RT →
            </Link>
          </div>

        </div>

        {/* FOOTER INFORMASI LINGKUNGAN */}
        <footer className="bg-white p-5 rounded-2xl border-2 border-slate-200 text-center text-slate-600 text-xs space-y-1">
          <p className="font-bold text-slate-900">Sistem Pelayanan Kependudukan Digital Lingkungan RT Setempat</p>
          <p>Mematuhi Ketentuan UU Kependudukan & UU Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022)</p>
        </footer>

      </div>
    </main>
  );
}
