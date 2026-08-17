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
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) ? 0 : age;
}

export default function TenantPortalPage() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);
  const [household, setHousehold] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showRulesAccordion, setShowRulesAccordion] = useState(false);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberBirth, setMemberBirth] = useState('');
  const [memberRelation, setMemberRelation] = useState('Istri');
  const [memberKtpFile, setMemberKtpFile] = useState<File | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

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
      setErrorMsg(res.error || 'Nomor WhatsApp tidak ditemukan dalam buku register warga RT.');
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
      alert('✅ Berhasil Diunggah!\n\nDokumen Buku Nikah / KK Anda telah tersimpan dan diteruskan ke Pengurus RT untuk proses verifikasi.');
      setDocFile(null);
      setTenantData({ ...tenantData, marriage_doc_url: res.path });
    } else {
      alert('Gagal mengunggah berkas: ' + res.error);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantData || !memberName || !memberBirth) return;

    const age = calculateAge(memberBirth);
    if (age >= 17 && !memberKtpFile) {
      alert(`Anggota berusia ${age} tahun (≥ 17 tahun) wajib melampirkan foto KTP.`);
      return;
    }

    setSavingMember(true);
    const formData = new FormData();
    formData.append('household_id', tenantData.household_id || `HH-${Date.now()}`);
    formData.append('property_id', tenantData.property_id);
    formData.append('room_number', tenantData.room_number || '');
    formData.append('name', memberName);
    formData.append('phone', memberPhone);
    formData.append('birth_date', memberBirth);
    formData.append('relation', memberRelation);
    if (memberKtpFile) formData.append('ktp', memberKtpFile);

    const res = await addMemberSusulan(formData);
    setSavingMember(false);

    if (res.success && res.data) {
      setHousehold([...household, res.data]);
      setShowAddMemberModal(false);
      setMemberName('');
      setMemberPhone('');
      setMemberBirth('');
      setMemberKtpFile(null);
      alert('✅ Berhasil! Anggota kamar susulan telah terdaftar di sistem RT.');
    } else {
      alert('Gagal menambah anggota: ' + res.error);
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (confirm(`Hapus anggota "${name}" dari daftar kamar Anda?`)) {
      setHousehold(household.filter((m) => m.id !== memberId));
      await deleteTenant(memberId);
      alert(`Anggota "${name}" berhasil dihapus.`);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyMsg(`${label} berhasil disalin ke clipboard!`);
    setTimeout(() => setCopyMsg(''), 3000);
  };

  const getThreeMonthsHistory = () => {
    const today = new Date();
    const months = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const isCurrent = i === 0;
      const isPaid = isCurrent ? (tenantData?.payment_status || '').toUpperCase() === 'PAID' : true;
      months.push({
        name: monthName,
        isCurrent,
        isPaid,
        amount: tenantData?.rent_price || 0,
      });
    }
    return months;
  };

  const isVerified = (tenantData?.status || '').toUpperCase() === 'VERIFIED';
  const property = tenantData?.properties;
  const isPaid = (tenantData?.payment_status || '').toUpperCase() === 'PAID';
  const paymentHistory = tenantData ? getThreeMonthsHistory() : [];
  
  // Deteksi status nikah secara fleksibel
  const isMarried = (tenantData?.marital_status || '').toLowerCase().includes('nikah');
  const hasMarriageDoc = !!(tenantData?.marriage_doc_url || tenantData?.kk_doc_url);

  const memberAgeCalculated = calculateAge(memberBirth);
  const isAdultMember = memberAgeCalculated >= 17 && memberBirth !== '';

  return (
    <main
      style={{ fontSize: `${zoomPercent}%` }}
      className="min-h-screen bg-slate-50 p-3 md:p-8 text-slate-900 transition-all font-sans"
    >
      <div className="max-w-xl mx-auto space-y-4">

        {/* HEADER */}
        <header className="bg-emerald-800 text-white p-5 md:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <span className="text-[0.75rem] font-extrabold px-3 py-1 bg-amber-400 text-slate-950 rounded-full uppercase">
              PORTAL MANDIRI PENGHUNI
            </span>
            <h1 className="text-[1.4rem] font-black text-white mt-1">Dasbor Warga Pendatang</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1.5 shadow-inner">
              <span className="text-[0.75rem] font-bold text-emerald-300 px-1 flex items-center">T↕</span>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Kecilkan Teks"
                className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
              >
                A-
              </button>
              <span className="text-[0.7rem] font-mono font-black text-amber-300 px-1">
                {zoomPercent}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Perbesar Teks"
                className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
              >
                A+
              </button>
            </div>

            <Link href="/" className="px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-[0.75rem] rounded-2xl border border-emerald-700">
              🚪 Keluar
            </Link>
          </div>
        </header>

        {copyMsg && (
          <div className="p-3.5 bg-emerald-100 text-emerald-900 border-2 border-emerald-300 rounded-2xl text-[0.85rem] font-bold text-center">
            {copyMsg}
          </div>
        )}

        {!tenantData ? (
          /* FORM LOGIN */
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border-2 border-slate-200 space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-3xl flex items-center justify-center text-[1.8rem] mx-auto shadow-inner">
              📱
            </div>
            <div>
              <h2 className="text-[1.2rem] font-black text-slate-900">Masuk Portal Warga</h2>
              <p className="text-[0.8rem] text-slate-500 mt-1">
                Gunakan nomor WhatsApp yang Anda daftarkan saat lapor diri di RT.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl text-[0.8rem] font-bold leading-relaxed">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-[0.85rem] font-bold text-slate-800 mb-1">Nomor WhatsApp Anda *</label>
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-3.5 border-2 border-slate-200 focus:border-emerald-600 rounded-2xl outline-none font-mono text-[1rem] font-bold bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !phoneInput}
                className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[0.95rem] rounded-2xl transition-all shadow-md disabled:bg-slate-300 cursor-pointer"
              >
                {loading ? 'Memeriksa Data RT...' : 'Buka Dasbor Saya →'}
              </button>
            </form>
          </div>
        ) : (
          /* DASBOR WARGA */
          <div className="space-y-4">

            {/* 1. STATUS KEPENDUDUKAN RT */}
            <div className={`p-5 md:p-6 rounded-3xl shadow-sm border-2 flex items-center justify-between ${
              isVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="space-y-1">
                <span className={`text-[0.7rem] font-black px-3 py-1 rounded-full uppercase ${
                  isVerified ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {isVerified ? '✅ RESMI TERVERIFIKASI RT' : '⚠️ MENUNGGU VERIFIKASI RT'}
                </span>
                <h3 className="text-[1.1rem] font-black mt-1">Status Kependudukan RT</h3>
                <p className="text-[0.8rem] text-slate-700 font-medium">
                  {isVerified ? 'Data Anda sah tercatat di buku register RT setempat.' : 'Data Anda sedang dalam proses peninjauan Pengurus RT.'}
                </p>
              </div>
            </div>

            {/* 2. KARTU UPLOAD DOKUMEN BUKU NIKAH / KK */}
            {isMarried && (
              <div className={`p-5 md:p-6 rounded-3xl border-2 space-y-3 ${
                hasMarriageDoc ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-400 text-amber-950 shadow-md'
              }`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{hasMarriageDoc ? '✅' : '📎'}</span>
                    <h3 className="font-black text-[0.95rem] uppercase">
                      Dokumen Buku Nikah / Kartu Keluarga (KK)
                    </h3>
                  </div>
                  <span className={`text-[0.65rem] font-black px-2.5 py-1 rounded-full uppercase ${
                    hasMarriageDoc ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900 border border-amber-300'
                  }`}>
                    {hasMarriageDoc ? 'TERLAMPIR' : 'BELUM DIUNGGAH'}
                  </span>
                </div>

                {!hasMarriageDoc ? (
                  <form onSubmit={handleUploadDoc} className="space-y-3 pt-1">
                    <p className="text-[0.75rem] text-amber-900 font-medium leading-relaxed">
                      Sesuai aturan RT untuk pasangan suami-istri, mohon lampirkan foto Buku Nikah atau Kartu Keluarga agar status verifikasi RT tuntas.
                    </p>
                    <input
                      type="file"
                      required
                      accept="image/*,.pdf"
                      onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full p-2.5 border-2 border-amber-300 rounded-xl bg-white text-[0.75rem] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[0.75rem] file:font-bold file:bg-amber-900 file:text-white cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={uploadingDoc || !docFile}
                      className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-black text-[0.8rem] rounded-xl transition-all disabled:bg-slate-300 cursor-pointer shadow"
                    >
                      {uploadingDoc ? 'Mengunggah Berkas...' : '📤 Unggah Buku Nikah / KK Sekarang'}
                    </button>
                  </form>
                ) : (
                  <p className="text-[0.75rem] text-emerald-800 font-bold">
                    ✓ Berkas pernikahan telah tersimpan privat dan siap ditinjau oleh Pengurus RT.
                  </p>
                )}
              </div>
            )}

            {/* 3. INFO HUNIAN & DAFTAR ANGGOTA */}
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b-2 border-slate-100 pb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-[0.95rem] uppercase">
                    🏠 Informasi Hunian & Kamar
                  </h3>
                  <p className="text-[0.75rem] text-slate-500">Penanggung Jawab: <b className="text-slate-900">{tenantData.name}</b></p>
                </div>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-[0.75rem] font-black shadow cursor-pointer"
                >
                  ➕ Tambah Anggota
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-slate-800 font-medium">
                <div>
                  <span className="text-[0.7rem] text-slate-400 block font-bold uppercase">NAMA PROPERTI</span>
                  <span className="font-black text-slate-900 text-[1rem]">{property?.name || property?.property_name}</span>
                </div>
                <div>
                  <span className="text-[0.7rem] text-slate-400 block font-bold uppercase">NOMOR / LOKASI KAMAR</span>
                  <span className="font-black text-emerald-800 text-[1rem]">{tenantData.room_number || '-'}</span>
                </div>
                <div>
                  <span className="text-[0.7rem] text-slate-400 block font-bold uppercase">TANGGAL MASUK</span>
                  <span className="font-mono font-bold text-slate-800">{tenantData.entry_date}</span>
                </div>
                <div>
                  <span className="text-[0.7rem] text-slate-400 block font-bold uppercase">STATUS PERNIKAHAN</span>
                  <span className="font-bold text-slate-800">{tenantData.marital_status || 'Belum Menikah'}</span>
                </div>
              </div>

              {/* LIST ANGGOTA SEKELUARGA */}
              <div className="pt-3 border-t-2 border-slate-100 space-y-2.5">
                <span className="text-[0.75rem] font-black text-slate-700 uppercase block">
                  👥 Daftar Anggota Kamar Ini ({household.length} Orang):
                </span>

                <div className="space-y-2">
                  {household.map((m, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border-2 border-slate-200 flex justify-between items-center text-[0.8rem]">
                      <div>
                        <span className="font-black text-slate-900 text-[0.85rem]">{m.name}</span>
                        <div className="flex items-center gap-2 text-[0.7rem] text-slate-600 mt-0.5">
                          <span className="font-bold text-emerald-800">Hubungan: {m.relation}</span>
                          {m.phone && <span>• {m.phone}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[0.65rem] font-bold px-2.5 py-1 rounded-lg border ${
                          m.is_head ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white text-slate-700 border-slate-300'
                        }`}>
                          {m.is_head ? 'Penanggung Jawab' : 'Anggota'}
                        </span>
                        {!m.is_head && (
                          <button
                            onClick={() => handleDeleteMember(m.id, m.name)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg font-bold text-[0.75rem] cursor-pointer"
                            title="Hapus Anggota"
                          >
                            ✕ Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. TAGIHAN SEWA & REKENING PEMILIK */}
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b-2 border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-[0.9rem] uppercase">
                  💳 Tagihan Sewa Kamar Ini
                </h3>
                <span className={`text-[0.75rem] font-black px-3 py-1 rounded-full uppercase ${
                  isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isPaid ? 'LUNAS' : 'BELUM DIBAYAR'}
                </span>
              </div>

              <div className="flex justify-between items-baseline py-1">
                <span className="text-slate-600 font-bold">Nominal Sewa Kamar:</span>
                <span className="text-[1.3rem] font-black text-slate-900">
                  Rp {Number(tenantData.rent_price || 0).toLocaleString('id-ID')}
                </span>
              </div>

              {property?.bank_account_number && (
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-2">
                  <span className="text-[0.7rem] font-extrabold text-slate-500 uppercase block">REKENING RESMI PEMILIK:</span>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-900 text-[1rem]">{property.bank_name} - {property.bank_account_number}</p>
                      <p className="text-[0.8rem] text-slate-600 font-semibold">a.n. {property.bank_account_holder}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(property.bank_account_number, 'Nomor Rekening')}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-[0.75rem] hover:bg-slate-800 shadow cursor-pointer"
                    >
                      📋 Salin Rek
                    </button>
                  </div>
                </div>
              )}

              {/* RIWAYAT 3 BULAN */}
              <div className="pt-3 border-t-2 border-slate-100 space-y-2.5">
                <span className="text-[0.75rem] font-black text-slate-700 uppercase block">
                  📊 Riwayat Status Sewa (3 Bulan Terakhir):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {paymentHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-2xl border text-center space-y-1 ${
                        item.isPaid
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : 'bg-red-50 border-red-300 text-red-950'
                      }`}
                    >
                      <span className="text-[0.65rem] font-bold text-slate-600 block truncate">
                        {item.name}
                      </span>
                      <span className={`text-[0.7rem] font-black px-2 py-0.5 rounded-full inline-block ${
                        item.isPaid ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                      }`}>
                        {item.isPaid ? '✓ LUNAS' : '✗ BELUM'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. TATA TERTIB */}
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-3">
              <button
                type="button"
                onClick={() => setShowRulesAccordion(!showRulesAccordion)}
                className="w-full flex justify-between items-center text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[1.1rem]">📜</span>
                  <h3 className="font-black text-slate-900 text-[0.9rem] uppercase">
                    Tata Tertib Hunian & Lingkungan RT
                  </h3>
                </div>
                <span className="text-slate-500 font-black text-[1rem]">
                  {showRulesAccordion ? '▲' : '▼'}
                </span>
              </button>

              {showRulesAccordion && (
                <div className="pt-3 border-t-2 border-slate-100 space-y-2 text-slate-700">
                  <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-mono text-[0.8rem] leading-relaxed whitespace-pre-line font-medium">
                    {property?.house_rules || (
                      `1. Wajib lapor diri 1x24 jam kependudukan RT setempat.
2. Menjaga ketertiban, ketenangan, dan kebersihan lingkungan RT.
3. Dilarang membawa barang terlarang (narkoba, miras, senjata tajam).
4. Jam bertamu maksimal pukul 22.00 WIB demi keamanan lingkungan.`
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 6. TOMBOL AKSI CEPAT */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {property?.manager_phone ? (
                <a
                  href={`https://wa.me/${property.manager_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-center block shadow text-[0.85rem]"
                >
                  💬 Chat Pengelola
                </a>
              ) : (
                <div className="p-3.5 bg-slate-200 text-slate-500 rounded-2xl font-bold text-center text-[0.8rem]">Pengelola -</div>
              )}

              <button
                type="button"
                onClick={() => setShowEmergencyModal(true)}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-center shadow text-[0.85rem] cursor-pointer"
              >
                🛡️ Bantuan RT & Darurat
              </button>
            </div>

            <div className="text-center pt-3">
              <button
                onClick={() => { setTenantData(null); setPhoneInput(''); }}
                className="text-[0.8rem] text-slate-600 hover:underline font-bold cursor-pointer"
              >
                Ganti Nomor WhatsApp Lain
              </button>
            </div>

          </div>
        )}

      </div>

      {/* MODAL TAMBAH ANGGOTA */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
              <h3 className="text-[0.9rem] font-black">➕ Daftarkan Anggota Kamar Susulan</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-white hover:text-amber-300 font-bold text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="p-5 space-y-3 text-[0.8rem]">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Nama Lengkap Anggota *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Tanggal Lahir *</label>
                  <input
                    type="date"
                    required
                    value={memberBirth}
                    onChange={(e) => setMemberBirth(e.target.value)}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Hubungan *</label>
                  <select
                    value={memberRelation}
                    onChange={(e) => setMemberRelation(e.target.value)}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
                  >
                    <option value="Istri">Istri</option>
                    <option value="Suami">Suami</option>
                    <option value="Anak">Anak</option>
                    <option value="Saudara">Saudara</option>
                    <option value="Rekan / Teman">Rekan / Teman</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Nomor WhatsApp (Opsional)</label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-mono"
                />
              </div>

              {isAdultMember && (
                <div className="bg-emerald-50 p-3 rounded-xl border-2 border-emerald-200 space-y-1">
                  <label className="block font-black text-emerald-950 text-[0.75rem]">
                    🪪 Foto KTP Anggota (Wajib karena usia {memberAgeCalculated} tahun ≥ 17 Tahun) *
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => setMemberKtpFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full p-2 border-2 border-emerald-300 rounded-xl bg-white text-[0.7rem] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[0.7rem] file:font-bold file:bg-emerald-900 file:text-white"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl shadow cursor-pointer"
                >
                  {savingMember ? 'Menyimpan...' : 'Daftarkan Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DARURAT */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border-2 border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[1.2rem]">🛡️🚨</span>
                <h3 className="text-[0.95rem] font-black">Kontak Darurat Lingkungan</h3>
              </div>
              <button onClick={() => setShowEmergencyModal(false)} className="text-white hover:text-amber-300 font-bold text-xl leading-none cursor-pointer">✕</button>
            </div>

            <div className="p-5 space-y-3 text-[0.8rem]">
              <div className="bg-red-50 p-3.5 rounded-2xl border border-red-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-red-950 text-[0.85rem]">🚒 Pemadam Kebakaran</h4>
                  <p className="text-[0.7rem] text-red-800">Darurat kebakaran & evakuasi</p>
                </div>
                <a href="tel:113" className="px-3 py-1.5 bg-red-700 text-white rounded-xl font-bold text-[0.75rem] shadow">📞 113</a>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-blue-950 text-[0.85rem]">🚓 Kepolisian RI</h4>
                  <p className="text-[0.7rem] text-blue-800">Kamtibmas & tindak pidana</p>
                </div>
                <a href="tel:110" className="px-3 py-1.5 bg-blue-700 text-white rounded-xl font-bold text-[0.75rem] shadow">📞 110</a>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-emerald-950 text-[0.85rem]">🚑 Ambulans / Medis</h4>
                  <p className="text-[0.7rem] text-emerald-800">Pertolongan gawat darurat</p>
                </div>
                <a href="tel:119" className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl font-bold text-[0.75rem] shadow">📞 119</a>
              </div>

              <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-slate-900 text-[0.85rem]">👮 Pos Hansip / Satpam RT</h4>
                  <p className="text-[0.7rem] text-slate-600">Pelayanan lingkungan 24 Jam</p>
                </div>
                <a href="tel:081299887766" className="px-3 py-1.5 bg-slate-800 text-white rounded-xl font-bold text-[0.75rem] shadow">📞 Telepon</a>
              </div>
            </div>

            <div className="p-3 bg-slate-50 text-right border-t">
              <button onClick={() => setShowEmergencyModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 text-[0.75rem] font-bold rounded-xl cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
