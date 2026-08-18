'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LoginPage() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message || 'Email atau kata sandi pengurus salah.');
      return;
    }

    if (data.session || data.user) {
      localStorage.setItem('rt_admin_logged_in', 'true');
      window.location.href = '/rt';
    } else {
      setLoading(false);
      setErrorMsg('Gagal membuat sesi login. Silakan coba lagi.');
    }
  };

  return (
    <main
      style={{ fontSize: `${zoomPercent}%` }}
      className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center text-slate-900 transition-all font-sans"
    >
      <div className="max-w-md w-full space-y-5">

        {/* HEADER CERAH */}
        <header className="bg-emerald-800 text-white p-5 md:p-6 rounded-3xl shadow-xl flex justify-between items-center">
          <div>
            <span className="text-[0.75rem] font-extrabold px-3 py-1 bg-amber-400 text-slate-950 rounded-full uppercase">
              PORTAL OTORITAS RT
            </span>
            <h1 className="text-[1.3rem] font-black text-white mt-1">Masuk Pengurus RT</h1>
          </div>

          <div className="bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1.5 shadow-inner">
            <span className="text-[0.75rem] font-bold text-emerald-300 px-1 flex items-center">T↕</span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-2 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
            >
              A-
            </button>
            <span className="text-[0.7rem] font-mono font-black text-amber-300 px-1">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
            >
              A+
            </button>
          </div>
        </header>

        {/* CARD LOGIN CERAH TANPA PREFILLED DATA */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-3xl flex items-center justify-center text-[1.8rem] mx-auto shadow-inner">
            🏛️
          </div>

          <div className="text-center">
            <h2 className="text-[1.1rem] font-black text-slate-900">Autentikasi Pengurus</h2>
            <p className="text-[0.8rem] text-slate-500 mt-1">
              Gunakan akun resmi Pengurus RT untuk memvalidasi warga & kas.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl text-[0.8rem] font-bold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[0.85rem] font-bold text-slate-800 mb-1">Email Pengurus *</label>
              <input
                type="email"
                required
                placeholder="nama@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold bg-white text-[0.95rem] outline-none focus:border-emerald-600 font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[0.85rem] font-bold text-slate-800">Kata Sandi *</label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-[0.75rem] font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  ❓ Lupa Sandi?
                </button>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold bg-white text-[0.95rem] outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[1rem] rounded-2xl transition-all shadow-md disabled:bg-slate-300 cursor-pointer"
            >
              {loading ? 'Memverifikasi Akun...' : 'Masuk ke Dasbor RT →'}
            </button>
          </form>

          <div className="pt-3 border-t-2 border-slate-100 text-center">
            <Link href="/" className="text-[0.8rem] text-slate-600 hover:underline font-bold">
              ← Kembali ke Halaman Utama
            </Link>
          </div>
        </div>

      </div>

      {/* MODAL BANTUAN LUPA SANDI */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-[0.9rem] font-black">🔑 Pemulihan Akun Pengurus RT</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-white hover:text-amber-300 font-bold text-xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-[0.8rem]">
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-amber-950 space-y-1.5">
                <p className="font-bold">🛡️ Kebijakan Keamanan Sistem RT:</p>
                <p className="text-[0.75rem] text-slate-700 leading-relaxed font-medium">
                  Hak reset kata sandi pengurus dibatasi secara ketat dan <b>hanya dapat dilakukan oleh Super Admin RT</b> melalui Dasbor Operasional Internal.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1 text-slate-800">
                <p className="font-bold">Hubungi Super Admin Resmi RT:</p>
                <p className="text-emerald-900 font-black">👤 Saiful Anwar Samad (Ajip)</p>
                <p className="text-slate-600 font-mono text-[0.75rem]">✉️ ajipsas@gmail.com</p>
                <p className="text-slate-600 font-mono text-[0.75rem]">📱 082113546883</p>
              </div>

              <div className="pt-2">
                <a
                  href="https://wa.me/6282113546883?text=Halo%20Super%20Admin%20RT%2C%20saya%20pengurus%20RT%20memerlukan%20bantuan%20reset%20kata%20sandi%20akun."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl text-center block shadow text-[0.8rem]"
                >
                  💬 Hubungi Super Admin via WhatsApp
                </a>
              </div>
            </div>

            <div className="p-3 bg-slate-50 text-right border-t">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[0.75rem] cursor-pointer"
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
