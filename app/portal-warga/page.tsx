'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getTenantPortalData, uploadPendingDocument, addMemberSusulan, deleteTenant } from '../../src/actions/checkin-tenant';

function calculateAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const today = new Date(); const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
  return isNaN(age) ? 0 : age;
}

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
  const [phoneInput, setPhoneInput] = useState('');
  const [authFactorInput, setAuthFactorInput] = useState(''); // 2FA (Tahun Lahir)
  const [loading, setLoading] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);
  const [household, setHousehold] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showRulesAccordion, setShowRulesAccordion] = useState(false);

  // Form member
  const [memberName, setMemberName] = useState(''); const [memberPhone, setMemberPhone] = useState('');
  const [memberBirth, setMemberBirth] = useState(''); const [memberRelation, setMemberRelation] = useState('Istri');
  const [memberKtpFile, setMemberKtpFile] = useState<File | null>(null); const [savingMember, setSavingMember] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); if (!phoneInput || !authFactorInput) return;
    setLoading(true); setErrorMsg('');
    const res = await getTenantPortalData(phoneInput);
    setLoading(false);
    if (res.success && res.tenant) { 
      // VERIFIKASI 2FA TAHUN LAHIR
      const realBirthYear = res.tenant.birth_date ? res.tenant.birth_date.substring(0,4) : '';
      if (realBirthYear && authFactorInput !== realBirthYear) {
        setErrorMsg('Otorisasi Gagal: Tahun Lahir (PIN) tidak sesuai data terdaftar.');
        return;
      }
      setTenantData(res.tenant); setHousehold(res.household || []); 
    } 
    else { setErrorMsg(res.error || 'Nomor WhatsApp tidak terdaftar di sistem.'); }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault(); if (!docFile || !tenantData) return;
    setUploadingDoc(true); const formData = new FormData(); formData.append('file', docFile);
    const res = await uploadPendingDocument(tenantData.id, 'marriage', formData);
    setUploadingDoc(false);
    if (res.success) { alert('Berhasil diunggah!'); setDocFile(null); setTenantData({ ...tenantData, marriage_doc_url: res.path }); } 
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!tenantData) return; setSavingMember(true);
    const formData = new FormData(); formData.append('household_id', tenantData.household_id || `HH-${Date.now()}`); formData.append('property_id', tenantData.property_id); formData.append('room_number', tenantData.room_number || ''); formData.append('name', memberName); formData.append('phone', memberPhone); formData.append('birth_date', memberBirth); formData.append('relation', memberRelation); if (memberKtpFile) formData.append('ktp', memberKtpFile);
    const res = await addMemberSusulan(formData); setSavingMember(false);
    if (res.success && res.data) { setHousehold([...household, res.data]); setShowAddMemberModal(false); } 
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (confirm(`Hapus anggota "${name}"?`)) { setHousehold(household.filter((m) => m.id !== memberId)); await deleteTenant(memberId); }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyMsg(`${label} berhasil disalin!`);
    setTimeout(() => setCopyMsg(''), 3000);
  };

  const isVerified = (tenantData?.status || '').toUpperCase() === 'VERIFIED';
  const property = tenantData?.properties;
  const isPaid = (tenantData?.payment_status || '').toUpperCase() === 'PAID';
  const paymentHistory = tenantData ? getThreeMonthHistory(tenantData.payment_status || '', tenantData.entry_date) : [];
  const isMarried = (tenantData?.marital_status || '').toLowerCase().includes('nikah');
  const hasMarriageDoc = !!(tenantData?.marriage_doc_url || tenantData?.kk_doc_url);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans pb-20">
      <div className="max-w-xl mx-auto space-y-5">
        <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div><h1 className="text-lg font-black text-slate-900">Dasbor Warga Pendatang</h1></div>
          <Link href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors">🚪 Keluar</Link>
        </header>

        {copyMsg && (
          <div className="p-3.5 bg-emerald-100 text-emerald-900 border-2 border-emerald-300 rounded-2xl text-[0.85rem] font-bold text-center">
            {copyMsg}
          </div>
        )}

        {!tenantData ? (
          <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center space-y-5">
            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">🔒</div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Akses Portal Privat</h2>
              <p className="text-xs text-slate-500 mt-1">Masukkan data untuk verifikasi keamanan (2FA).</p>
            </div>
            {errorMsg && <div className="p-3 text-red-700 bg-red-50 rounded-xl text-sm font-bold">{errorMsg}</div>}
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp Terdaftar</label>
                <input type="tel" required placeholder="08xxxxxxxx" value={phoneInput} onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))} className="w-full p-3.5 border rounded-xl font-mono text-sm font-bold focus:border-slate-800 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Lahir Anda (PIN 4 Digit)</label>
                <input type="text" maxLength={4} required placeholder="Contoh: 1990" value={authFactorInput} onChange={e => setAuthFactorInput(e.target.value.replace(/\D/g, ''))} className="w-full p-3.5 border rounded-xl font-mono text-center tracking-widest text-lg font-black focus:border-slate-800 outline-none" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-md cursor-pointer transition-colors">{loading ? 'Memverifikasi...' : 'Buka Dasbor Saya'}</button>
          </form>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* STATUS RT CLEAN UI */}
            <div className={`p-5 bg-white shadow-sm rounded-2xl border-l-4 ${isVerified ? 'border-l-emerald-500 border-y border-r border-slate-200' : 'border-l-amber-500 border-y border-r border-slate-200'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Status Kependudukan RT</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{isVerified ? 'Data Anda telah diverifikasi oleh pengurus.' : 'Sedang dalam peninjauan pengurus.'}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {isVerified ? '✅ Resmi' : '⏳ Proses'}
                </span>
              </div>
            </div>

            {/* DOKUMEN NIKAH */}
            {isMarried && (
              <div className={`p-5 rounded-3xl border-2 space-y-3 ${hasMarriageDoc ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-400'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{hasMarriageDoc ? '✅' : '📎'}</span>
                    <h3 className="font-black text-sm text-slate-900 uppercase">Dokumen Nikah / KK</h3>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${hasMarriageDoc ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>{hasMarriageDoc ? 'TERLAMPIR' : 'BELUM DIUNGGAH'}</span>
                </div>
                {!hasMarriageDoc ? (
                  <form onSubmit={handleUploadDoc} className="space-y-3 pt-1">
                    <p className="text-xs text-amber-900 font-medium">Sesuai aturan RT, mohon lampirkan Buku Nikah / KK.</p>
                    <input type="file" required accept="image/*,.pdf" onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border-2 border-amber-300 rounded-xl bg-white text-xs" />
                    <button type="submit" disabled={uploadingDoc || !docFile} className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-black rounded-xl shadow cursor-pointer transition-colors">{uploadingDoc ? 'Mengunggah...' : '📤 Unggah Dokumen'}</button>
                  </form>
                ) : (<p className="text-xs text-emerald-800 font-bold">✓ Berkas pernikahan telah tersimpan privat.</p>)}
              </div>
            )}

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
               <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-slate-900 text-sm">💳 TAGIHAN SEWA KAMAR</h3>
                <span className={`px-3 py-1 rounded-md font-black text-xs ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{isPaid ? 'LUNAS' : 'BELUM DIBAYAR'}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500 text-sm font-bold">Bulan Ini:</span>
                <span className="text-2xl font-black text-slate-900">Rp {Number(tenantData.rent_price || 0).toLocaleString('id-ID')}</span>
              </div>

              {/* KOTAK REKENING PEMILIK */}
              {property?.bank_account_number && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mt-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">REKENING RESMI PEMILIK:</span>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{property.bank_name} - {property.bank_account_number}</p>
                      <p className="text-xs text-slate-600 font-semibold">a.n. {property.bank_account_holder}</p>
                    </div>
                    <button onClick={() => handleCopy(property.bank_account_number, 'Nomor Rekening')} className="px-3 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 shadow cursor-pointer transition-colors">
                      📋 Salin
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-3">
                <span className="text-xs font-black text-slate-400 uppercase">Riwayat Pembayaran (3 Bulan)</span>
                {/* LIST VIEW DI MOBILE (Flex-Col), GRID DI DESKTOP */}
                <div className="flex flex-col md:grid md:grid-cols-3 gap-2">
                  {paymentHistory.map((item, idx) => (
                    <div key={idx} className={`flex justify-between items-center md:flex-col md:justify-center p-3 rounded-xl border ${item.status === 'N/A' ? 'bg-slate-50 border-slate-200' : item.status === 'PAID' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <span className={`text-xs font-bold ${item.status === 'N/A' ? 'text-slate-500' : 'text-slate-900'}`}>{item.labelLong}</span>
                      <span className={`text-[10px] font-black px-2 py-1 rounded mt-0 md:mt-1 ${item.status === 'N/A' ? 'text-slate-400 bg-slate-200' : item.status === 'PAID' ? 'text-emerald-800 bg-emerald-200' : 'text-red-800 bg-red-200'}`}>
                        {item.status === 'N/A' ? 'BELUM MASUK' : item.status === 'PAID' ? '✓ LUNAS' : '✗ BELUM BAYAR'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* INFO HUNIAN & ANGGOTA */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase">🏠 Info Hunian & Kamar</h3>
                  <p className="text-xs text-slate-500 mt-1">P. Jawab: <b className="text-slate-900">{tenantData.name}</b></p>
                </div>
                <button onClick={() => setShowAddMemberModal(true)} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-colors">➕ Tambah Anggota</button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-slate-800 text-sm">
                <div><span className="text-[10px] text-slate-400 font-bold block">PROPERTI</span><span className="font-black">{property?.name}</span></div>
                <div><span className="text-[10px] text-slate-400 font-bold block">KAMAR</span><span className="font-black">{tenantData.room_number || '-'}</span></div>
                <div><span className="text-[10px] text-slate-400 font-bold block">TGL MASUK</span><span className="font-mono font-bold">{tenantData.entry_date}</span></div>
                <div><span className="text-[10px] text-slate-400 font-bold block">STATUS NIKAH</span><span className="font-bold">{tenantData.marital_status || '-'}</span></div>
              </div>
              <div className="pt-3 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Daftar Anggota Kamar:</span>
                {household.map((m, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-slate-900">{m.name}</span>
                      <div className="text-[10px] text-emerald-800 font-bold mt-0.5">Hubungan: {m.relation}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${m.is_head ? 'bg-amber-100 text-amber-900' : 'bg-white text-slate-600'}`}>{m.is_head ? 'PJ' : 'Anggota'}</span>
                      {!m.is_head && <button onClick={() => handleDeleteMember(m.id, m.name)} className="text-red-600 hover:underline font-bold text-xs cursor-pointer">Hapus</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOMBOL TATA TERTIB & DARURAT */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowRulesAccordion(!showRulesAccordion)} className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm font-bold text-sm flex flex-col items-center gap-2 cursor-pointer transition-colors"><span>📜</span>Tata Tertib</button>
              <button onClick={() => setShowEmergencyModal(true)} className="p-4 bg-red-600 hover:bg-red-700 text-white border border-red-800 rounded-2xl shadow-sm font-bold text-sm flex flex-col items-center gap-2 cursor-pointer transition-colors"><span>🚨</span>Darurat (Panic)</button>
            </div>
            
            {/* CHAT PENGELOLA */}
            {property?.manager_phone && (
              <a href={`https://wa.me/${property.manager_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-center block shadow text-sm transition-colors">
                💬 Chat Pengelola Kos
              </a>
            )}

            {showRulesAccordion && (
              <div className="p-5 bg-white border rounded-2xl shadow-sm font-mono text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                {property?.house_rules || `1. Wajib lapor diri 1x24 jam.\n2. Jaga kebersihan lingkungan.\n3. Dilarang membawa barang terlarang.\n4. Jam bertamu max 22.00 WIB.`}
              </div>
            )}

            <div className="text-center pt-6"><button onClick={() => {setTenantData(null); setPhoneInput(''); setAuthFactorInput('');}} className="text-xs text-slate-500 font-bold hover:underline cursor-pointer">Ganti Nomor WhatsApp (Keluar)</button></div>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH ANGGOTA */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border-2">
            <div className="p-4 bg-emerald-800 text-white flex justify-between"><h3 className="font-black text-sm">➕ Tambah Anggota</h3><button onClick={() => setShowAddMemberModal(false)} className="cursor-pointer font-bold text-lg">✕</button></div>
            <form onSubmit={handleAddMemberSubmit} className="p-5 space-y-3 text-sm">
              <input type="text" required placeholder="Nama Lengkap" value={memberName} onChange={(e) => setMemberName(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 font-bold" />
              <input type="date" required value={memberBirth} onChange={(e) => setMemberBirth(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" />
              <select value={memberRelation} onChange={(e) => setMemberRelation(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 font-bold">
                <option value="Istri">Istri</option><option value="Suami">Suami</option><option value="Anak">Anak</option><option value="Saudara">Saudara</option><option value="Rekan">Rekan</option>
              </select>
              <input type="tel" placeholder="08xxxxxxxx (Opsional)" value={memberPhone} onChange={(e) => setMemberPhone(e.target.value.replace(/\D/g, ''))} className="w-full p-3 border rounded-xl bg-slate-50 font-mono" />
              <button type="submit" disabled={savingMember} className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl shadow cursor-pointer transition-colors">Daftarkan Anggota</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DARURAT */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-50 p-4 pb-10">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-5 bg-red-600 text-white flex justify-between items-center"><div className="flex gap-2"><span className="text-xl animate-pulse">🆘</span><h3 className="font-black text-lg">Panggilan Darurat</h3></div><button onClick={()=>setShowEmergencyModal(false)} className="cursor-pointer text-xl font-bold">✕</button></div>
            <div className="p-5 space-y-3">
              <a href="tel:113" className="flex justify-between items-center p-4 bg-slate-50 hover:bg-red-50 border rounded-2xl transition-colors cursor-pointer"><div><h4 className="font-black text-slate-900 text-sm">Damkar</h4><p className="text-[10px] text-slate-500">Kebakaran</p></div><span className="text-red-600 font-black text-lg">113</span></a>
              <a href="tel:110" className="flex justify-between items-center p-4 bg-slate-50 hover:bg-blue-50 border rounded-2xl transition-colors cursor-pointer"><div><h4 className="font-black text-slate-900 text-sm">Polisi</h4><p className="text-[10px] text-slate-500">Kamtibmas</p></div><span className="text-blue-600 font-black text-lg">110</span></a>
              <a href="tel:119" className="flex justify-between items-center p-4 bg-slate-50 hover:bg-emerald-50 border rounded-2xl transition-colors cursor-pointer"><div><h4 className="font-black text-slate-900 text-sm">Ambulans</h4><p className="text-[10px] text-slate-500">Medis</p></div><span className="text-emerald-600 font-black text-lg">119</span></a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}