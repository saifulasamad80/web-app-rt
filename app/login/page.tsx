'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { loginAdminRT } from '../../src/actions/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await loginAdminRT(email, password);
    setLoading(false);

    if (res && res.success) {
      window.location.href = '/rt';
    } else {
      setError(res?.error || 'Email atau kata sandi pengurus RT salah.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-sm space-y-4">
        
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
        >
          <span>← Kembali ke Halaman Utama</span>
        </Link>

        <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-800 space-y-5">
          <div className="text-center space-y-1">
            <span className="text-3xl">🛡️</span>
            <h1 className="text-lg font-black text-white">Portal Pengurus RT</h1>
            <p className="text-xs text-slate-400">Masuk untuk mengelola data warga & iuran kas</p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">EMAIL PENGURUS</label>
              <input
                type="email"
                required
                placeholder="Masukkan email resmi RT..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">KATA SANDI</label>
              <input
                type="password"
                required
                placeholder="Masukkan kata sandi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-950/50 disabled:bg-slate-800"
            >
              {loading ? 'Memverifikasi...' : 'Masuk ke Dasbor RT'}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
