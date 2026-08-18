'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { submitMultiTenantsStrict } from '../../../src/actions/checkin-tenant';

interface Property { id: string; name: string; property_name?: string; type: string; slug: string; address?: string; house_rules?: string; total_rooms?: number; }
interface OccupantItem { name: string; phone: string; birth_date: string; relation: string; ktpFile: File | null; }

function calculateAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const today = new Date(); const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
  return isNaN(age) ? 0 : age;
}

export default function CheckinClientForm({ property }: { property: Property }) {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<any>({});

  const [roomNumber, setRoomNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [primaryName, setPrimaryName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryBirthDate, setPrimaryBirthDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Belum Menikah');
  const [occupation, setOccupation] = useState('');
  const [primaryAddress, setPrimaryAddress] = useState('');
  
  const [occupants, setOccupants] = useState<OccupantItem[]>([]);
  
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [marriageDoc, setMarriageDoc] = useState<File | null>(null);
  const [kkDoc, setKkDoc] = useState<File | null>(null);
  const [pendingDocLater, setPendingDocLater] = useState(false);
  
  const [agreedPdp, setAgreedPdp] = useState(false);
  const [agreedRules, setAgreedRules] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);

  const validateField = (field: string, value: string) => {
    setErrors((prev: any) => {
      const newErr = { ...prev };
      if (!value || value.trim() === '') {
        if (field === 'entryDate') newErr.entryDate = "Tanggal Masuk wajib diisi.";
        if (field === 'primaryName') newErr.primaryName = "Nama Lengkap wajib diisi.";
        if (field === 'primaryPhone') newErr.primaryPhone = "Nomor WhatsApp wajib diisi.";
        if (field === 'primaryBirthDate') newErr.primaryBirthDate = "Tanggal Lahir wajib diisi.";
        if (field === 'occupation') newErr.occupation = "Pekerjaan wajib diisi.";
        if (field === 'primaryAddress') newErr.primaryAddress = "Alamat Asal KTP wajib diisi.";
      } else {
        delete newErr[field];
      }
      return newErr;
    });
  };

  const validateStep = (currentStep: number) => {
    const newErr: any = {};
    if (currentStep === 1) {
      if (!roomNumber.trim()) newErr.roomNumber = "Nomor Kamar wajib diisi.";
      if (!entryDate) newErr.entryDate = "Tanggal Masuk wajib diisi.";
    } else if (currentStep === 2) {
      if (!primaryName.trim()) newErr.primaryName = "Nama Lengkap wajib diisi.";
      if (!primaryPhone.trim()) newErr.primaryPhone = "Nomor WhatsApp wajib diisi.";
      if (!primaryBirthDate) newErr.primaryBirthDate = "Tanggal Lahir wajib diisi.";
      if (!occupation.trim()) newErr.occupation = "Pekerjaan wajib diisi.";
      if (!primaryAddress.trim()) newErr.primaryAddress = "Alamat Asal KTP wajib diisi.";
    } else if (currentStep === 3) {
      occupants.forEach((occ, i) => {
        if (!occ.name.trim()) newErr[`occ_${i}_name`] = "Nama anggota wajib diisi.";
        if (!occ.birth_date) newErr[`occ_${i}_birth`] = "Tanggal lahir wajib.";
        const age = calculateAge(occ.birth_date);
        if (age >= 17 && !occ.ktpFile) newErr[`occ_${i}_ktp`] = `Anggota usia ${age}th wajib foto KTP.`;
      });
    }
    setErrors({ ...errors, ...newErr });
    return Object.keys(newErr).length === 0;
  };

  // Langsung lanjut ke langkah berikutnya
  const nextStep = () => { if (validateStep(step)) setStep((s) => s + 1); };
  const prevStep = () => setStep((s) => s - 1);

  const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomNumber(e.target.value);
    setErrors((prev: any) => { const newErr = { ...prev }; delete newErr.roomNumber; return newErr; });
  };

  const handlePrimaryKtpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { alert('Harus berupa gambar (JPG/PNG).'); e.target.value = ''; setKtpFile(null); } 
      else { setKtpFile(file); validateField('ktpFile', 'uploaded'); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErr: any = {};
    if (!ktpFile) newErr.ktpFile = "Foto KTP Penanggung Jawab wajib diunggah.";
    if (!agreedPdp) newErr.agreedPdp = "Anda harus menyetujui Ketentuan PDP.";
    if (!agreedRules) newErr.agreedRules = "Anda harus menyetujui Tata Tertib.";
    if (Object.keys(newErr).length > 0) { setErrors(newErr); return; }

    setLoading(true); setErrors({});
    const formData = new FormData();
    formData.append('property_id', property.id); formData.append('room_number', roomNumber);
    formData.append('entry_date', entryDate); formData.append('marital_status', maritalStatus);
    formData.append('occupation', occupation); formData.append('rent_price', '0');
    formData.append('name', primaryName); formData.append('phone', primaryPhone);
    formData.append('birth_date', primaryBirthDate); formData.append('address_ktp', primaryAddress);
    
    if (ktpFile) formData.append('ktp', ktpFile);
    if (marriageDoc) formData.append('marriage_doc', marriageDoc);
    if (kkDoc) formData.append('kk_doc', kkDoc);

    const occupantList = [{ name: primaryName, phone: primaryPhone, birth_date: primaryBirthDate, address_ktp: primaryAddress, relation: 'Penanggung Jawab', is_head: true, marital_status: maritalStatus, occupation }];
    occupants.forEach((occ, idx) => {
      occupantList.push({ name: occ.name, phone: occ.phone || '', birth_date: occ.birth_date || '', address_ktp: primaryAddress, relation: occ.relation || 'Anggota', is_head: false, marital_status: (occ.relation === 'Istri' || occ.relation === 'Suami') ? 'Menikah' : 'Belum Menikah', occupation: '' });
      if (occ.ktpFile) formData.append(`member_ktp_${idx}`, occ.ktpFile);
    });
    formData.append('occupants', JSON.stringify(occupantList));

    const res = await submitMultiTenantsStrict(formData);
    setLoading(false);
    
    if (res && res.success) { 
      setSuccessData({ name: primaryName, room: roomNumber, property: property.name }); 
    } else { 
      // ============================================================================
      // IDE JENIUS LU BEKERJA DI SINI: MUNDUR KE LANGKAH 1 KALAU BENTROK
      // ============================================================================
      if (res?.error === 'KAMAR_BENTROK') {
          setStep(1); // Tendang pengguna balik ke Langkah 1 secara instan
          setErrors({ roomNumber: `⛔ PENDAFTARAN DITOLAK: Kamar "${roomNumber}" sudah terisi atau dalam antrean!` });
          alert(`Pendaftaran ditolak karena Kamar "${roomNumber}" sudah terisi. Silakan masukkan nomor/nama kamar lain.`);
      } else {
          setErrors({ server: res?.error || 'Gagal mengirim data. Silakan coba lagi.' }); 
      }
    }
  };

  if (successData) return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md w-full">
        <div className="text-4xl mx-auto mb-4">✅</div>
        <h2 className="text-2xl font-black text-slate-900">Berhasil!</h2>
        <p className="text-sm text-slate-600 mt-2">Data Anda untuk unit <b>{successData.property}</b> ({successData.room}) telah diteruskan ke Pengurus RT.</p>
        <Link href="/portal-warga" className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl block text-sm mt-6">Buka Portal Warga</Link>
      </div>
    </main>
  );

  const stepLabels = ['1. Kamar', '2. Profil', '3. Anggota', '4. Dokumen'];

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans pb-20">
      <div className="max-w-xl mx-auto space-y-5">
        <header className="bg-white p-6 rounded-3xl shadow-sm border text-center"><span className="text-[0.7rem] font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">Lapor Diri 1x24 Jam</span><h1 className="text-xl font-black mt-2">{property.name}</h1><p className="text-sm text-slate-500">{property.address}</p></header>
        
        <div className="flex justify-between items-center px-1">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = step >= stepNum;
            return (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div className={`w-full h-2 rounded-full mb-1.5 mx-1 ${isActive ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                <span className={`text-[10px] font-black ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border relative">
          
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-black text-lg border-b pb-2">1. Data Kamar</h2>
              <div>
                <label className="block font-bold text-sm mb-1 text-slate-900">Nomor / Posisi Kamar *</label>
                <div className="relative">
                  <input type="text" value={roomNumber} onChange={handleRoomChange} className={`w-full p-3 border-2 rounded-xl bg-slate-50 font-bold outline-none transition-colors ${errors.roomNumber ? 'border-red-500 bg-red-50 text-red-900' : 'focus:border-emerald-500 border-slate-200'}`} />
                </div>
                {errors.roomNumber && <p className="text-xs text-red-600 mt-1.5 font-bold animate-slide-up">{errors.roomNumber}</p>}
              </div>
              
              <div>
                <label className="block font-bold text-sm mb-1">Tanggal Mulai Sewa *</label>
                <input type="date" aria-label="Format Tanggal: DD/MM/YYYY" value={entryDate} onChange={e => setEntryDate(e.target.value)} onBlur={() => validateField('entryDate', entryDate)} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-emerald-500 transition-colors" />
                {errors.entryDate && <p className="text-xs text-red-600 mt-1">{errors.entryDate}</p>}
              </div>
              <button onClick={nextStep} className="w-full py-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-colors">Selanjutnya →</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-black text-lg border-b pb-2">2. Penanggung Jawab Kamar</h2>
              <div>
                <label className="block font-bold text-sm mb-1">Nama Lengkap (Sesuai KTP) *</label>
                <input type="text" value={primaryName} onChange={e => setPrimaryName(e.target.value)} onBlur={() => validateField('primaryName', primaryName)} className="w-full p-3 border rounded-xl bg-slate-50 focus:border-emerald-500 outline-none transition-colors" />
                {errors.primaryName && <p className="text-xs text-red-600 mt-1">{errors.primaryName}</p>}
              </div>
              <div>
                <label className="block font-bold text-sm mb-1">No. WhatsApp *</label>
                <input type="tel" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value.replace(/\D/g, ''))} onBlur={() => validateField('primaryPhone', primaryPhone)} className="w-full p-3 border rounded-xl bg-slate-50 font-mono focus:border-emerald-500 outline-none transition-colors" />
                {errors.primaryPhone && <p className="text-xs text-red-600 mt-1">{errors.primaryPhone}</p>}
              </div>
              <div>
                <label className="block font-bold text-sm mb-1">Tanggal Lahir *</label>
                <input type="date" aria-label="Format Tanggal: DD/MM/YYYY" value={primaryBirthDate} onChange={e => setPrimaryBirthDate(e.target.value)} onBlur={() => validateField('primaryBirthDate', primaryBirthDate)} className="w-full p-3 border rounded-xl bg-slate-50 focus:border-emerald-500 outline-none transition-colors" />
                {errors.primaryBirthDate && <p className="text-xs text-red-600 mt-1">{errors.primaryBirthDate}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-sm mb-1">Status Sipil</label>
                  <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:border-emerald-500">
                    <option value="Belum Menikah">Lajang</option>
                    <option value="Menikah">Menikah</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1">Pekerjaan *</label>
                  <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} onBlur={() => validateField('occupation', occupation)} className="w-full p-3 border rounded-xl bg-slate-50 focus:border-emerald-500 outline-none transition-colors" />
                  {errors.occupation && <p className="text-xs text-red-600 mt-1">{errors.occupation}</p>}
                </div>
              </div>
              <div>
                <label className="block font-bold text-sm mb-1">Alamat Domisili Asal (KTP) *</label>
                <input type="text" value={primaryAddress} onChange={e => setPrimaryAddress(e.target.value)} onBlur={() => validateField('primaryAddress', primaryAddress)} className="w-full p-3 border rounded-xl bg-slate-50 focus:border-emerald-500 outline-none transition-colors" />
                {errors.primaryAddress && <p className="text-xs text-red-600 mt-1">{errors.primaryAddress}</p>}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={prevStep} className="w-1/3 py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors">← Batal</button>
                <button onClick={nextStep} className="w-2/3 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-colors">Selanjutnya →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="font-black text-lg">3. Anggota Kamar</h2>
                {occupants.length > 0 && <button onClick={() => setOccupants([...occupants, { name:'', phone:'', birth_date:'', relation:'Istri', ktpFile:null }])} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">➕ Tambah</button>}
              </div>
              
              {occupants.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-dashed border-2 border-slate-300 flex flex-col items-center">
                  <span className="text-5xl mb-3">👤</span>
                  <p className="font-black text-slate-700 text-base">Mendaftar Sendiri</p>
                  <p className="text-xs text-slate-500 mb-6 mt-1.5 leading-relaxed">Anda tercatat menempati kamar ini seorang diri.<br/>Jika ada istri/suami, anak, atau teman sekamar, wajib ditambahkan di sini.</p>
                  <button onClick={() => setOccupants([...occupants, { name:'', phone:'', birth_date:'', relation:'Istri', ktpFile:null }])} className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl shadow-md transition-colors cursor-pointer">
                    ➕ Tambah Anggota Kamar
                  </button>
                </div>
              ) : (
                occupants.map((occ, idx) => {
                  const age = calculateAge(occ.birth_date);
                  return (
                    <div key={idx} className="p-5 bg-slate-50 rounded-2xl border space-y-3 relative">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-sm text-slate-700">Anggota Ke-{idx+1}</span>
                        <button onClick={()=>setOccupants(occupants.filter((_,i)=>i!==idx))} className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold hover:bg-red-100 transition-colors">Hapus</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input type="text" placeholder="Nama Lengkap" value={occ.name} onChange={e=>{const u=[...occupants]; u[idx].name=e.target.value; setOccupants(u);}} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500" />
                          {errors[`occ_${idx}_name`] && <p className="text-[10px] text-red-600 mt-1">{errors[`occ_${idx}_name`]}</p>}
                        </div>
                        <select value={occ.relation} onChange={e=>{const u=[...occupants]; u[idx].relation=e.target.value; setOccupants(u);}} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500">
                          <option>Istri</option><option>Suami</option><option>Anak</option><option>Saudara</option><option>Teman</option>
                        </select>
                        <div>
                          <input type="date" aria-label="Format Tanggal: DD/MM/YYYY" value={occ.birth_date} onChange={e=>{const u=[...occupants]; u[idx].birth_date=e.target.value; setOccupants(u);}} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500" />
                          {errors[`occ_${idx}_birth`] && <p className="text-[10px] text-red-600 mt-1">{errors[`occ_${idx}_birth`]}</p>}
                        </div>
                      </div>
                      {age >= 17 && (
                        <div className="pt-2">
                          <label className="text-xs font-bold block mb-1 text-slate-700">📸 Foto KTP Anggota *</label>
                          <input type="file" accept="image/*" onChange={(e)=>{const file = e.target.files?.[0]; if(file){if(!file.type.startsWith('image/')){alert('Harus berupa gambar.'); e.target.value='';}else{const u=[...occupants]; u[idx].ktpFile=file; setOccupants(u);}}}} className="w-full p-2 border rounded-xl bg-white text-xs text-slate-600" />
                          {errors[`occ_${idx}_ktp`] && <p className="text-[10px] text-red-600 mt-1">{errors[`occ_${idx}_ktp`]}</p>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div className="flex gap-3 mt-8">
                <button onClick={prevStep} className="w-1/3 py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors">← Kembali</button>
                <button onClick={nextStep} className="w-2/3 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition-colors">Selanjutnya →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="font-black text-lg border-b pb-2">4. Dokumen & Persetujuan</h2>
              
              <div className="p-5 bg-slate-50 border rounded-2xl">
                <label className="block font-bold text-sm mb-2 text-slate-900">🪪 Foto KTP Pendaftar *</label>
                <input type="file" accept="image/*" onChange={handlePrimaryKtpUpload} className="w-full p-2.5 border rounded-xl bg-white text-sm text-slate-600" />
                {errors.ktpFile && <p className="text-xs text-red-600 mt-1 font-bold">{errors.ktpFile}</p>}
              </div>

              {maritalStatus === 'Menikah' && (
                <div className="p-5 bg-slate-50 border rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <label className="font-bold text-sm text-slate-900">📎 Dokumen Nikah / KK</label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                      <input type="checkbox" checked={pendingDocLater} onChange={e=>setPendingDocLater(e.target.checked)}/> 
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Menyusul</span>
                    </label>
                  </div>
                  {!pendingDocLater && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-xs font-bold block mb-1 text-slate-700">Foto Buku Nikah / Akta Cerai</label>
                        <input type="file" accept="image/*" onChange={(e)=>{const file = e.target.files?.[0]; if(file){if(!file.type.startsWith('image/')){alert('Harus berupa gambar (JPG/PNG). File PDF tidak diterima.'); e.target.value=''; setMarriageDoc(null);} else {setMarriageDoc(file);}}}} className="w-full p-2.5 border rounded-xl bg-white text-xs text-slate-600" />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1 text-slate-700">Foto Kartu Keluarga (KK)</label>
                        <input type="file" accept="image/*" onChange={(e)=>{const file = e.target.files?.[0]; if(file){if(!file.type.startsWith('image/')){alert('Harus berupa gambar (JPG/PNG). File PDF tidak diterima.'); e.target.value=''; setKkDoc(null);} else {setKkDoc(file);}}}} className="w-full p-2.5 border rounded-xl bg-white text-xs text-slate-600" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <h3 className="font-black text-sm mb-2 text-slate-900">📜 Tata Tertib Lingkungan</h3>
                <div className="font-mono text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded-lg border h-32 overflow-y-auto leading-relaxed">
                  {property.house_rules || "1. Wajib lapor diri 1x24 Jam kepada Pengurus RT.\n2. Wajib menjaga kebersihan dan ketertiban lingkungan kos.\n3. Dilarang melakukan kegiatan ilegal di dalam area properti."}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer border bg-white hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={agreedPdp} onChange={e=>setAgreedPdp(e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-600" />
                  <div className="flex-1">
                    <span className="text-sm text-slate-900 font-bold block mb-1">
                      <span className="text-emerald-600 mr-1.5" title="Terenkripsi Aman">🛡️</span>
                      Sesuai UU PDP No. 27/2022
                    </span>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Saya setuju menyerahkan data ini. Data KTP dienkripsi dan <b>hanya</b> digunakan oleh Pengurus RT untuk kependudukan resmi.</p>
                  </div>
                </label>
                {errors.agreedPdp && <p className="text-xs text-red-600 px-1">{errors.agreedPdp}</p>}

                <label className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer border bg-white hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={agreedRules} onChange={e=>setAgreedRules(e.target.checked)} className="mt-1 w-5 h-5 accent-emerald-600" />
                  <span className="text-xs text-slate-700 font-bold leading-relaxed pt-0.5">Saya menyetujui dan siap mematuhi <b>Tata Tertib</b> properti ini.</span>
                </label>
                {errors.agreedRules && <p className="text-xs text-red-600 px-1">{errors.agreedRules}</p>}
              </div>

              {errors.server && (
                <div className="p-4 mt-6 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl text-center animate-pulse shadow-sm">
                  ⚠️ {errors.server}
                </div>
              )}

              <div className="flex flex-col-reverse md:flex-row gap-3 mt-4 pt-4">
                <button onClick={prevStep} className="w-full md:w-1/3 py-4 md:py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors min-h-[50px]">← Kembali</button>
                <button onClick={handleSubmit} disabled={loading} className="w-full md:w-2/3 py-4 md:py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-xl shadow-lg transition-colors min-h-[50px] disabled:bg-slate-400">
                  {loading ? 'Mengirim Data...' : 'Kirim Pendaftaran 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}