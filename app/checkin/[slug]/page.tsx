'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { submitTenantCheckin } from '../../../src/actions/checkin-tenant';

export default function PublicCheckinPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'kos-melati-1';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [pdpConsent, setPdpConsent] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('Mengirim data lapor diri ke database RT...');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('address', address);
      formData.append('entryDate', entryDate);
      formData.append('propertySlug', slug);
      if (pdpConsent) formData.append('pdpConsent', 'true');

      const res = await submitTenantCheckin(formData);

      if (res.error) throw new Error(res.error);

      setStatusMsg('✅ Pendataan Lapor Diri Berhasil! Data Anda telah tersimpan secara aman di database RT.');
      setName('');
      setPhone('');
      setAddress('');
      setEntryDate('');
      setPdpConsent(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      setStatusMsg('❌ Error: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-gray-900">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="border-b pb-4 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
            Portal Wajib Lapor RT (Publik)
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Formulir Pendataan Penghuni Baru</h1>
          <p className="text-xs text-gray-500 mt-1">
            Properti ID: <code className="font-mono text-emerald-800 font-bold">{slug}</code>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nama Lengkap *</label>
            <input
              type="text"
              required
              placeholder="Sesuai KTP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nomor WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tanggal Mulai Menetap *</label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Alamat KTP / Asal *</label>
            <textarea
              required
              rows={2}
              placeholder="Alamat domisili KTP..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={pdpConsent}
                onChange={(e) => setPdpConsent(e.target.checked)}
                className="mt-1 h-4 w-4 text-emerald-600 rounded border-gray-300"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                Saya menyetujui data pribadi ini disimpan secara aman oleh Pengurus RT untuk keperluan tertib administrasi kependudukan sesuai <strong>UU No. 27 Tahun 2022 (UU PDP)</strong>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-700 text-white font-medium rounded hover:bg-emerald-800 disabled:bg-gray-400 text-sm transition-colors"
          >
            {loading ? 'Mengirim Data...' : 'Kirim Lapor Diri'}
          </button>
        </form>

        {statusMsg && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono whitespace-pre-wrap">
            {statusMsg}
          </div>
        )}
      </div>
    </main>
  );
}
