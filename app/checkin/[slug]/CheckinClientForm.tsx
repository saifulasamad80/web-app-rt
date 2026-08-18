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

  // Step 1: Kamar
  const [roomNumber, setRoomNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Step 2: Penanggung Jawab
  const [primaryName, setPrimaryName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryBirthDate, setPrimaryBirthDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Belum Menikah');
  const [occupation, setOccupation] = useState('');
  const [primaryAddress, setPrimaryAddress] = useState('');
  
  // Step 3: Anggota Kamar
  const [occupants, setOccupants] = useState<OccupantItem[]>([]);
  
  // Step 4: Dokumen & Persetujuan
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [marriageDoc, setMarriageDoc] = useState<File | null>(null);
  const [kkDoc, setKkDoc] = useState<File | null>(null);
  const [pendingDocLater, setPendingDocLater] = useState(false);
  
  const [agreedPdp, setAgreedPdp] = useState(false);
  const [agreedRules, setAgreedRules] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Inline Validation UX
  const validateStep = (currentStep: number) => {
    const newErr: any = {};
    if (currentStep === 1) {
      if (!roomNumber) newErr.roomNumber = "Nomor Kamar wajib diisi.";
      if (!entryDate) newErr.entryDate = "Tanggal Masuk wajib diisi.";
    } else if (currentStep === 2) {
      if (!primaryName) newErr.primaryName = "Nama Lengkap wajib diisi.";
      if (!primaryPhone) newErr.primaryPhone = "Nomor WhatsApp wajib diisi.";
      if (!primaryBirthDate) newErr.primaryBirthDate = "Tanggal Lahir wajib diisi.";
    } else if (currentStep === 3) {
      occupants.forEach((occ, i) => {
        if (!occ.name) newErr[`occ_${i}_name`] = "Nama anggota wajib diisi.";
        if (!occ.birth_date) newErr[`occ_${i}_birth`] = "Tanggal lahir wajib.";
        const age = calculateAge(occ.birth_date);
        if (age >= 17 && !occ.ktpFile) newErr[`occ_${i}_ktp`] = `Anggota usia ${age}th wajib foto KTP.`;
      });
    }
    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep((s) => s + 1); };
  const prevStep = () => setStep((s) => s - 1);

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
      setSuccessData({ name: primaryName, room: roomNumber, phone: primaryPhone, property: property.name || property.property_name });
    } else { 
      setErrors({ server: res?.error || 'Terjadi kesalahan sistem. Silakan coba lagi.' }); 
    }
  };

  if (successData) return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md w-full space-y-4 animate-slide-up">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">✅</div>
        <h2 className="text-2xl font-black text-slate-900">Pendaftaran Berhasil!</h2>
        <p className="text-sm text-slate-600 leading-relaxed">Terima kasih. Data pendaftaran Anda untuk unit <b className="text-slate-900">{successData.property}</b> (Kamar {successData.room}) telah diteruskan secara aman ke Pengurus RT.</p>
        <div className="pt-4">
          <Link href="/portal-warga" className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl block text-sm transition-colors shadow">Buka Portal Warga</Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans pb-20">
      <div className="max-w-xl mx-auto space-y-5">
        <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center text-center">
          <span className="text-[0.7rem] font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full uppercase tracking-wider mx-auto mb-2 border border-slate-200">Lapor Diri 1x24 Jam</span>
          <h1 className="text-xl font-black">{property.name || property.property_name}</h1>
          <p className="text-sm text-slate-500 mt-1">{property.address || 'Lingkungan RT Setempat'}</p>
        </header>

        {/* PROGRESS BAR WIZARD */}
        <div className="flex justify-between items-center px-2">
          {[1,2,3,4].map(i => (
            <div key={i} className={`flex-1 h-2 mx-1 rounded-full transition-colors duration-300 ${step >= i ? 'bg-emerald-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
          {errors.server && <div className="p-3 mb-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">{errors.server}</div>}
          
          {/* STEP 1: KAMAR */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-black text-lg border-b pb-2 flex items-center gap-2"><span className="bg-slate-900 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">1</span> Data Kamar</h2>
              <div>
                <label className="block font-bold text-sm mb-1 text-slate-700">Nomor / Posisi Kamar *</label>
                <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="Contoh: Kamar 01 / Paviliun B" className={`w-full p-3.5 border rounded-xl bg-slate-50 font-bold outline-none transition-colors ${errors.roomNumber ? 'border-red-500 focus:border-red-500' : 'focus:border-emerald-500'}`} />
                {errors.roomNumber && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.roomNumber}</p>}
              </div>
              <div>
                <label className="block font-bold text-sm mb-1 text-slate-700">Tanggal Mulai Menempati *</label>
                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className={`w-full p-3.5 border rounded-xl bg-slate-50 outline-none transition-colors ${errors.entryDate ? 'border-red-500 focus:border-red-500' : 'focus:border-emerald-500'}`} />
                {errors.entryDate && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.entryDate}</p>}
              </div>
              <div className="pt-4">
                <button onClick={nextStep} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl cursor-pointer hover:bg-slate-800 transition-colors shadow-md">Selanjutnya →</button>
              </div>
            </div>
          )}

          {/* STEP 2: PENANGGUNG JAWAB */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-black text-lg border-b pb-2 flex items-center gap-2"><span className="bg-slate-900 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">2</span> Penanggung Jawab</h2>
              <div>
                <label className="block font-bold text-sm mb-1 text-slate-700">Nama Lengkap (Sesuai KTP) *</label>
                <input type="text" value={primaryName} onChange={e => setPrimaryName(e.target.value)} className={`w-full p-3.5 border rounded-xl bg-slate-50 outline-none transition-colors ${errors.primaryName ? 'border-red-500' : 'focus:border-emerald-500'}`} />
                {errors.primaryName && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.primaryName}</p>}
              </div>
              <div>
                <label className="block font-bold text-sm mb-1 text-slate-700">No. WhatsApp Aktif *</label>
                <input type="tel" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value.replace(/\D/g, ''))} placeholder="08xxxxxxxxxx" className={`w-full p-3.5 border rounded-xl bg-slate-50 font-mono outline-none transition-colors ${errors.primaryPhone ? 'border-red-500' : 'focus:border-emerald-500'}`} />
                {errors.primaryPhone && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.primaryPhone}</p>}
              </div>
              <div>
                <label className="block font-bold text-sm mb-1 text-slate-700">Tanggal Lahir *</label>
                <input type="date" value={primaryBirthDate} onChange={e => setPrimaryBirthDate(e.target.value)} className={`w-full p-3.5 border rounded-xl bg-slate-50 outline-none transition-colors ${errors.primaryBirthDate ? 'border-red-500' : 'focus:border-emerald-500'}`} />
                {errors.primaryBirthDate && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.primaryBirthDate}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-sm mb-1 text-slate-700">Status Nikah</label>
                  <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full p-3.5 border rounded-xl bg-slate-50 outline-none focus:border-emerald-500"><option value="Belum Menikah">Lajang</option><option value="Menikah">Menikah</option></select>
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1 text-slate-700">Pekerjaan</label>
                  <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Opsional" className="w-full p-3.5 border rounded-xl bg-slate-50 outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-sm mb-1 text-slate-700">Alamat Asal KTP</label>
                <input type="text" value={primaryAddress} onChange={e => setPrimaryAddress(e.target.value)} placeholder="Sesuai KTP daerah asal" className="w-full p-3.5 border rounded-xl bg-slate-50 outline-none focus:border-emerald-500" />
              </div>
              <div className="flex gap-3 mt-6 pt-2">
                <button onClick={prevStep} className="w-1/3 py-4 bg-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-300 cursor-pointer transition-colors">← Batal</button>
                <button onClick={nextStep} className="w-2/3 py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 cursor-pointer transition-colors shadow-md">Selanjutnya →</button>
              </div>
            </div>
          )}

          {/* STEP 3: ANGGOTA KAMAR */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="font-black text-lg flex items-center gap-2"><span className="bg-slate-900 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">3</span> Anggota Kamar</h2>
                <button onClick={() => setOccupants([...occupants, { name:'', phone:'', birth_date:'', relation:'Istri', ktpFile:null }])} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 cursor-pointer text-white text-xs font-bold rounded-xl transition-colors shadow">➕ Tambah</button>
              </div>
              
              {occupants.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <span className="text-3xl block mb-2">🛏️</span>
                  <p className="text-sm text-slate-500 font-medium">Saya tinggal sendiri di kamar ini.</p>
                </div>
              ) : (
                occupants.map((occ, idx) => {
                  const age = calculateAge(occ.birth_date);
                  return (
                    <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-black text-sm text-slate-900">Anggota #{idx+1}</span>
                        <button onClick={()=>setOccupants(occupants.filter((_,i)=>i!==idx))} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors">Hapus</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input type="text" placeholder="Nama Lengkap Sesuai KTP" value={occ.name} onChange={e=>{const updated=[...occupants]; updated[idx].name=e.target.value; setOccupants(updated);}} className={`w-full p-2.5 border rounded-xl text-sm outline-none ${errors[`occ_${idx}_name`]?'border-red-500':'focus:border-emerald-500'}`} />
                          {errors[`occ_${idx}_name`] && <p className="text-[10px] text-red-600 mt-1 font-semibold">{errors[`occ_${idx}_name`]}</p>}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Hubungan</label>
                          <select value={occ.relation} onChange={e=>{const updated=[...occupants]; updated[idx].relation=e.target.value; setOccupants(updated);}} className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-emerald-500">
                            <option value="Istri">Istri</option><option value="Suami">Suami</option><option value="Anak">Anak</option><option value="Saudara">Saudara</option><option value="Teman">Teman / Rekan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Tanggal Lahir</label>
                          <input type="date" value={occ.birth_date} onChange={e=>{const updated=[...occupants]; updated[idx].birth_date=e.target.value; setOccupants(updated);}} className={`w-full p-2.5 border rounded-xl text-sm outline-none ${errors[`occ_${idx}_birth`]?'border-red-500':'focus:border-emerald-500'}`} />
                          {errors[`occ_${idx}_birth`] && <p className="text-[10px] text-red-600 mt-1 font-semibold">{errors[`occ_${idx}_birth`]}</p>}
                        </div>
                        <div className="col-span-2">
                          <input type="tel" placeholder="Nomor WhatsApp (Opsional)" value={occ.phone} onChange={e=>{const updated=[...occupants]; updated[idx].phone=e.target.value.replace(/\D/g,''); setOccupants(updated);}} className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-emerald-500 font-mono" />
                        </div>
                      </div>
                      {/* Logika UU PDP: Hanya minta KTP kalau umur >= 17 */}
                      {age >= 17 && (
                        <div className="pt-2">
                          <label className="text-xs font-bold text-slate-700 block mb-1">🪪 Foto KTP Anggota *</label>
                          <input type="file" accept="image/*" onChange={e=>{const updated=[...occupants]; updated[idx].ktpFile=e.target.files?.[0]||null; setOccupants(updated);}} className={`w-full p-2 border rounded-xl text-xs bg-white ${errors[`occ_${idx}_ktp`]?'border-red-500':''}`} />
                          {errors[`occ_${idx}_ktp`] && <p className="text-[10px] text-red-600 mt-1 font-semibold">{errors[`occ_${idx}_ktp`]}</p>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div className="flex gap-3 mt-6 pt-2">
                <button onClick={prevStep} className="w-1/3 py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer transition-colors">← Batal</button>
                <button onClick={nextStep} className="w-2/3 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl cursor-pointer transition-colors shadow-md">Selanjutnya →</button>
              </div>
            </div>
          )}

          {/* STEP 4: DOKUMEN & FINALISASI */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="font-black text-lg border-b pb-2 flex items-center gap-2"><span className="bg-slate-900 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">4</span> Dokumen Resmi</h2>
              
              <div className={`p-5 bg-slate-50 border rounded-2xl space-y-2 ${errors.ktpFile?'border-red-500 bg-red-50':'border-slate-200'}`}>
                <label className="block font-bold text-sm text-slate-900">🪪 Foto KTP Penanggung Jawab *</label>
                <p className="text-[10px] text-slate-500 mb-2">Wajib diunggah untuk verifikasi identitas (Sesuai UU PDP).</p>
                <input type="file" accept="image/*" onChange={e=>setKtpFile(e.target.files?.[0]||null)} className="w-full p-2.5 border rounded-xl bg-white text-sm" />
                {errors.ktpFile && <p className="text-xs text-red-600 font-semibold">{errors.ktpFile}</p>}
              </div>

              {maritalStatus === 'Menikah' && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <label className="font-bold text-sm text-slate-900">📎 Dokumen Nikah / KK</label>
                      <p className="text-[10px] text-slate-500">Bukti sah pasangan suami-istri.</p>
                    </div>
                    {/* Area klik yang lebih besar (UX improvement) */}
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border shadow-sm hover:bg-slate-100 transition-colors">
                      <input type="checkbox" checked={pendingDocLater} onChange={e=>setPendingDocLater(e.target.checked)} className="cursor-pointer w-4 h-4 accent-slate-900"/> 
                      <span className="text-xs font-bold text-slate-700">Menyusul</span>
                    </label>
                  </div>
                  
                  {!pendingDocLater && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Foto Buku Nikah</label>
                        <input type="file" accept="image/*,.pdf" onChange={e=>setMarriageDoc(e.target.files?.[0]||null)} className="w-full p-2.5 border rounded-xl bg-white text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Foto Kartu Keluarga (KK)</label>
                        <input type="file" accept="image/*,.pdf" onChange={e=>setKkDoc(e.target.files?.[0]||null)} className="w-full p-2.5 border rounded-xl bg-white text-xs" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PERSETUJUAN DENGAN HITBOX BESAR */}
              <div className="space-y-3 pt-4">
                <div>
                  <label className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-colors border ${agreedPdp ? 'bg-emerald-50 border-emerald-200' : 'bg-white hover:bg-slate-50 border-slate-200'}`}>
                    <input type="checkbox" checked={agreedPdp} onChange={e=>setAgreedPdp(e.target.checked)} className="mt-0.5 w-5 h-5 cursor-pointer accent-emerald-600 flex-shrink-0" />
                    <span className="text-xs text-slate-700 leading-relaxed block">Saya menyatakan data ini benar dan menyetujui pemrosesan data secara aman sesuai standar <b>UU Perlindungan Data Pribadi (PDP) No. 27/2022</b>.</span>
                  </label>
                  {errors.agreedPdp && <p className="text-xs text-red-600 pl-4 mt-1 font-semibold">{errors.agreedPdp}</p>}
                </div>

                <div>
                  <label className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-colors border ${agreedRules ? 'bg-emerald-50 border-emerald-200' : 'bg-white hover:bg-slate-50 border-slate-200'}`}>
                    <input type="checkbox" checked={agreedRules} onChange={e=>setAgreedRules(e.target.checked)} className="mt-0.5 w-5 h-5 cursor-pointer accent-emerald-600 flex-shrink-0" />
                    <span className="text-xs text-slate-700 leading-relaxed block">Saya telah membaca, menyetujui, dan bersedia mematuhi <b>Tata Tertib Hunian & Lingkungan RT</b> yang berlaku.</span>
                  </label>
                  {errors.agreedRules && <p className="text-xs text-red-600 pl-4 mt-1 font-semibold">{errors.agreedRules}</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={prevStep} className="w-1/3 py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer transition-colors">← Kembali</button>
                <button onClick={handleSubmit} disabled={loading} className="w-2/3 py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base rounded-xl shadow-lg cursor-pointer transition-all disabled:bg-slate-400 disabled:cursor-not-allowed">
                  {loading ? 'Mengirim Data...' : 'Kirim Pendaftaran'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}