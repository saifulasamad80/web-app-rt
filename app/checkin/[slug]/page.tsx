'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { submitMultiTenantsStrict, getOwnerPropertiesAndTenants } from '../../../src/actions/checkin-tenant';

interface OccupantInput {
  name: string;
  birth_date: string;
  relation: string;
  ktp_file: File | null;
}

export default function CheckinPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'kos-melati-1';

  const [propertyType, setPropertyType] = useState<'kos' | 'kontrakan'>('kos');
  const [propertyName, setPropertyName] = useState('');
  const [phone, setPhone] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [addressKtp, setAddressKtp] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [agreedPdp, setAgreedPdp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [occupants, setOccupants] = useState<OccupantInput[]>([
    { name: '', birth_date: '', relation: 'Kepala Keluarga / Penanggung Jawab', ktp_file: null }
  ]);

  useEffect(() => {
    // Deteksi tipe properti dari slug
    if (slug.toLowerCase().includes('kontrakan')) {
      setPropertyType('kontrakan');
    } else {
      setPropertyType('kos');
    }
  }, [slug]);

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleAddOccupant = () => {
    setOccupants([
      ...occupants,
      { name: '', birth_date: '', relation: 'Anggota Penghuni', ktp_file: null }
    ]);
  };

  const handleRemoveOccupant = (index: number) => {
    if (occupants.length === 1) return;
    setOccupants(occupants.filter((_, i) => i !== index));
  };

  const handleOccupantChange = (index: number, field: keyof OccupantInput, value: any) => {
    const updated = [...occupants];
    updated[index] = { ...updated[index], [field]: value };
    setOccupants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!agreedPdp) {
      setErrorMsg('Anda wajib menyetujui persetujuan simpan data UU PDP.');
      return;
    }

    // Validasi Wajib KTP untuk Usia >= 17 Tahun (TANPA SUSULAN)
    for (let i = 0; i < occupants.length; i++) {
      const age = calculateAge(occupants[i].birth_date);
      if (age >= 17 && !occupants[i].ktp_file) {
        setErrorMsg(`Penghuni ke-${i + 1} (${occupants[i].name || 'Tanpa Nama'}) berusia ${age} tahun (≥ 17 thn) WAJIB mengunggah foto KTP saat ini. Tidak menerima susulan.`);
        return;
      }
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('property_slug', slug);
    formData.append('phone', phone);
    formData.append('entry_date', entryDate);
    formData.append('address_ktp', addressKtp);
    formData.append('room_number', roomNumber);
    formData.append('full_address', fullAddress);
    formData.append('occupants', JSON.stringify(occupants.map(o => ({
      name: o.name,
      birth_date: o.birth_date,
      relation: o.relation
    }))));

    occupants.forEach((o, index) => {
      if (o.ktp_file) {
        formData.append(`ktp_file_${index}`, o.ktp_file);
      }
    });

    const res = await submitMultiTenantsStrict(formData);
    setLoading(false);

    if (res && res.success) {
      setSuccessMsg(true);
    } else {
      setErrorMsg(res?.error || 'Gagal mengirim data. Silakan lengkapi berkas KTP.');
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4 text-gray-900">
      <div className="max-w-xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200">
        
        <div className="mb-6">
          <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded uppercase">
            PORTAL WAJIB LAPOR RT (PUBLIK)
          </span>
          <h1 className="text-xl font-bold mt-2">Formulir Pendataan Penghuni Baru</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Tipe Properti: <span className="font-bold uppercase text-emerald-700">{propertyType}</span> ({slug})
          </p>
        </div>

        {successMsg ? (
          <div className="p-6 bg-green-50 border border-green-300 text-green-900 rounded-xl text-center space-y-3">
            <p className="text-3xl">✅</p>
            <h2 className="font-bold text-lg">Pendataan Lapor Diri Berhasil!</h2>
            <p className="text-xs text-green-700">
              Seluruh data dan berkas KTP penghuni telah tersimpan secara resmi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* SECTION 1: LOKASI & KONTAK */}
            <div className="bg-gray-50 p-4 rounded-xl border space-y-4">
              <h2 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                1. Lokasi Unit & Kontak Penanggung Jawab
              </h2>

              <div>
                <label className="block text-xs font-semibold mb-1">Nomor WhatsApp Aktif *</label>
                <input
                  type="tel"
                  required
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              {/* DYNAMIC FIELD PER PROPERTI TYPE */}
              {propertyType === 'kos' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nomor / Nama Kamar Kos *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kamar 102 / Lantai 2 B"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tanggal Mulai Menetap *</label>
                    <input
                      type="date"
                      required
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Alamat Lengkap Kontrakan *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Jl. Mawar No. 12 RT 03/RW 05"
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tanggal Mulai Menetap *</label>
                    <input
                      type="date"
                      required
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">Alamat Asal KTP *</label>
                <input
                  type="text"
                  required
                  placeholder="Kota / Kabupaten Asal Sesuai KTP"
                  value={addressKtp}
                  onChange={(e) => setAddressKtp(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
            </div>

            {/* SECTION 2: MULTI PENGHUNI + MANDATORY KTP */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  2. Anggota Penghuni (1 Unit / Kamar)
                </h2>
                <button
                  type="button"
                  onClick={handleAddOccupant}
                  className="px-3 py-1 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 transition-colors"
                >
                  + Tambah Orang
                </button>
              </div>

              {occupants.map((occ, idx) => {
                const age = calculateAge(occ.birth_date);
                const isAdult = age >= 17;

                return (
                  <div key={idx} className="p-4 border rounded-xl bg-slate-50/50 space-y-3 relative">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-bold text-slate-800">
                        Penghuni #{idx + 1} {idx === 0 && '(Penanggung Jawab Utama)'}
                      </span>
                      {occupants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOccupant(idx)}
                          className="text-red-600 text-xs font-bold hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Nama Lengkap *</label>
                        <input
                          type="text"
                          required
                          placeholder="Sesuai KTP / Akta"
                          value={occ.name}
                          onChange={(e) => handleOccupantChange(idx, 'name', e.target.value)}
                          className="w-full text-xs p-2 border rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Status / Hubungan *</label>
                        <select
                          value={occ.relation || (idx === 0 ? 'Penyewa Utama / Kepala Keluarga' : 'Anggota Keluarga')}
                          onChange={(e) => handleOccupantChange(idx, 'relation', e.target.value)}
                          className="w-full text-xs p-2 border rounded-md bg-white font-semibold text-gray-800"
                        >
                          {idx === 0 ? (
                            <>
                              <option value="Penyewa Utama / Kepala Keluarga">Penyewa Utama / Kepala Keluarga</option>
                              <option value="Suami">Suami</option>
                              <option value="Istri">Istri</option>
                            </>
                          ) : (
                            <>
                              <option value="Istri">Istri</option>
                              <option value="Anak">Anak</option>
                              <option value="Suami">Suami</option>
                              <option value="Orang Tua">Orang Tua</option>
                              <option value="Saudara Kandung">Saudara Kandung</option>
                              <option value="Teman / Rekan Kos">Teman / Rekan Kos</option>
                              <option value="Lainnya">Lainnya</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Tanggal Lahir *</label>
                        <input
                          type="date"
                          required
                          value={occ.birth_date}
                          onChange={(e) => handleOccupantChange(idx, 'birth_date', e.target.value)}
                          className="w-full text-xs p-2 border rounded-md"
                        />
                      </div>
                    </div>

                    {/* ATURAN STRICT KTP */}
                    {occ.birth_date && (
                      <div className="pt-2 border-t">
                        {isAdult ? (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded block w-max">
                              Usia {age} Thn (≥ 17 Thn): WAJIB UNGGAH FOTO KTP (TIDAK BISA SUSULAN)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              required
                              onChange={(e) => handleOccupantChange(idx, 'ktp_file', e.target.files ? e.target.files[0] : null)}
                              className="w-full text-xs p-1.5 border border-red-300 rounded bg-white"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-green-800 bg-green-100 px-2 py-1 rounded block w-max">
                            Usia {age} Thn (&lt; 17 Thn): Bebas / Tidak Memerlukan KTP.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CHECKBOX PDP */}
            <div className="flex items-start space-x-2 pt-2">
              <input
                type="checkbox"
                id="pdpCheck"
                checked={agreedPdp}
                onChange={(e) => setAgreedPdp(e.target.checked)}
                className="mt-1 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="pdpCheck" className="text-[11px] text-gray-600 leading-tight">
                Saya menyetujui data pribadi seluruh penghuni diatas disimpan secara aman oleh Pengurus RT sesuai <strong>UU No. 27 Tahun 2022 (UU PDP)</strong>.
              </label>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-700 text-white font-bold text-sm rounded-xl hover:bg-emerald-800 transition-all shadow-md disabled:bg-gray-400"
            >
              {loading ? 'Validasi KTP & Mengunggah Data...' : 'Kirim Lapor Diri'}
            </button>

          </form>
        )}

      </div>
    </main>
  );
}
