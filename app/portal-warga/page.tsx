'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getTenantPortalData, uploadPendingDocument, addMemberSusulan, deleteTenant } from '../../src/actions/checkin-tenant';

function calculateAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
  return isNaN(age) ? 0 : age;
}

// LOGIKA RIWAYAT SEWA YANG SINKRON 100% DENGAN OWNER
function getThreeMonthHistory(paymentStatus: string, entryDateStr: string) {
  const today = new Date();
  const entryDate = entryDateStr ? new Date(entryDateStr) : today;
  const entryYearMonth = entryDate.getFullYear() * 12 + entryDate.getMonth();
  const currentYearMonth = today.getFullYear() * 12 + today.getMonth();

  const MONTH_NAMES_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const history = [];
  const isPaidCurrent = (paymentStatus || '').toUpperCase() === 'PAID';

  for (let i = 2; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dYearMonth = d.getFullYear() * 12 + d.getMonth();
    let status = 'PAID';
    if (dYearMonth < entryYearMonth) { status = 'N/A'; } 
    else if (dYearMonth === currentYearMonth) { status = isPaidCurrent ? 'PAID' : 'UNPAID'; } 
    else { status = 'PAID'; }

    history.push({ labelLong: `${MONTH_NAMES_LONG[d.getMonth()]} ${d.getFullYear()}`, status: status });
  }
  return history;
}

export default function TenantPortalPage() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);
  const [household, setHousehold] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // States form tambah anggota
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberBirth, setMemberBirth] = useState('');
  const [memberRelation, setMemberRelation] = useState('Istri');
  const [memberKtpFile, setMemberKtpFile] = useState<File | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); if (!phoneInput) return;
    setLoading(true); setErrorMsg('');
    const res = await getTenantPortalData(phoneInput);
    setLoading(false);
    if (res.success && res.tenant) { setTenantData(res.tenant); setHousehold(res.household || []); } 
    else { setErrorMsg(res.error || 'Nomor WhatsApp tidak terdaftar di sistem.'); }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault(); if (!docFile || !tenantData) return;
    setUploadingDoc(true); const formData = new FormData(); formData.append('file', docFile);
    const res = await uploadPendingDocument(tenantData.id, 'marriage', formData);
    setUploadingDoc(false);
    if (res.success) { alert('✅ Berhasil Diunggah!'); setDocFile(null); setTenantData({ ...tenantData, marriage_doc_url: res.path }); } 
    else { alert('Gagal mengunggah berkas: ' + res.error); }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!tenantData || !memberName || !memberBirth) return;
    const age = calculateAge(memberBirth);
    if (age >= 17 && !memberKtpFile) { alert(`Anggota berusia ${age} tahun (≥ 17 tahun) wajib foto KTP.`); return; }

    setSavingMember(true);
    const formData = new FormData();
    formData.append('household_id', tenantData.household_id || `HH-${Date.now()}`);
    formData.append('property_id', tenantData.property_id);
    formData.append('room_number', tenantData.room_number || '');
    formData.append('name', memberName); formData.append('phone', memberPhone); formData.append('birth_date', memberBirth); formData.append('relation', memberRelation);
    if (memberKtpFile) formData.append('ktp', memberKtpFile);

    const res = await addMemberSusulan(formData);
    setSavingMember(false);
    if (res.success && res.data) {
      setHousehold([...household, res.data]); setShowAddMemberModal(false);
      setMemberName(''); setMemberPhone(''); setMemberBirth(''); setMemberKtpFile(null);
      alert('✅ Berhasil! Anggota kamar susulan terdaftar di sistem.');
    } else { alert('Gagal menambah anggota: ' + res.error); }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (confirm(`Hapus anggota "${name}"?`)) { setHousehold(household.filter((m) => m.id !== memberId)); await deleteTenant(memberId); }
  };

  const isVerified = (tenantData?.status || '').toUpperCase() === 'VERIFIED';
  const property = tenantData?.properties;
  const isPaid = (tenantData?.payment_status || '').toUpperCase() === 'PAID';
  const paymentHistory = tenantData ? getThreeMonthHistory(tenantData.payment_status || '', tenantData.entry_date) : [];
  const isMarried = (tenantData?.marital_status || '').toLowerCase().includes('nikah');
  const hasMarriageDoc = !!(tenantData?.marriage_doc_url || tenantData?.kk_doc_url);

  return (
    <main style={{ fontSize: `${zoomPercent}%` }} className="min-h-screen bg-slate-50 p-3 md:p-8 text-slate-900 font-sans">
      <div className="max-w-xl mx-auto space-y-4">
        <header className="bg-emerald-800 text-white p-5 rounded-3xl shadow-xl flex justify-between items-center">
          <div><h1 className="text-[1.4rem] font-black text-white mt-1">Dasbor Warga</h1></div>
          <Link href="/" className="px-3.5 py-2 bg-emerald-950 text-white font-bold text-[0.75rem] rounded-2xl">🚪 Keluar</Link>
        </header>

        {!tenantData ? (
          <form onSubmit={handleLogin} className="bg-white p-6 rounded-3xl shadow-md border-2 border-slate-200 text-center space-y-4">
            <h2 className="text-[1.2rem] font-black text-slate-900">Masuk Portal Warga</h2>
            {errorMsg && <div className="p-3 text-red-700 bg-red-50 rounded-xl">{errorMsg}</div>}
            <input type="tel" required placeholder="08xxxxxxxxxx" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))} className="w-full p-3.5 border-2 rounded-2xl font-mono text-[1rem] font-bold bg-white text-left" />
            <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-700 text-white font-black rounded-2xl">{loading ? 'Memeriksa...' : 'Buka Dasbor Saya'}</button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className={`p-5 md:p-6 rounded-3xl border-2 ${isVerified ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
              <h3 className="text-[1.1rem] font-black mt-1">Status Kependudukan RT</h3>
              <p className="text-[0.8rem] font-medium">{isVerified ? 'Data Anda sah tercatat.' : 'Menunggu verifikasi RT.'}</p>
            </div>

            {isMarried && (
              <div className={`p-5 md:p-6 rounded-3xl border-2 space-y-3 ${hasMarriageDoc ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-400'}`}>
                <div className="flex justify-between items-center"><h3 className="font-black text-[0.95rem] uppercase">Dokumen Nikah / KK</h3><span className={`text-[0.65rem] font-black px-2.5 py-1 rounded-full ${hasMarriageDoc ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>{hasMarriageDoc ? 'TERLAMPIR' : 'BELUM DIUNGGAH'}</span></div>
                {!hasMarriageDoc ? (
                  <form onSubmit={handleUploadDoc} className="space-y-3 pt-1">
                    <input type="file" required accept="image/*,.pdf" onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2.5 border-2 border-amber-300 rounded-xl bg-white text-[0.75rem]" />
                    <button type="submit" disabled={uploadingDoc || !docFile} className="w-full py-3 bg-amber-800 text-white font-black rounded-xl shadow">{uploadingDoc ? 'Mengunggah...' : '📤 Unggah Buku Nikah / KK'}</button>
                  </form>
                ) : (<p className="text-[0.75rem] text-emerald-800 font-bold">✓ Berkas pernikahan telah tersimpan privat.</p>)}
              </div>
            )}

            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b-2 border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-[0.95rem] uppercase">🏠 Info Hunian & Kamar</h3>
                <button onClick={() => setShowAddMemberModal(true)} className="px-3.5 py-2 bg-emerald-700 text-white rounded-2xl text-[0.75rem] font-black shadow">➕ Tambah Anggota</button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-slate-800 font-medium text-[0.85rem]">
                <div><span className="text-[0.7rem] text-slate-400 font-bold block">NAMA PROPERTI</span><span className="font-black text-slate-900">{property?.name}</span></div>
                <div><span className="text-[0.7rem] text-slate-400 font-bold block">KAMAR</span><span className="font-black text-emerald-800">{tenantData.room_number || '-'}</span></div>
                <div><span className="text-[0.7rem] text-slate-400 font-bold block">TANGGAL MASUK</span><span className="font-mono font-bold text-slate-800">{tenantData.entry_date}</span></div>
                <div><span className="text-[0.7rem] text-slate-400 font-bold block">STATUS NIKAH</span><span className="font-bold text-slate-800">{tenantData.marital_status || '-'}</span></div>
              </div>

              <div className="pt-3 border-t-2 border-slate-100 space-y-2.5">
                <span className="text-[0.75rem] font-black text-slate-700 uppercase block">👥 Daftar Anggota Kamar Ini:</span>
                <div className="space-y-2">
                  {household.map((m, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border-2 flex justify-between items-center text-[0.8rem]">
                      <div><span className="font-black text-[0.85rem]">{m.name}</span><div className="text-[0.7rem] text-emerald-800 font-bold mt-0.5">Hubungan: {m.relation}</div></div>
                      <div className="flex items-center gap-2"><span className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-lg border ${m.is_head ? 'bg-amber-100 text-amber-900' : 'bg-white'}`}>{m.is_head ? 'Penanggung Jawab' : 'Anggota'}</span>{!m.is_head && (<button onClick={() => handleDeleteMember(m.id, m.name)} className="text-red-600 font-bold text-[0.75rem]">✕ Hapus</button>)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b-2 pb-2">
                <h3 className="font-black text-slate-900 text-[0.9rem] uppercase">💳 Tagihan Sewa</h3>
                <span className={`px-3 py-1 rounded-full font-black text-[0.75rem] ${isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{isPaid ? 'LUNAS' : 'BELUM DIBAYAR'}</span>
              </div>
              <div className="flex justify-between items-baseline py-1">
                <span className="text-slate-600 font-bold">Nominal Sewa:</span>
                <span className="text-[1.3rem] font-black text-slate-900">Rp {Number(tenantData.rent_price || 0).toLocaleString('id-ID')}</span>
              </div>

              <div className="pt-3 border-t-2 space-y-2.5">
                <span className="text-[0.75rem] font-black text-slate-700 uppercase block">📊 Riwayat Sewa (3 Bulan Terakhir):</span>
                <div className="grid grid-cols-3 gap-2">
                  {paymentHistory.map((item, idx) => (
                    <div key={idx} className={`p-2.5 rounded-2xl border text-center space-y-1 ${item.status === 'N/A' ? 'bg-slate-50 border-slate-200 text-slate-400' : item.status === 'PAID' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-red-50 border-red-300 text-red-950'}`}>
                      <span className="text-[0.65rem] font-bold block truncate">{item.labelLong}</span>
                      <span className={`text-[0.7rem] font-black px-2 py-0.5 rounded-full inline-block ${item.status === 'N/A' ? 'bg-slate-200 text-slate-600' : item.status === 'PAID' ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}>
                        {item.status === 'N/A' ? 'BELUM MASUK' : item.status === 'PAID' ? '✓ LUNAS' : '✗ BELUM BAYAR'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-center pt-3"><button onClick={() => { setTenantData(null); setPhoneInput(''); }} className="text-[0.8rem] text-slate-600 font-bold">Ganti Nomor WhatsApp Lain</button></div>
          </div>
        )}
      </div>

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border-2">
            <div className="p-4 bg-emerald-800 text-white flex justify-between"><h3 className="font-black text-[0.85rem]">➕ Tambah Anggota</h3><button onClick={() => setShowAddMemberModal(false)}>✕</button></div>
            <form onSubmit={handleAddMemberSubmit} className="p-5 space-y-3">
              <input type="text" required placeholder="Nama Lengkap" value={memberName} onChange={(e) => setMemberName(e.target.value)} className="w-full p-2.5 border-2 rounded-xl" />
              <input type="date" required value={memberBirth} onChange={(e) => setMemberBirth(e.target.value)} className="w-full p-2.5 border-2 rounded-xl" />
              <select value={memberRelation} onChange={(e) => setMemberRelation(e.target.value)} className="w-full p-2.5 border-2 rounded-xl">
                <option value="Istri">Istri</option><option value="Suami">Suami</option><option value="Anak">Anak</option><option value="Saudara">Saudara</option>
              </select>
              <input type="tel" placeholder="08xxxxxxxx (Opsional)" value={memberPhone} onChange={(e) => setMemberPhone(e.target.value.replace(/\D/g, ''))} className="w-full p-2.5 border-2 rounded-xl" />
              <button type="submit" disabled={savingMember} className="w-full py-3 bg-emerald-700 text-white font-black rounded-xl">Daftarkan Anggota</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
