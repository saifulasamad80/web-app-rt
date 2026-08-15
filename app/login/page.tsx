'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function LoginPage() {
  const router = useRouter();
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const [email, setEmail] = useState('ajpsas@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (!error) {
      router.push('/rt');
    } else {
      setErrorMsg(error.message || 'Email atau kata sandi pengurus salah.');
    }
  };

  return (
    <main
      style={{ fontSize: `${zoomPercent}%` }}
      className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center text-slate-900 transition-all font-sans"
    >
      <div className="max-w-md w-full space-y-5">

        {/* HEADER CERAH DENGAN WIDGET ZOOM */}
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
              className="px-2 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all"
            >
              A-
            </button>
            <span className="text-[0.7rem] font-mono font-black text-amber-300 px-1">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all"
            >
              A+
            </button>
          </div>
        </header>

        {/* CARD LOGIN CERAH */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-3xl flex items-center justify-center text-[1.8rem] mx-auto shadow-inner">
            🏛️
          </div>

          <div className="text-center">
            <h2 className="text-[1.1rem] font-black text-slate-900">Autentikasi Pengurus</h2>
            <p className="text-[0.8rem] text-slate-500 mt-1">
              Gunakan email dan kata sandi akun resmi pengurus RT.
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 border-2 border-slate-200 rounded-2xl font-bold bg-white text-[0.95rem] outline-none focus:border-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-[0.85rem] font-bold text-slate-800 mb-1">Kata Sandi *</label>
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
              disabled={loading || !password}
              className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[1rem] rounded-2xl transition-all shadow-md disabled:bg-slate-300 cursor-pointer"
            >
              {loading ? 'Memverifikasi Akun...' : 'Masuk ke Dasbor RT →'}
            </button>
          </form>

          <div className="pt-3 border-t-2 border-slate-100 text-center">
            <Link href="/" className="text-[0.8rem] text-slate-500 hover:underline font-bold">
              ← Kembali ke Halaman Utama
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
