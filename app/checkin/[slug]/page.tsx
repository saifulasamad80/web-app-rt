'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { submitMultiTenantsStrict, getPropertyRules } from '../../../src/actions/checkin-tenant';

interface OccupantInput {
  name: string;
  birth_date: string;
  relation: string;
  phone: string;
  address: string;
}

export default function CheckinPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [loadingProp, setLoadingProp] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // SEKSI 1: Lokasi & Kontak Utama
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [addressKtp, setAddressKtp] = useState('');

  // SEKSI 2: Penanggung Jawab
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [occupation, setOccupation] = useState('Karyawan Swasta');
  const [maritalStatus, setMaritalStatus] = useState('Belum Menikah');
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [marriageDocFile, setMarriageDocFile] = useState<File | null>(null);
  const [docPendingLater, setDocPendingLater] = useState(false);

  // SEKSI 3: Anggota Tambahan
  const [hasMembers, setHasMembers] = useState(false);
  const [occupants, setOccupants] = useState<OccupantInput[]>([]);

  // SEKSI 4: Persetujuan
  const [agreeRules, setAgreeRules] = useState(false);
  const [agreePDP, setAgreePDP] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoadingProp(true);
      const res = await getPropertyRules(slug);
      if (res.success && res.property) {
        setProperty(res.property);
      } else {
        setErrorMsg('Tautan lapor diri tidak ditemukan atau properti belum terdaftar.');
      }
      setLoadingProp(false);
    }
    load();
  }, [slug]);

  const handleAddOccupant = () => {
    setOccupants([
      ...occupants,
      { name: '', birth_date: '', relation: 'Anggota / Rekan', phone: '', address: '' }
    ]);
  };

  const handleRemoveOccupant = (index: number) => {
    setOccupants(occupants.filter((_, i) => i !== index));
  };

  const handleOccupantChange = (index: number, field: keyof OccupantInput, val: string) => {
    setOccupants(occupants.map((occ, i) => (i === index ? { ...occ, [field]: val } : occ)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeRules || !agreePDP) {
      alert('Anda wajib menyetujui Tata Tertib Hunian dan Ketentuan UU PDP.');
      return;
    }

    if (!phone || !roomNumber || !name || !addressKtp) {
      alert('Mohon lengkapi seluruh kolom wajib pada Seksi 1 dan Seksi 2.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('property_id', property.id);
    formData.append('room_number', roomNumber);
    formData.append('entry_date', entryDate);
    formData.append('address_ktp', addressKtp);

    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('birth_date', birthDate);
    formData.append('occupation', occupation);
    formData.append('marital_status', maritalStatus);

    if (ktpFile) formData.append('ktp', ktpFile);
    if (marriageDocFile && !docPendingLater) formData.append('marriage_doc', marriageDocFile);

    const fullOccupantsList = [
      { name, phone, address_ktp: addressKtp, birth_date: birthDate, relation: 'Penanggung Jawab', is_head: true },
      ...(hasMembers ? occupants : [])
    ];

    formData.append('occupants', JSON.stringify(fullOccupantsList));

    const res = await submitMultiTenantsStrict(formData);
    setSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
    } else {
      alert('Gagal mengirim formulir: ' + (res.error || 'Kesalahan teknis'));
    }
  };

  if (loadingProp) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-600">Memuat Formulir Wajib Lapor RT...</p>
        </div>
      </main>
    );
  }

  if (errorMsg || !property) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow max-w-md text-center space-y-3 border border-red-200">
          <p className="text-3xl">⚠️</p>
          <h2 className="text-sm font-bold text-red-700">Tautan Tidak Valid</h2>
          <p className="text-xs text-slate-500">{errorMsg}</p>
          <Link href="/" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-emerald-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-3xl mx-auto">
            ✅
          </div>
          <div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full uppercase">
              BERHASIL TERCATAT DI RT
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-2">Lapor Diri Telah Diterima</h2>
            <p className="text-xs text-slate-600 mt-1">
              Data Anda telah terdaftar dalam sistem register Pengurus RT dan unit <b>{property.name || property.property_name}</b>.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 font-medium text-slate-700">
            <p>🏠 <b>Unit / Kamar:</b> {roomNumber}</p>
            <p>👤 <b>Penanggung Jawab:</b> {name}</p>
            <p>📱 <b>WhatsApp Login:</b> {phone}</p>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href="/portal-warga"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl block transition-all shadow"
            >
              📱 Buka Dasbor Portal Warga
            </Link>
            <Link
              href="/"
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl block transition-all"
            >
              Halaman Utama
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const managerContact = property.manager_phone || property.owner_phone;
  const managerName = property.manager_name || property.owner_name || 'Pengelola Unit';

  return (
    <main className="min-h-screen bg-slate-100 p-3 md:p-8 text-slate-900 font-sans text-xs">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* HEADER PROPERTI & KONTAK PENGELOLA */}
        <div className="bg-slate-900 text-white p-5 md:p-6 rounded-3xl shadow-xl space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-500 text-slate-950 rounded-full uppercase">
              PORTAL WAJIB LAPOR RT (PUBLIK)
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">UU PDP COMPLIANT</span>
          </div>

          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">{property.name || property.property_name}</h1>
            <p className="text-xs text-slate-300 mt-0.5">{property.address || 'Lingkungan RT Setempat'}</p>
          </div>

          {managerContact && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Pengelola Lapangan: <b>{managerName}</b></span>
              <a
                href={`https://wa.me/${managerContact.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1 shadow-sm"
              >
                💬 Chat Pengelola
              </a>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* SEKSI 1: LOKASI UNIT & KONTAK (WAJIB SEMUA) */}
          <div className="bg-white p-5 rounded-2xl shadow border border-slate-200 space-y-3">
            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <span>1️⃣</span> Lokasi Unit & Kontak Utama
              </h3>
              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-red-100 text-red-700 rounded">WAJIB SEMUA</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp Aktif *</label>
                <input
                  type="tel"
                  required
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none font-mono focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Nomor ini menjadi kunci login Dasbor Warga Anda.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Kamar / Unit Hunian *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kamar 04 / Lantai 2"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai Menetap *</label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Asal Sesuai KTP *</label>
                <input
                  type="text"
                  required
                  placeholder="Kota / Kabupaten Asal KTP"
                  value={addressKtp}
                  onChange={(e) => setAddressKtp(e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* SEKSI 2: DATA PENANGGUNG JAWAB UTAMA */}
          <div className="bg-white p-5 rounded-2xl shadow border border-slate-200 space-y-3">
            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <span>2️⃣</span> Data Penanggung Jawab (Warga Utama)
              </h3>
              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-red-100 text-red-700 rounded">WAJIB SEMUA</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap (Sesuai KTP) *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Penanggung Jawab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir *</label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pekerjaan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Karyawan / Mahasiswa"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Pernikahan *</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full p-2.5 border rounded-xl outline-none bg-white font-semibold"
                >
                  <option value="Belum Menikah">Belum Menikah (Lajang)</option>
                  <option value="Menikah">Menikah</option>
                  <option value="Cerai">Cerai Hidup / Mati</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Foto KTP Penanggung Jawab (Usia ≥ 17 Tahun) *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setKtpFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs p-2 border rounded-xl bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white"
                />
              </div>

              {/* KONDISIONAL BUKU NIKAH / KK JIKA STATUS MENIKAH */}
              {maritalStatus === 'Menikah' && (
                <div className="md:col-span-2 bg-amber-50 p-3.5 rounded-xl border border-amber-200 space-y-2">
                  <label className="block font-bold text-amber-900">
                    📎 Unggah Buku Nikah / Kartu Keluarga (KK) Pasutri
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    disabled={docPendingLater}
                    onChange={(e) => setMarriageDocFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs p-2 border rounded-xl bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-800 file:text-white"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="docPending"
                      checked={docPendingLater}
                      onChange={(e) => setDocPendingLater(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="docPending" className="text-[11px] font-semibold text-amber-800">
                      Dokumen Buku Nikah/KK masih di kampung halaman (Akan disusulkan nanti)
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEKSI 3: ANGGOTA TAMBAHAN (FLEKSIBEL) */}
          <div className="bg-white p-5 rounded-2xl shadow border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <span>3️⃣</span> Anggota Hunian Lainnya (1 Kamar)
                </h3>
                <p className="text-[10px] text-slate-500">Centang jika menempati kamar bersama orang lain/keluarga.</p>
              </div>
              <input
                type="checkbox"
                checked={hasMembers}
                onChange={(e) => {
                  setHasMembers(e.target.checked);
                  if (e.target.checked && occupants.length === 0) handleAddOccupant();
                }}
                className="w-4 h-4 rounded text-emerald-600"
              />
            </div>

            {hasMembers && (
              <div className="space-y-3 pt-2 border-t">
                {occupants.map((occ, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-700">Anggota #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOccupant(idx)}
                        className="text-[10px] text-red-600 font-bold hover:underline"
                      >
                        ✕ Hapus
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Nama Lengkap Anggota"
                        value={occ.name}
                        onChange={(e) => handleOccupantChange(idx, 'name', e.target.value)}
                        className="p-2 border rounded-lg bg-white"
                      />
                      <input
                        type="date"
                        required
                        value={occ.birth_date}
                        onChange={(e) => handleOccupantChange(idx, 'birth_date', e.target.value)}
                        className="p-2 border rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Hubungan (Istri/Suami/Anak/Teman)"
                        value={occ.relation}
                        onChange={(e) => handleOccupantChange(idx, 'relation', e.target.value)}
                        className="p-2 border rounded-lg bg-white"
                      />
                      <input
                        type="tel"
                        placeholder="No WA Anggota (Opsional)"
                        value={occ.phone}
                        onChange={(e) => handleOccupantChange(idx, 'phone', e.target.value)}
                        className="p-2 border rounded-lg bg-white font-mono"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddOccupant}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl"
                >
                  + Tambah Anggota Kamar Lainnya
                </button>
              </div>
            )}
          </div>

          {/* SEKSI 4: TATA TERTIB & PERSETUJUAN HUKUM (UU PDP) */}
          <div className="bg-white p-5 rounded-2xl shadow border border-slate-200 space-y-3">
            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <span>4️⃣</span> Tata Tertib & Persetujuan Regulasi RT
              </h3>
              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-red-100 text-red-700 rounded">WAJIB CENTANG</span>
            </div>

            <div className="p-3 bg-slate-50 border rounded-xl max-h-36 overflow-y-auto font-mono text-[11px] text-slate-700 leading-relaxed">
              {property.house_rules || (
                <>
                  1. Wajib lapor diri 1x24 jam kependudukan RT setempat.<br/>
                  2. Menjaga ketertiban, ketenangan, dan kebersihan lingkungan RT.<br/>
                  3. Dilarang membawa barang terlarang (narkoba, miras, senjata).<br/>
                  4. Jam bertamu maksimal pukul 22.00 WIB demi keamanan lingkungan.<br/>
                  5. Pembayaran sewa tepat waktu sesuai kesepakatan dengan pemilik.
                </>
              )}
            </div>

            <div className="space-y-2 pt-1 text-slate-800 text-[11px]">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="agree1"
                  required
                  checked={agreeRules}
                  onChange={(e) => setAgreeRules(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <label htmlFor="agree1" className="font-semibold">
                  Saya telah membaca, memahami, dan menyatakan tunduk pada Tata Tertib Hunian di atas. Apabila melanggar, saya bersedia menerima sanksi yang berlaku.
                </label>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="agree2"
                  required
                  checked={agreePDP}
                  onChange={(e) => setAgreePDP(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <label htmlFor="agree2" className="text-slate-600 leading-tight">
                  Saya memberikan persetujuan eksplisit kepada Pengurus RT dan Pemilik Unit untuk memproses dan menyimpan data pribadi ini <b>semata-mata untuk keperluan verifikasi identitas, keamanan lingkungan, dan register kependudukan RT setempat</b> sesuai ketentuan UU PDP No. 27 Tahun 2022.
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !agreeRules || !agreePDP}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-2xl transition-all shadow-lg disabled:bg-slate-300"
          >
            {submitting ? 'Mengirim Data ke Sistem RT...' : 'Kirim Lapor Diri & Setujui Aturan RT'}
          </button>
        </form>

      </div>
    </main>
  );
}
