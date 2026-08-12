'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { submitMultiTenantsStrict, getPropertyRules } from '../../../src/actions/checkin-tenant';

interface OccupantInput {
  name: string;
  birth_date: string;
  relation: string;
  ktp_file: File | null;
}

interface ReceiptData {
  household_id: string;
  registered_at: string;
  phone: string;
  entryDate: string;
  locationInfo: string;
  occupantsSummary: { name: string; relation: string; age: number }[];
}

export default function CheckinPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'kos-melati-1';

  const [propertyType, setPropertyType] = useState<'kos' | 'kontrakan'>('kos');
  const [houseRules, setHouseRules] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [addressKtp, setAddressKtp] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  
  // Checkbox Persetujuan
  const [agreedPdp, setAgreedPdp] = useState(false);
  const [agreedRules, setAgreedRules] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [occupants, setOccupants] = useState<OccupantInput[]>([
    { name: '', birth_date: '', relation: 'Penanggung Jawab', ktp_file: null }
  ]);

  useEffect(() => {
    if (slug.toLowerCase().includes('kontrakan')) {
      setPropertyType('kontrakan');
    } else {
      setPropertyType('kos');
    }

    // Load Tata Tertib Spesifik dari Properti
    const loadRules = async () => {
      const res = await getPropertyRules(slug);
      if (res && res.property) {
        setHouseRules(res.property.house_rules || '1. Wajib menjaga ketertiban lingkungan.');
      }
    };
    loadRules();
  }, [slug]);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) return resolve(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else { resolve(file); }
            },
            'image/jpeg',
            0.7
          );
        };
      };
    });
  };

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
      { name: '', birth_date: '', relation: 'Istri', ktp_file: null }
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

    if (!agreedRules) {
      setErrorMsg('Anda wajib membaca dan menyetujui Tata Tertib Hunian terlebih dahulu.');
      return;
    }

    if (!agreedPdp) {
      setErrorMsg('Anda wajib menyetujui persetujuan simpan data UU PDP.');
      return;
    }

    for (let i = 0; i < occupants.length; i++) {
      const age = calculateAge(occupants[i].birth_date);
      if (age >= 17 && !occupants[i].ktp_file) {
        setErrorMsg(`Penghuni ke-${i + 1} (${occupants[i].name || 'Tanpa Nama'}) berusia ${age} thn (≥ 17 thn) WAJIB mengunggah KTP.`);
        return;
      }
    }

    setLoading(true);
    setLoadingStatus('Mengompres berkas KTP secara aman...');

    try {
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

      for (let index = 0; index < occupants.length; index++) {
        const o = occupants[index];
        if (o.ktp_file) {
          const compressed = await compressImage(o.ktp_file);
          formData.append(`ktp_file_${index}`, compressed);
        }
      }

      setLoadingStatus('Mengirim data lapor diri...');

      const res = await submitMultiTenantsStrict(formData);
      setLoading(false);

      if (res && res.success) {
        setReceipt({
          household_id: res.household_id || 'REG-' + Date.now(),
          registered_at: res.registered_at || new Date().toISOString(),
          phone: phone,
          entryDate: entryDate,
          locationInfo: propertyType === 'kos' ? `Kamar: ${roomNumber}` : fullAddress,
          occupantsSummary: occupants.map(o => ({
            name: o.name,
            relation: o.relation,
            age: calculateAge(o.birth_date)
          }))
        });
      } else {
        setErrorMsg(res?.error || 'Gagal mengirim data. Silakan coba lagi.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Terjadi kesalahan teknis saat pengiriman data.');
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

        {receipt ? (
          <div className="space-y-6 print:p-0">
            <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                <div>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500 text-slate-950 rounded uppercase">
                    BUKTI RESMI LAPOR DIRI
                  </span>
                  <h2 className="text-lg font-bold mt-1 text-emerald-400">Pendaftaran Terverifikasi</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">ID Registrasi</span>
                  <span className="text-xs font-mono font-bold text-gray-200">{receipt.household_id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Nomor WhatsApp</span>
                  <span className="font-semibold">{receipt.phone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Tanggal Menetap</span>
                  <span className="font-semibold">{receipt.entryDate}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400 block text-[10px]">Lokasi Unit / Properti</span>
                  <span className="font-semibold text-emerald-300">{receipt.locationInfo}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Daftar Penghuni Terdaftar</span>
                <div className="space-y-1.5">
                  {receipt.occupantsSummary.map((occ, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-800/80 p-2 rounded text-xs">
                      <span className="font-semibold">{occ.name}</span>
                      <div className="space-x-2">
                        <span className="text-[10px] bg-slate-700 text-emerald-300 px-1.5 py-0.5 rounded">
                          {occ.relation}
                        </span>
                        <span className="text-[10px] text-gray-300">{occ.age} Thn</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-lg text-center border border-slate-700">
                <span className="text-[10px] font-bold text-amber-400 block">STATUS LAPORAN & ATURAN:</span>
                <span className="text-xs font-semibold text-gray-200">Telah Menyatakan Tunduk pada Tata Tertib Pemilik</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition-all shadow"
              >
                🖨️ Cetak / Simpan Gambar
              </button>
              <button
                onClick={() => { setReceipt(null); setOccupants([{ name: '', birth_date: '', relation: 'Penanggung Jawab', ktp_file: null }]); }}
                className="py-2.5 px-4 bg-gray-200 text-gray-800 font-bold text-xs rounded-xl hover:bg-gray-300 transition-all"
              >
                Lapor Baru
              </button>
            </div>
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

            {/* SECTION 2: MULTI PENGHUNI */}
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
                        Penghuni #{idx + 1} {idx === 0 ? '(Penanggung Jawab Utama)' : ''}
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

                    <div className={`grid grid-cols-1 ${idx === 0 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-3`}>
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

                      {idx > 0 && (
                        <div>
                          <label className="block text-[11px] font-semibold mb-1">Status Hubungan *</label>
                          <select
                            value={occ.relation}
                            onChange={(e) => handleOccupantChange(idx, 'relation', e.target.value)}
                            className="w-full text-xs p-2 border rounded-md bg-white font-semibold text-gray-800"
                          >
                            <option value="Suami">Suami</option>
                            <option value="Istri">Istri</option>
                            <option value="Anak">Anak</option>
                            <option value="Saudara">Saudara</option>
                          </select>
                        </div>
                      )}

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

                    {occ.birth_date && (
                      <div className="pt-2 border-t">
                        {isAdult ? (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded block w-max">
                              Usia {age} Thn (≥ 17 Thn): WAJIB UNGGAH FOTO KTP
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

            {/* SECTION 3: TATA TERTIB HUNIAN (LEGAL BINDING) */}
            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl space-y-3">
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📜</span> 3. Tata Tertib & Ketentuan Hunian
              </h2>
              <div className="bg-white p-3 rounded-lg border border-amber-200 text-[11px] text-gray-700 max-h-36 overflow-y-auto whitespace-pre-line leading-relaxed font-mono">
                {houseRules || 'Loading Tata Tertib...'}
              </div>
              <div className="flex items-start space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="rulesCheck"
                  checked={agreedRules}
                  onChange={(e) => setAgreedRules(e.target.checked)}
                  className="mt-1 rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="rulesCheck" className="text-[11px] text-amber-950 font-semibold leading-tight">
                  Saya telah membaca, memahami, dan menyatakan tunduk pada Tata Tertib Hunian di atas. Apabila melanggar, saya bersedia menerima sanksi yang berlaku.
                </label>
              </div>
            </div>

            {/* PERSETUJUAN PDP */}
            <div className="flex items-start space-x-2">
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
              {loading ? loadingStatus : 'Kirim Lapor Diri & Setujui Aturan'}
            </button>

          </form>
        )}

      </div>
    </main>
  );
}
