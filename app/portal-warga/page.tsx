'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { loginTenantPortal, getDocumentSignedUrl } from '../../src/actions/checkin-tenant';

export default function PortalWarga() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [tenantData, setTenantData] = useState<any>(null);
  const [duesHistory, setDuesHistory] = useState<any[]>([]);
  const [viewDocUrl, setViewDocUrl] = useState<string|null>(null);
  const [docModalTitle, setDocModalTitle] = useState('');
  const [showRules, setShowRules] = useState(false);
  
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true); setLoginError('');
    const res = await loginTenantPortal(loginPhone, loginPin);
    setLoginLoading(false);
    
    if(res.success && res.tenant) {
      setIsLoggedIn(true);
      setTenantData(res.tenant);
      setDuesHistory(res.dues || []);
    } else {
      setLoginError(res.error || 'Nomor WA atau PIN Tahun Lahir salah.');
    }
  };

  const openDocument = async (path: string, title: string) => {
    if(!path) return;
    const res = await getDocumentSignedUrl(path);
    if(res.success && res.url) {
      setViewDocUrl(res.url); setDocModalTitle(title);
    } else {
      alert('Gagal memuat dokumen.');
    }
  };

  // FUNGSI BARU: LAPOR PAK RT
  const handleLaporRT = () => {
    // TODO: Ganti nomor di bawah dengan nomor WA asli pengurus RT (gunakan format 62...)
    const nomorWA_RT = "6281234567890"; 
    
    const namaWarga = tenantData?.name || "Warga";
    const namaProperti = tenantData?.properties?.name || "Lingkungan RT";
    const noKamar = tenantData?.room_number ? `(Kamar ${tenantData.room_number})` : '';
    
    const pesan = `Halo Pak RT, saya *${namaWarga}* dari properti *${namaProperti}* ${noKamar}.%0A%0AIngin melaporkan / menginformasikan terkait:%0A%0A_[Tulis laporan/komplain Anda di sini...]_`;
    
    window.open(`https://wa.me/${nomorWA_RT}?text=${pesan}`, '_blank');
  };

  const handleCopyRekening = () => {
    const rek = tenantData?.properties?.bank_account_number;
    const bank = tenantData?.properties?.bank_name;
    if(rek) {
      navigator.clipboard.writeText(rek);
      alert(`Nomor Rekening ${bank} berhasil disalin!`);
    }
  };

  if(!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans flex flex-col justify-center items-center relative overflow-hidden">
        <div className="max-w-md w-full space-y-6 relative z-10">
          <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div><h1 className="text-lg font-black text-slate-900">Portal Dasbor Warga</h1></div>
            <Link href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors">🚪 Beranda</Link>
          </header>

          <form onSubmit={handleLoginSubmit} className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-200/50 border border-slate-100 text-center space-y-8 animate-fade-in">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">🛡️</div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Akses Ruang Privat</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">Sistem dilengkapi autentikasi ganda (2FA) untuk menjaga privasi data Anda.</p>
            </div>
            
            {loginError && <div className="p-3 text-red-700 bg-red-50 rounded-xl text-sm font-bold border border-red-200 animate-slide-up">{loginError}</div>}
            
            <div className="space-y-5 text-left">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">1. NOMOR WHATSAPP ANDA</label>
                <input type="tel" required placeholder="08xxxxxxxx" value={loginPhone} onChange={e=>setLoginPhone(e.target.value.replace(/\D/g,''))} className="w-full p-4 border-2 border-slate-100 rounded-2xl font-mono text-sm font-bold focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="flex items-center justify-between text-xs font-black text-slate-700 mb-2 uppercase tracking-widest">
                  <span>2. TAHUN LAHIR ANDA (PIN)</span>
                  <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-black">ℹ️ PETUNJUK</span>
                </label>
                <input type="password" required maxLength={4} placeholder="C t h :  1 9 9 0" value={loginPin} onChange={e=>setLoginPin(e.target.value.replace(/\D/g,''))} className="w-full p-4 border-2 border-slate-100 rounded-2xl text-center text-2xl tracking-[0.5em] font-black bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition-colors" />
                <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">4 Digit Tahun Lahir sesuai data KTP.</p>
              </div>
            </div>
            
            <div className="pt-2">
              <button type="submit" disabled={loginLoading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-base rounded-2xl shadow-lg shadow-blue-600/30 cursor-pointer transition-colors disabled:bg-slate-300 disabled:shadow-none">
                {loginLoading ? 'Memverifikasi...' : 'Buka Dasbor Saya'}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        
        {/* Header Profil */}
        <header className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
           <div className={`absolute top-0 left-0 w-2 h-full ${tenantData?.status==='PENDING'?'bg-amber-400':tenantData?.status==='VERIFIED'?'bg-emerald-500':'bg-slate-300'}`}></div>
           <div className="pl-2">
             <h1 className="text-2xl font-black text-slate-900">{tenantData?.name}</h1>
             <p className="text-sm text-slate-500 font-medium mt-1">{tenantData?.properties?.name} • {tenantData?.properties?.type==='kos'?'Kamar':'Blok/Rumah'} {tenantData?.room_number}</p>
             <div className="flex gap-2 mt-3">
               <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider border ${tenantData?.status==='PENDING'?'bg-amber-50 text-amber-800 border-amber-200':tenantData?.status==='VERIFIED'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  RT: {tenantData?.status==='PENDING'?'⏳ MENUNGGU SAH':tenantData?.status==='VERIFIED'?'✅ SAH TERDAFTAR':tenantData?.status}
               </span>
               <span className="text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  {tenantData?.is_head ? '👑 Penanggung Jawab' : '👤 Anggota'}
               </span>
             </div>
           </div>
           <button onClick={()=>window.location.reload()} className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-xl transition-colors border border-red-100 w-full md:w-auto">🔒 Keluar</button>
        </header>

        {/* UI BARU: TOMBOL LAPOR PAK RT */}
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h4 className="font-black text-emerald-900 text-lg">Pusat Bantuan Lingkungan</h4>
            <p className="text-sm text-emerald-700 mt-1 font-medium">Ada masalah keamanan, keluhan tetangga, atau fasilitas RT? Hubungi pengurus.</p>
          </div>
          <button onClick={handleLaporRT} className="w-full md:w-auto whitespace-nowrap px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2">
            <span className="text-xl">💬</span> Lapor Pak RT
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Kartu Tagihan */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">💳</div>
               <h3 className="font-black text-lg text-slate-900">Info Tagihan Sewa</h3>
             </div>
             
             {tenantData?.is_head ? (
               <>
                 <div className="p-4 bg-slate-50 rounded-2xl border">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Bulan Ini</p>
                    <div className="flex items-end gap-3">
                      <h4 className="text-2xl font-black text-slate-900">Rp {Number(tenantData?.rent_price || 0).toLocaleString('id-ID')}</h4>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md mb-1 border ${tenantData?.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                        {tenantData?.payment_status === 'PAID' ? 'LUNAS' : 'BELUM DIBAYAR'}
                      </span>
                    </div>
                 </div>
                 <div className="space-y-3 pt-2">
                   <p className="text-xs font-bold text-slate-700">Rekening Tujuan Pembayaran:</p>
                   <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-xl">
                     <div>
                       <p className="font-black text-blue-900">{tenantData?.properties?.bank_name}</p>
                       <p className="font-mono text-sm text-blue-800 mt-0.5">{tenantData?.properties?.bank_account_number}</p>
                       <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">A/N: {tenantData?.properties?.bank_account_holder}</p>
                     </div>
                     <button onClick={handleCopyRekening} className="px-3 py-2 bg-white text-blue-700 text-[10px] font-black rounded-lg border border-blue-200 shadow-sm hover:bg-blue-100">SALIN</button>
                   </div>
                 </div>
               </>
             ) : (
               <div className="p-4 bg-slate-50 rounded-2xl border text-center text-sm text-slate-500 font-medium">
                 Anda terdaftar sebagai anggota. Info tagihan hanya ditampilkan di dasbor Penanggung Jawab.
               </div>
             )}
           </div>

           {/* Kartu Informasi & Aturan */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5 flex flex-col">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl">📜</div>
               <h3 className="font-black text-lg text-slate-900">Informasi Properti</h3>
             </div>
             
             <div className="flex-1 space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
                   <div><p className="text-[10px] font-black text-slate-500 uppercase">Kontak Owner</p><p className="font-bold text-sm text-slate-900 mt-1">{tenantData?.properties?.owner_name}</p></div>
                   <a href={`https://wa.me/${(tenantData?.properties?.owner_phone||'').replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200">Chat WA</a>
                </div>
                {tenantData?.properties?.manager_name && (
                  <div className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
                     <div><p className="text-[10px] font-black text-slate-500 uppercase">Pengelola / Penjaga</p><p className="font-bold text-sm text-slate-900 mt-1">{tenantData?.properties?.manager_name}</p></div>
                     <a href={`https://wa.me/${(tenantData?.properties?.manager_phone||'').replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg hover:bg-amber-200">Chat WA</a>
                  </div>
                )}
             </div>

             <button onClick={()=>setShowRules(true)} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-sm transition-colors">Lihat Tata Tertib</button>
           </div>
        </div>

        {/* Riwayat Kas RT untuk warga */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-xl">🧾</div>
             <h3 className="font-black text-lg text-slate-900">Riwayat Pembayaran Kas Lingkungan</h3>
           </div>
           
           <div className="space-y-3">
             {duesHistory.length > 0 ? (
               duesHistory.map(d => (
                 <div key={d.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
                   <div>
                     <p className="font-black text-sm text-slate-900">Periode: {d.period}</p>
                     <p className="text-[10px] text-slate-500 font-bold mt-1">Dicatat pada: {new Date(d.created_at).toLocaleDateString('id-ID')}</p>
                   </div>
                   <span className="font-mono font-black text-emerald-600">Rp {Number(d.amount).toLocaleString('id-ID')}</span>
                 </div>
               ))
             ) : (
               <p className="text-center text-sm text-slate-500 font-medium py-4 bg-slate-50 rounded-2xl border">Belum ada riwayat pembayaran kas RT yang tercatat atas nama Anda.</p>
             )}
           </div>
        </div>
        
      </div>

      {/* Modal Tata Tertib */}
      {showRules && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border">
            <div className="p-5 bg-amber-100 text-amber-900 flex justify-between items-center"><h3 className="font-black">📜 Tata Tertib Properti</h3><button onClick={() => setShowRules(false)} className="text-xl font-bold hover:text-red-500">✕</button></div>
            <div className="p-6 bg-slate-50 max-h-[60vh] overflow-y-auto">
               <div className="whitespace-pre-wrap font-mono text-xs text-slate-700 leading-relaxed bg-white p-4 rounded-xl border">
                 {tenantData?.properties?.house_rules || "Belum ada tata tertib yang diatur oleh pemilik."}
               </div>
            </div>
            <div className="p-4 bg-white border-t flex justify-end"><button onClick={()=>setShowRules(false)} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors">Tutup</button></div>
          </div>
        </div>
      )}

    </main>
  );
}