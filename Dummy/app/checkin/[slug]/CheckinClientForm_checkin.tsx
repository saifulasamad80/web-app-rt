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

  const validateStep = (currentStep: number) => {
    const newErr: any = {};
    if (currentStep === 1) {
      if (!roomNumber) newErr.roomNumber = "Nomor Kamar wajib diisi.";
      if (!entryDate) newErr.entryDate = "Tanggal Masuk wajib diisi.";
    } else if (currentStep === 2) {
      if (!primaryName) newErr.primaryName = "Nama Lengkap wajib diisi.";
      if (!primaryPhone) newErr.primaryPhone = "Nomor WhatsApp wajib diisi.";
      if (!primaryBirthDate) newErr.primaryBirthDate = "Tanggal Lahir wajib diisi.";
      if (!occupation) newErr.occupation = "Pekerjaan wajib diisi.";
      if (!primaryAddress) newErr.primaryAddress = "Alamat Asal KTP wajib diisi.";
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

  // FIX: Type safe image uploader
  const handlePrimaryKtpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { alert('Harus berupa gambar (JPG/PNG).'); e.target.value = ''; setKtpFile(null); } 
      else { setKtpFile(file); }
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
    if (res && res.success) { setSuccessData({ name: primaryName, room: roomNumber, property: property.name }); } 
    else { setErrors({ server: res?.error || 'Gagal.' }); }
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans pb-20">
      <div className="max-w-xl mx-auto space-y-5">
        <header className="bg-white p-6 rounded-3xl shadow-sm border text-center"><span className="text-[0.7rem] font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">Lapor Diri 1x24 Jam</span><h1 className="text-xl font-black mt-2">{property.name}</h1><p className="text-sm text-slate-500">{property.address}</p></header>
        
        <div className="flex justify-between items-center px-2">
          {[1,2,3,4].map(i => (<div key={i} className={`flex-1 h-2 mx-1 rounded-full ${step >= i ? 'bg-emerald-600' : 'bg-slate-200'}`} />))}
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border">
          {errors.server && <div className="p-3 mb-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl">{errors.server}</div>}
          
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-black text-lg border-b pb-2">1. Data Kamar</h2>
              <div><label className="block font-bold text-sm mb-1">Nomor / Posisi Kamar *</label><input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 font-bold outline-none" />{errors.roomNumber && <p className="text-xs text-red-600">{errors.roomNumber}</p>}</div>
              <div><label className="block font-bold text-sm mb-1">Tanggal Mulai *</label><input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50 outline-none" />{errors.entryDate && <p className="text-xs text-red-600">{errors.entryDate}</p>}</div>
              <button onClick={nextStep} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl">Selanjutnya →</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-black text-lg border-b pb-2">2. Penanggung Jawab</h2>
              <div><label className="block font-bold text-sm mb-1">Nama Lengkap *</label><input type="text" value={primaryName} onChange={e => setPrimaryName(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" />{errors.primaryName && <p className="text-xs text-red-600">{errors.primaryName}</p>}</div>
              <div><label className="block font-bold text-sm mb-1">No. WhatsApp *</label><input type="tel" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value.replace(/\D/g, ''))} className="w-full p-3 border rounded-xl bg-slate-50 font-mono" />{errors.primaryPhone && <p className="text-xs text-red-600">{errors.primaryPhone}</p>}</div>
              <div><label className="block font-bold text-sm mb-1">Tanggal Lahir *</label><input type="date" value={primaryBirthDate} onChange={e => setPrimaryBirthDate(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" />{errors.primaryBirthDate && <p className="text-xs text-red-600">{errors.primaryBirthDate}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold text-sm mb-1">Status Nikah</label><select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50"><option value="Belum Menikah">Lajang</option><option value="Menikah">Menikah</option></select></div>
                <div><label className="block font-bold text-sm mb-1">Pekerjaan *</label><input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" />{errors.occupation && <p className="text-xs text-red-600">{errors.occupation}</p>}</div>
              </div>
              <div><label className="block font-bold text-sm mb-1">Alamat Asal KTP *</label><input type="text" value={primaryAddress} onChange={e => setPrimaryAddress(e.target.value)} className="w-full p-3 border rounded-xl bg-slate-50" />{errors.primaryAddress && <p className="text-xs text-red-600">{errors.primaryAddress}</p>}</div>
              <div className="flex gap-3 mt-6"><button onClick={prevStep} className="w-1/3 py-4 bg-slate-200 font-bold rounded-xl">← Batal</button><button onClick={nextStep} className="w-2/3 py-4 bg-slate-900 text-white font-black rounded-xl">Selanjutnya →</button></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2"><h2 className="font-black text-lg">3. Anggota Kamar</h2><button onClick={() => setOccupants([...occupants, { name:'', phone:'', birth_date:'', relation:'Istri', ktpFile:null }])} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">➕ Tambah</button></div>
              {occupants.length === 0 ? (<div className="p-8 text-center bg-slate-50 rounded-2xl border-dashed border">Tinggal sendiri.</div>) : (
                occupants.map((occ, idx) => {
                  const age = calculateAge(occ.birth_date);
                  return (
                    <div key={idx} className="p-5 bg-slate-50 rounded-2xl border space-y-3">
                      <div className="flex justify-between"><span className="font-black text-sm">Anggota #{idx+1}</span><button onClick={()=>setOccupants(occupants.filter((_,i)=>i!==idx))} className="text-red-600 text-xs font-bold">Hapus</button></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><input type="text" placeholder="Nama" value={occ.name} onChange={e=>{const u=[...occupants]; u[idx].name=e.target.value; setOccupants(u);}} className="w-full p-2.5 border rounded-xl" />{errors[`occ_${idx}_name`] && <p className="text-[10px] text-red-600">{errors[`occ_${idx}_name`]}</p>}</div>
                        <select value={occ.relation} onChange={e=>{const u=[...occupants]; u[idx].relation=e.target.value; setOccupants(u);}} className="w-full p-2.5 border rounded-xl"><option>Istri</option><option>Suami</option><option>Anak</option><option>Saudara</option><option>Teman</option></select>
                        <div><input type="date" value={occ.birth_date} onChange={e=>{const u=[...occupants]; u[idx].birth_date=e.target.value; setOccupants(u);}} className="w-full p-2.5 border rounded-xl" />{errors[`occ_${idx}_birth`] && <p className="text-[10px] text-red-600">{errors[`occ_${idx}_birth`]}</p>}</div>
                      </div>
                      {age >= 17 && (
                        <div><label className="text-xs font-bold block mb-1">Foto KTP Anggota *</label>
                        <input type="file" accept="image/*" onChange={(e)=>{const file = e.target.files?.[0]; if(file){if(!file.type.startsWith('image/')){alert('Harus berupa gambar.'); e.target.value='';}else{const u=[...occupants]; u[idx].ktpFile=file; setOccupants(u);}}}} className="w-full p-2 border rounded-xl bg-white text-xs" />
                        {errors[`occ_${idx}_ktp`] && <p className="text-[10px] text-red-600">{errors[`occ_${idx}_ktp`]}</p>}</div>
                      )}
                    </div>
                  );
                })
              )}
              <div className="flex gap-3 mt-6"><button onClick={prevStep} className="w-1/3 py-4 bg-slate-200 font-bold rounded-xl">← Batal</button><button onClick={nextStep} className="w-2/3 py-4 bg-slate-900 text-white font-black rounded-xl">Selanjutnya →</button></div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-black text-lg border-b pb-2">4. Dokumen & Persetujuan</h2>
              
              <div className="p-5 bg-slate-50 border rounded-2xl">
                <label className="block font-bold text-sm mb-2">🪪 Foto KTP Penanggung Jawab *</label>
                <input type="file" accept="image/*" onChange={handlePrimaryKtpUpload} className="w-full p-2.5 border rounded-xl bg-white text-sm" />
                {errors.ktpFile && <p className="text-xs text-red-600 mt-1">{errors.ktpFile}</p>}
              </div>

              {maritalStatus === 'Menikah' && (
                <div className="p-5 bg-slate-50 border rounded-2xl space-y-3">
                  <div className="flex justify-between items-start"><label className="font-bold text-sm">📎 Dokumen Nikah / KK</label><label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border shadow-sm"><input type="checkbox" checked={pendingDocLater} onChange={e=>setPendingDocLater(e.target.checked)}/> <span className="text-xs font-bold text-slate-700">Menyusul</span></label></div>
                  {!pendingDocLater && (
                    <div className="space-y-3 pt-2">
                      <div><label className="text-[10px] font-bold block mb-1">Foto Buku Nikah</label><input type="file" accept="image/*,.pdf" onChange={e=>setMarriageDoc(e.target.files?.[0]||null)} className="w-full p-2.5 border rounded-xl bg-white text-xs" /></div>
                      <div><label className="text-[10px] font-bold block mb-1">Foto Kartu Keluarga (KK)</label><input type="file" accept="image/*,.pdf" onChange={e=>setKkDoc(e.target.files?.[0]||null)} className="w-full p-2.5 border rounded-xl bg-white text-xs" /></div>
                    </div>
                  )}
                </div>
              )}

              {/* TATA TERTIB DITAMPILKAN DI SINI */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <h3 className="font-black text-sm mb-2">📜 Tata Tertib Properti</h3>
                <div className="font-mono text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded-lg border h-32 overflow-y-auto">
                  {property.house_rules || "1. Wajib lapor diri 1x24 Jam.\n2. Wajib menjaga kebersihan dan ketertiban."}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer border bg-white hover:bg-slate-50">
                  <input type="checkbox" checked={agreedPdp} onChange={e=>setAgreedPdp(e.target.checked)} className="mt-0.5 w-5 h-5" />
                  <span className="text-xs text-slate-700 leading-relaxed">Saya menyatakan data ini benar sesuai <b>UU PDP No. 27/2022</b>.</span>
                </label>
                <label className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer border bg-white hover:bg-slate-50">
                  <input type="checkbox" checked={agreedRules} onChange={e=>setAgreedRules(e.target.checked)} className="mt-0.5 w-5 h-5" />
                  <span className="text-xs text-slate-700 leading-relaxed">Saya menyetujui mematuhi <b>Tata Tertib</b> di atas.</span>
                </label>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={prevStep} className="w-1/3 py-4 bg-slate-200 font-bold rounded-xl">← Kembali</button>
                <button onClick={handleSubmit} disabled={loading} className="w-2/3 py-4 bg-emerald-700 text-white font-black rounded-xl shadow-lg">Kirim Pendaftaran</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}