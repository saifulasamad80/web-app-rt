'use client';

import React, { useState } from 'react';
import { loginAdminRT } from '../../src/actions/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@rt.id');
  const [password, setPassword] = useState('admin123');
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
      setError(res?.error || 'Gagal masuk. Periksa email dan password.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 space-y-5">
        <div className="text-center space-y-1">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-lg font-extrabold text-slate-900">Portal Pengurus RT</h1>
          <p className="text-xs text-slate-500">Masuk untuk mengelola data warga & iuran kas</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Email Pengurus</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Kata Sandi</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow disabled:bg-slate-300"
          >
            {loading ? 'Authenticating...' : 'Masuk ke Dasbor RT'}
          </button>
        </form>

        <div className="pt-3 border-t text-center text-[10px] text-slate-400">
          Kredensial Penguji: <b>admin@rt.id</b> | Pass: <b>admin123</b>
        </div>
      </div>
    </main>
  );
}
