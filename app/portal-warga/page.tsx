'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getTenantPortalData, uploadPendingDocument } from '../../src/actions/checkin-tenant';

export default function TenantPortalPage() {
  const [textScale, setTextScale] = useState<'base' | 'lg'>('base');

  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);
  const [household, setHousehold] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput) return;

    setLoading(true);
    setErrorMsg('');
    const res = await getTenantPortalData(phoneInput);
    setLoading(false);

    if (res.success && res.tenant) {
      setTenantData(res.tenant);
      setHousehold(res.household || []);
    } else {
      setErrorMsg(res.error || 'Nomor WhatsApp tidak terdaftar di sistem kependudukan RT.');
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !tenantData) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', docFile);

    const res = await uploadPendingDocument(tenantData.id, 'marriage', formData);
    setUploadingDoc(false);

    if (res.success) {
      alert('Dokumen berhasil diunggah! Pengurus RT akan memverifikasi berkas Anda.');
      setDocFile(null);
      setTenantData({ ...tenantData, marriage_doc_url: res.path });
    } else {
      alert('Gagal mengunggah berkas: ' + res.error);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyMsg(`${label} berhasil disalin ke clipboard!`);
    setTimeout(() => setCopyMsg(''), 3000);
  };

  const fontClass = textScale === 'lg' ? 'text-base' : 'text-xs';
  const isVerified = (tenantData?.status || '').toUpperCase() === 'VERIFIED';
  const property = tenantData?.properties;
  const isPaid = (tenantData?.payment_status || '').toUpperCase() === 'PAID';

  return (
    <main className={`min-h-screen bg-slate-50 p-3 md:p-8 text-slate-900 ${fontClass}`}>
      <div className="max-w-xl mx-auto space-y-5">

        {/* HEADER CERAH DENGAN WIDGET T↕ A- A+ */}
        <header className="bg-emerald-800 text-white p-5 md:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <span className="text-[10px] md:text-[11px] font-extrabold px-3 py-1 bg-amber-400 text-slate-950 rounded-full uppercase">
              PORTAL MANDIRI PENGHUNI
            </span>
            <h1 className="text-xl md:text-2xl font-black text-white mt-1">Dasbor Warga Pendatang</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* WIDGET ZOOM TEKS T↕ A- A+ */}
            <div className="bg-emerald-950/80 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1 shadow-inner">
              <span className="text-xs font-bold text-emerald-300 px-1.5 flex items-center">T↕</span>
              <button
                type="button"
                onClick={() => setTextScale('base')}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${textScale === 'base' ? 'bg-amber-400 text-slate-950 shadow' : 'bg-emerald-900 text-emerald-200 hover:bg-emerald-800'}`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setTextScale('lg')}
                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${textScale === 'lg' ? 'bg-amber-400 text-slate-950 shadow' : 'bg-emerald-900 text-emerald-200 hover:bg-emerald-800'}`}
              >
                A+
              </button>
            </div>

            <Link href="/" className="px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-xs rounded-2xl border border-emerald-700">
              🚪 Keluar
            </Link>
          </div>
        </header>

        {copyMsg && (
          <div className="p-3.5 bg-emerald-100 text-emerald-900 border-2 border-emerald-300 rounded-2xl text-xs md:text-sm font-bold text-center">
            {copyMsg}
          </div>
        )}

        {!tenantData ? (
          /* FORM LOGIN CERAH */
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border-2 border-slate-200 space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-inner">
              📱
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Masuk Portal Warga</h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Gunakan nomor WhatsApp yang Anda daftarkan saat lapor diri di RT.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-800 mb-1">Nomor WhatsApp Anda *</label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 08123456789"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full p-3.5 border-2 border-slate-200 focus:border-emerald-600 rounded-2xl outline-none font-mono text-base font-bold bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !phoneInput}
                className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm md:text-base rounded-2xl transition-all shadow-md disabled:bg-slate-300"
              >
                {loading ? 'Memeriksa Data RT...' : 'Buka Dasbor Saya →'}
              </button>
            </form>
          </div>
        ) : (
          /* DASBOR PENGHUNI AKTIF */
          <div className="space-y-4">

            {/* KARTU STATUS RT */}
            <div className={`p-6 rounded-3xl shadow-sm border-2 flex items-center justify-between ${
              isVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="space-y-1">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                  isVerified ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {isVerified ? '✅ RESMI TERVERIFIKASI RT' : '⚠️ MENUNGGU VERIFIKASI RT'}
                </span>
                <h3 className="text-base md:text-lg font-black mt-1">Status Kependudukan RT</h3>
                <p className="text-xs md:text-sm text-slate-700 font-medium">
                  {isVerified ? 'Data Anda sah tercatat di buku register RT setempat.' : 'Data Anda sedang dalam proses peninjauan Pengurus RT.'}
                </p>
              </div>
            </div>

            {/* INFO UNIT & KAMAR */}
            <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <h3 className="font-black text-slate-900 text-sm uppercase border-b-2 border-slate-100 pb-2">
                🏠 Informasi Hunian & Kamar
              </h3>
              <div className="grid grid-cols-2 gap-4 text-slate-800 font-medium">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">NAMA PROPERTI</span>
                  <span className="font-black text-slate-900 text-sm md:text-base">{property?.name || property?.property_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">NOMOR / LOKASI KAMAR</span>
                  <span className="font-black text-emerald-800 text-sm md:text-base">{tenantData.room_number || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">TANGGAL MASUK</span>
                  <span className="font-mono font-bold text-slate-800">{tenantData.entry_date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">STATUS PERNIKAHAN</span>
                  <span className="font-bold text-slate-800">{tenantData.marital_status || 'Belum Menikah'}</span>
                </div>
              </div>
            </div>

            {/* RINCIAN TAGIHAN & PEMBAYARAN SEWA */}
            <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b-2 border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-sm uppercase">
                  💳 Rincian Tagihan Sewa
                </h3>
                <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase ${
                  isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isPaid ? 'LUNAS' : 'BELUM DIBAYAR'}
                </span>
              </div>

              <div className="flex justify-between items-baseline py-1">
                <span className="text-slate-600 font-bold">Nominal Sewa:</span>
                <span className="text-xl md:text-2xl font-black text-slate-900">
                  Rp {Number(tenantData.rent_price || 0).toLocaleString('id-ID')}
                </span>
              </div>

              {property?.bank_account_number && (
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">REKENING RESMI PEMILIK:</span>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-900 text-sm md:text-base">{property.bank_name} - {property.bank_account_number}</p>
                      <p className="text-xs text-slate-600 font-semibold">a.n. {property.bank_account_holder}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(property.bank_account_number, 'Nomor Rekening')}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 shadow"
                    >
                      📋 Salin Rek
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DOKUMEN SUSULAN */}
            {tenantData.marital_status === 'Menikah' && !tenantData.marriage_doc_url && (
              <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-300 space-y-3">
                <h3 className="font-black text-amber-950 text-sm uppercase flex items-center gap-2">
                  <span>📎</span> Unggah Dokumen Buku Nikah / KK Susulan
                </h3>
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  Berkas Buku Nikah/KK Anda belum terlampir. Silakan unggah foto dokumen begitu berkas siap agar verifikasi RT tuntas.
                </p>

                <form onSubmit={handleUploadDoc} className="space-y-3">
                  <input
                    type="file"
                    required
                    accept="image/*,.pdf"
                    onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full p-2.5 border-2 border-amber-200 rounded-xl bg-white text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-900 file:text-white"
                  />
                  <button
                    type="submit"
                    disabled={uploadingDoc || !docFile}
                    className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-black text-xs rounded-xl transition-all disabled:bg-slate-300"
                  >
                    {uploadingDoc ? 'Mengunggah Berkas...' : 'Kirim Berkas Susulan ke RT'}
                  </button>
                </form>
              </div>
            )}

            {/* BUKU KONTAK PENGELOLA & RT */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {property?.manager_phone ? (
                <a
                  href={`https://wa.me/${property.manager_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-center block shadow text-xs md:text-sm"
                >
                  💬 Chat Pengelola
                </a>
              ) : (
                <div className="p-3.5 bg-slate-200 text-slate-500 rounded-2xl font-bold text-center text-xs">Pengelola -</div>
              )}

              <button
                onClick={() => alert('Untuk bantuan darurat lingkungan, silakan hubungi pengurus RT setempat atau pos keamanan terdekat.')}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-center shadow text-xs md:text-sm"
              >
                🛡️ Bantuan RT
              </button>
            </div>

            <div className="text-center pt-3">
              <button
                onClick={() => { setTenantData(null); setPhoneInput(''); }}
                className="text-xs text-slate-600 hover:underline font-bold"
              >
                Ganti Nomor WhatsApp Lain
              </button>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
