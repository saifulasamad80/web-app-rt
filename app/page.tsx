'use client';

import React from 'react';
import Link from 'next/link';

export default function CentralPortalLandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full my-auto space-y-8 py-8">
        
        {/* HEADER BRANDING */}
        <div className="text-center space-y-3">
          <span className="text-[10px] font-black px-3 py-1 bg-emerald-500 text-slate-950 rounded-full uppercase tracking-widest">
            SISTEM INFORMASI KEPENDUDUKAN DIGITAL RT
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Portal Wajib Lapor Kependudukan RT
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Layanan Terpadu Pendataan Warga Pendatang, Pengelolaan Kos/Kontrakan, dan Verifikasi Resmi RT Sesuai Regulasi UU PDP No. 27 Tahun 2022.
          </p>
        </div>

        {/* 2 PINTU MASUK UTAMA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          
          {/* PINTU 1: PEMILIK KOS & KONTRAKAN */}
          <div className="bg-slate-900/80 border-2 border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl shadow-2xl transition-all flex flex-col justify-between gap-6 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🏢
              </div>
              <h2 className="text-xl font-bold text-white">Pemilik Kos / Kontrakan</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Kelola unit hunian sewa Anda, dapatkan Poster QR Code resmi RT, bagikan tautan lapor WA ke penyewa, dan pantau penghuni secara mandiri.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/owner"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
              >
                <span>Masuk Dasbor Pemilik</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* PINTU 2: PENGURUS RT */}
          <div className="bg-slate-900/80 border-2 border-slate-800 hover:border-slate-700 p-6 rounded-2xl shadow-2xl transition-all flex flex-col justify-between gap-6 group">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🛡️
              </div>
              <h2 className="text-xl font-bold text-white">Portal Pengurus RT</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Akses khusus Admin/Pengurus RT untuk menyetujui permohonan lokasi kos baru, memverifikasi warga pendatang, dan mencetak Buku Register.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
              >
                <span>Login Pengurus RT</span>
                <span>→</span>
              </Link>
            </div>
          </div>

        </div>

        {/* CATATAN PENTING UNTUK PENYEWA */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl text-center space-y-1">
          <p className="text-xs font-bold text-slate-300">📢 Anda Calon Penyewa / Penghuni Baru?</p>
          <p className="text-[11px] text-slate-500">
            Silakan memindai **Poster QR Code** yang tertempel di lokasi kos/kontrakan Anda atau gunakan tautan pendaftaran khusus yang dikirim oleh pemilik unit.
          </p>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="text-center text-[10px] text-slate-600 font-mono py-4 border-t border-slate-900">
        © 2026 Sistem Informasi Kependudukan RT • Terenkripsi & Terlindungi UU PDP No. 27/2022
      </footer>
    </main>
  );
}
