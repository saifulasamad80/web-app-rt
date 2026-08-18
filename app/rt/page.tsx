'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getRtDashboardBundle, updateTenantStatus, deleteTenant, getDocumentSignedUrl } from '../../src/actions/checkin-tenant';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export default function RtDashboardPage() {
  const [activeTab, setActiveTab] = useState('warga');
  const [authChecking, setAuthChecking] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [docModalUrl, setDocModalUrl] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session && !localStorage.getItem('rt_admin_logged_in')) { window.location.href = '/login'; return; }
      const bundle = await getRtDashboardBundle();
      if(bundle.success) setTenants(bundle.tenants || []);
      setAuthChecking(false);
    }
    init();
  }, []);

  const handleVerifyTenant = async (id: string, status: 'verified' | 'rejected') => {
    if (confirm(`Ubah status warga menjadi: ${status.toUpperCase()}?`)) {
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: status === 'verified' ? 'VERIFIED' : 'REJECTED' } : t));
      await updateTenantStatus(id, status);
    }
  };

  const handleViewDocument = async (filePath: string) => {
    const res = await getDocumentSignedUrl(filePath);
    if (res.success && res.url) setDocModalUrl(res.url); else alert('Gagal muat dokumen.');
  };

  const handleExportWarga = () => {
    const headers = ["Nama Lengkap", "No WhatsApp", "Peran", "Properti", "Kamar", "Tanggal Masuk", "Status Pernikahan", "Status RT"];
    const rows = tenants.map(t => [ `"${t.name||""}"`, `"${t.phone||""}"`, `"${t.relation||(t.is_head?"PJ":"Anggota")}"`, `"${t.properties?.name||""}"`, `"${t.room_number||""}"`, `"${t.entry_date||""}"`, `"${t.marital_status||""}"`, `"${t.status||"PENDING"}"` ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `Laporan_Warga_RT.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-500">Memuat Dasbor RT...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR NAVIGATION (MODERN SAAS) */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col md:min-h-screen flex-shrink-0 shadow-xl z-10">
        <div className="p-6 border-b border-slate-800">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest bg-amber-900/30 px-2 py-1 rounded">Admin RT</span>
          <h1 className="text-xl font-black text-white mt-3">Dasbor Terpadu</h1>
        </div>
        <nav className="flex-1 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          <button onClick={()=>setActiveTab('warga')} className={`flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${activeTab==='warga'?'bg-emerald-600 text-white shadow':'hover:bg-slate-800 text-slate-300'}`}>👥 Data Warga</button>
          <button onClick={()=>setActiveTab('properti')} className={`flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${activeTab==='properti'?'bg-slate-700 text-white shadow':'hover:bg-slate-800 text-slate-300'}`}>🏢 Unit Kos (Dev)</button>
          <button onClick={()=>setActiveTab('kas')} className={`flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${activeTab==='kas'?'bg-slate-700 text-white shadow':'hover:bg-slate-800 text-slate-300'}`}>💰 Iuran (Dev)</button>
          <div className="flex-1 hidden md:block"></div>
          <button onClick={()=>{localStorage.removeItem('rt_admin_logged_in'); supabase.auth.signOut().then(()=>window.location.href='/');}} className="flex-shrink-0 text-left px-4 py-3 rounded-xl font-bold text-sm text-red-400 hover:bg-red-950/50 transition-colors mt-auto cursor-pointer">🚪 Keluar</button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        {activeTab === 'warga' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Buku Register Warga</h2>
                <p className="text-sm text-slate-500 mt-1">Verifikasi dokumen kependudukan sesuai UU PDP.</p>
              </div>
              <button onClick={handleExportWarga} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors">📥 Export Excel</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                  <tr><th className="p-4 rounded-tl-xl">Warga & Kontak</th><th className="p-4">Kamar</th><th className="p-4">Status Sipil</th><th className="p-4">Dokumen (UU PDP)</th><th className="p-4">Status RT</th><th className="p-4 text-right rounded-tr-xl">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map(t => {
                    const pj = tenants.find(item => item.household_id && item.household_id === t.household_id && item.is_head);
                    const marital = (t.marital_status || '').toLowerCase();
                    const isMarried = marital === 'menikah' || marital === 'menikah (pasutri)';
                    const hasKtp = !!t.ktp_path;
                    const showMarriage = isMarried && !!(t.marriage_doc_url || pj?.marriage_doc_url);
                    const showKk = t.is_head && !!(t.kk_doc_url || pj?.kk_doc_url);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-black text-slate-900 text-base">{t.name}</div>
                          <span className="text-xs text-slate-500 font-mono">{t.phone||'-'}</span>
                          <div className="mt-1"><span className={`text-[10px] font-black px-2 py-0.5 rounded border ${t.is_head?'bg-amber-100 text-amber-800 border-amber-200':'bg-white text-slate-600'}`}>{t.relation||(t.is_head?'PJ':'Anggota')}</span></div>
                        </td>
                        <td className="p-4 font-bold text-slate-700">{t.room_number||'-'}<br/><span className="text-[10px] text-slate-400 font-normal">{t.properties?.name||'Kos'}</span></td>
                        <td className="p-4 font-semibold text-slate-700">{t.marital_status||'Lajang'}</td>
                        <td className="p-4 space-x-2">
                          {hasKtp ? <button onClick={()=>handleViewDocument(t.ktp_path)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] rounded-lg font-black cursor-pointer transition-colors shadow-sm">🪪 KTP</button> : <span className="text-[10px] text-slate-300 font-bold bg-slate-100 px-2 py-1 rounded">KTP -</span>}
                          {showMarriage ? <button onClick={()=>handleViewDocument(t.marriage_doc_url || pj?.marriage_doc_url)} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] rounded-lg font-black cursor-pointer transition-colors shadow-sm">📎 NIKAH</button> : (isMarried && !showMarriage ? <span className="text-[10px] text-red-500 font-bold">⚠️ Tdk Ada</span> : <span className="text-[10px] text-slate-300 font-bold bg-slate-100 px-2 py-1 rounded">NIKAH -</span>)}
                          {showKk ? <button onClick={()=>handleViewDocument(t.kk_doc_url || pj?.kk_doc_url)} className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 text-[10px] rounded-lg font-black cursor-pointer transition-colors shadow-sm">📁 KK</button> : (t.is_head ? <span className="text-[10px] text-red-500 font-bold">⚠️ Tdk Ada</span> : <span className="text-[10px] text-slate-300 font-bold bg-slate-100 px-2 py-1 rounded">KK -</span>)}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${t.status==='VERIFIED'?'bg-emerald-100 text-emerald-800':t.status==='REJECTED'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>
                            {t.status==='VERIFIED'?'✅ SAH':t.status==='REJECTED'?'❌ DITOLAK':'⏳ PENDING'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {t.status!=='VERIFIED' && <button onClick={()=>handleVerifyTenant(t.id, 'verified')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm">Setujui</button>}
                          <button onClick={()=>handleVerifyTenant(t.id, 'rejected')} className="px-3 py-1.5 bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors">Tolak</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab !== 'warga' && (
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 text-center animate-fade-in">
            <h2 className="text-xl font-black text-slate-400">Modul {activeTab.toUpperCase()} Sedang Dalam Tahap Pengembangan (Dev)</h2>
            <p className="text-sm text-slate-500 mt-2">Silakan kembali ke tab Data Warga.</p>
          </div>
        )}
      </main>

      {/* LIGHTBOX GALLERY FULLSCREEN MODAL UNTUK DOKUMEN (Anti-Nyangkut) */}
      {docModalUrl && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-10 animate-fade-in">
          <button onClick={() => setDocModalUrl(null)} className="absolute top-6 right-6 text-white bg-white/10 hover:bg-red-600 w-12 h-12 rounded-full text-2xl font-black cursor-pointer transition-all shadow-xl flex items-center justify-center">✕</button>
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <img src={docModalUrl} alt="Dokumen Resmi" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/20" />
            <p className="text-white/60 text-xs mt-6 font-mono font-medium tracking-widest uppercase">Tampilan Dokumen Privat (Aman UU PDP)</p>
          </div>
        </div>
      )}
    </div>
  );
}