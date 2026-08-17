'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { submitMultiTenantsStrict } from '../../../src/actions/checkin-tenant';

interface Property {
  id: string;
  name: string;
  property_name?: string;
  type: string;
  slug: string;
  address?: string;
  house_rules?: string;
  total_rooms?: number;
}

export default function CheckinClientForm({ property }: { property: Property }) {
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Form States
  const [roomNumber, setRoomNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [maritalStatus, setMaritalStatus] = useState('Belum Menikah');
  const [occupation, setOccupation] = useState('');

  // Primary Tenant
  const [primaryName, setPrimaryName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryBirthDate, setPrimaryBirthDate] = useState('');
  const [primaryAddress, setPrimaryAddress] = useState('');
  const [ktpFile, setKtpFile] = useState<File | null>(null);

  // Documents
  const [marriageDoc, setMarriageDoc] = useState<File | null>(null);
  const [kkDoc, setKkDoc] = useState<File | null>(null);
  const [pendingDocLater, setPendingDocLater] = useState(false);

  // Additional Occupants
  const [occupants, setOccupants] = useState<any[]>([]);
  const [agreedRules, setAgreedRules] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  const handleAddOccupant = () => {
    setOccupants([
      ...occupants,
      {
        name: '',
        phone: '',
        birth_date: '',
        relation: 'Istri',
        marital_status: 'Belum Menikah',
        occupation: '',
        ktpFile: null,
      },
    ]);
  };

  const handleRemoveOccupant = (index: number) => {
    setOccupants(occupants.filter((_, idx) => idx !== index));
  };

  const handleOccupantChange = (index: number, field: string, value: any) => {
    const updated = [...occupants];
    updated[index][field] = value;
    setOccupants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryName || !primaryPhone || !roomNumber || !ktpFile || !agreedRules) {
      alert('Mohon lengkapi data wajib (Nama, WA, Kamar, Foto KTP, dan Persetujuan Tata Tertib).');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('property_id', property.id);
    formData.append('room_number', roomNumber);
    formData.append('entry_date', entryDate);
    formData.append('marital_status', maritalStatus);
    formData.append('occupation', occupation);
    formData.append('rent_price', '0');

    // Penanggung Jawab
    formData.append('name', primaryName);
    formData.append('phone', primaryPhone);
    formData.append('birth_date', primaryBirthDate);
    formData.append('address_ktp', primaryAddress);
    if (ktpFile) formData.append('ktp', ktpFile);

    // Dokumen Nikah / KK
    if (marriageDoc) formData.append('marriage_doc', marriageDoc);
    if (kkDoc) formData.append('kk_doc', kkDoc);

    // Anggota Sekamar
    const occupantList = [
      {
        name: primaryName,
        phone: primaryPhone,
        birth_date: primaryBirthDate,
        address_ktp: primaryAddress,
        relation: 'Penanggung Jawab',
        is_head: true,
        marital_status: maritalStatus,
        occupation,
      },
    ];

    occupants.forEach((occ, idx) => {
      occupantList.push({
        name: occ.name,
        phone: occ.phone || '',
        birth_date: occ.birth_date || '',
        address_ktp: primaryAddress,
        relation: occ.relation || 'Anggota',
        is_head: false,
        marital_status: occ.marital_status || 'Belum Menikah',
        occupation: occ.occupation || '',
      });

      if (occ.ktpFile) {
        formData.append(`member_ktp_${idx + 1}`, occ.ktpFile);
      }
    });

    formData.append('occupants', JSON.stringify(occupantList));

    const res = await submitMultiTenantsStrict(formData);
    setLoading(false);

    if (res && res.success) {
      setSuccessData({
        name: primaryName,
        room: roomNumber,
        phone: primaryPhone,
        property: property.name || property.property_name,
        household_id: res.household_id,
      });
    } else {
      setErrorMsg(res?.error || 'Gagal mengirim formulir pendaftaran. Silakan coba lagi.');
    }
  };

  const propNameStr = property.name || property.property_name;

  return (
    <main
      style={{ fontSize: `${zoomPercent}%` }}
      className="min-h-screen bg-slate-50 p-3 md:p-8 text-slate-900 transition-all font-sans"
    >
      <div className="max-w-xl mx-auto space-y-4">

        {/* HEADER CERAH */}
        <header className="bg-emerald-800 text-white p-5 md:p-6 rounded-3xl shadow-xl flex justify-between items-center">
          <div>
            <span className="text-[0.75rem] font-extrabold px-3 py-1 bg-amber-400 text-slate-950 rounded-full uppercase">
              LAPOR DIRI 1X24 JAM RT
            </span>
            <h1 className="text-[1.3rem] font-black text-white mt-1">{propNameStr}</h1>
            <p className="text-[0.75rem] text-emerald-100 font-medium">{property.address || 'Lingkungan RT Setempat'}</p>
          </div>

          <div className="bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1.5 shadow-inner">
            <span className="text-[0.75rem] font-bold text-emerald-300 px-1 flex items-center">T↕</span>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Kecilkan Teks"
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
              title="Perbesar Teks"
              className="px-2 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer"
            >
              A+
            </button>
          </div>
        </header>

        {successData ? (
          /* TAMPILAN BERHASIL CHECK-IN */
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border-2 border-emerald-300 space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-inner">
              ✅
            </div>
            <h2 className="text-[1.3rem] font-black text-slate-900">Lapor Diri Berhasil Terkirim!</h2>
            <p className="text-[0.8rem] text-slate-600 font-medium">
              Data pendaftaran Anda di unit <b>{successData.property}</b> ({successData.room}) telah diteruskan ke Pengurus RT untuk proses verifikasi kependudukan.
            </p>

            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-left space-y-1 text-[0.8rem]">
              <p>👤 <b>Penanggung Jawab:</b> {successData.name}</p>
              <p>📱 <b>No. WhatsApp:</b> {successData.phone}</p>
              <p>🏠 <b>Nomor Kamar:</b> {successData.room}</p>
            </div>

            <div className="pt-2">
              <Link
                href="/portal-warga"
                className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-2xl block shadow text-[0.85rem]"
              >
                Buka Portal Warga Mandiri →
              </Link>
            </div>
          </div>
        ) : (
          /* FORM PENDAFTARAN LENGKAP */
          <form onSubmit={handleSubmit} className="bg-white p-5 md:p-7 rounded-3xl shadow-md border-2 border-slate-200 space-y-4 text-[0.8rem]">
            {errorMsg && (
              <div className="p-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl font-bold text-center">
                {errorMsg}
              </div>
            )}

            <div className="border-b pb-2">
              <h2 className="text-[0.95rem] font-black text-slate-900 uppercase">
                1. Data Kamar & Penanggung Jawab
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Nomor / Posisi Kamar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kamar 03"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold text-emerald-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Tanggal Mulai Menempati *</label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Nama Lengkap Penanggung Jawab *</label>
              <input
                type="text"
                required
                placeholder="Sesuai KTP"
                value={primaryName}
                onChange={(e) => setPrimaryName(e.target.value)}
                className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">No. WhatsApp Aktif *</label>
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Tanggal Lahir *</label>
                <input
                  type="date"
                  required
                  value={primaryBirthDate}
                  onChange={(e) => setPrimaryBirthDate(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Status Pernikahan *</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white font-bold"
                >
                  <option value="Belum Menikah">Belum Menikah (Lajang)</option>
                  <option value="Menikah">Menikah (Pasutri)</option>
                  <option value="Cerai Hidup">Cerai Hidup</option>
                  <option value="Cerai Mati">Cerai Mati</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Pekerjaan / Profesi</label>
                <input
                  type="text"
                  placeholder="Karyawan / Mahasiswa"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Alamat Asal KTP</label>
              <input
                type="text"
                placeholder="Kabupaten / Kota Asal"
                value={primaryAddress}
                onChange={(e) => setPrimaryAddress(e.target.value)}
                className="w-full p-2.5 border-2 border-slate-200 rounded-xl bg-white"
              />
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-2xl border-2 border-emerald-200 space-y-1.5">
              <label className="block font-black text-emerald-950 text-[0.8rem]">
                🪪 Foto KTP Penanggung Jawab (UU PDP) *
              </label>
              <input
                type="file"
                required
                accept="image/*"
                onChange={(e) => setKtpFile(e.target.files ? e.target.files[0] : null)}
                className="w-full p-2 border-2 border-emerald-300 rounded-xl bg-white text-[0.75rem] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[0.75rem] file:font-bold file:bg-emerald-900 file:text-white cursor-pointer"
              />
              <p className="text-[0.7rem] text-emerald-800 font-medium">Dokumen dilindungi secara privat dan hanya dapat dibuka oleh Pengurus RT.</p>
            </div>

            {/* DOKUMEN BUKU NIKAH JIKA STATUS MENIKAH */}
            {maritalStatus === 'Menikah' && (
              <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-300 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-black text-amber-950 text-[0.8rem]">
                    📎 Lampiran Buku Nikah / Kartu Keluarga (KK)
                  </label>
                  <label className="flex items-center gap-1.5 text-[0.75rem] font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pendingDocLater}
                      onChange={(e) => setPendingDocLater(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600"
                    />
                    Unggah Menyusul
                  </label>
                </div>

                {!pendingDocLater ? (
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setMarriageDoc(e.target.files ? e.target.files[0] : null)}
                    className="w-full p-2 border-2 border-amber-200 rounded-xl bg-white text-[0.75rem] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[0.75rem] file:font-bold file:bg-amber-900 file:text-white cursor-pointer"
                  />
                ) : (
                  <p className="text-[0.7rem] text-amber-800 italic font-medium">
                    ⚠️ Anda dapat mengunggah berkas ini nanti melalui menu Portal Warga.
                  </p>
                )}
              </div>
            )}

            {/* 2. ANGGOTA SEKAMAR */}
            <div className="pt-2 border-t space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[0.95rem] font-black text-slate-900 uppercase">
                    2. Anggota Keluarga / Teman Sekamar
                  </h3>
                  <p className="text-[0.7rem] text-slate-500 font-medium">Tambahkan jika tinggal bersama istri, anak, atau rekan.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddOccupant}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-[0.75rem] cursor-pointer"
                >
                  ➕ Tambah Anggota
                </button>
              </div>

              {occupants.map((occ, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900 text-[0.8rem]">Anggota #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOccupant(idx)}
                      className="text-red-600 font-bold text-[0.75rem] hover:underline cursor-pointer"
                    >
                      ✕ Hapus
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nama Anggota"
                      value={occ.name}
                      onChange={(e) => handleOccupantChange(idx, 'name', e.target.value)}
                      className="p-2 border-2 border-slate-200 rounded-xl bg-white font-bold"
                    />
                    <select
                      value={occ.relation}
                      onChange={(e) => handleOccupantChange(idx, 'relation', e.target.value)}
                      className="p-2 border-2 border-slate-200 rounded-xl bg-white font-bold"
                    >
                      <option value="Istri">Istri</option>
                      <option value="Suami">Suami</option>
                      <option value="Anak">Anak</option>
                      <option value="Saudara">Saudara</option>
                      <option value="Rekan / Teman">Rekan / Teman</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. TATA TERTIB */}
            <div className="pt-2 border-t space-y-2">
              <h3 className="text-[0.95rem] font-black text-slate-900 uppercase">
                3. Tata Tertib Hunian & Lingkungan RT
              </h3>
              <div className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[0.75rem] leading-relaxed whitespace-pre-line font-mono text-slate-700">
                {property.house_rules || (
                  `1. Wajib lapor diri 1x24 jam kependudukan RT setempat.
2. Menjaga ketertiban, ketenangan, dan kebersihan lingkungan RT.
3. Dilarang membawa barang terlarang (narkoba, miras, senjata tajam).
4. Jam bertamu maksimal pukul 22.00 WIB demi keamanan lingkungan.`
                )}
              </div>

              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreedRules}
                  onChange={(e) => setAgreedRules(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded text-emerald-700 cursor-pointer"
                />
                <span className="text-[0.75rem] font-bold text-slate-800 leading-tight">
                  Saya menyatakan data di atas adalah benar dan menyetujui seluruh tata tertib lingkungan RT setempat.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreedRules}
              className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[0.95rem] rounded-2xl transition-all shadow-md disabled:bg-slate-300 cursor-pointer"
            >
              {loading ? 'Mengirim Formulir...' : 'Kirim Pendaftaran Lapor Diri RT →'}
            </button>
          </form>
        )}

      </div>
    </main>
  );
}
