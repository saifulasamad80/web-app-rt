'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
  getAllTenantsForRt,
  getPublicPropertiesList,
  updateTenantStatus,
  updateProperty,
  getDocumentSignedUrl,
  deleteTenant,
  getDuesAuditLogs,
  recordRtDues,
  getRtOfficers,
  addRtOfficer,
  updateRtOfficer,
  deleteRtOfficer,
  resetOfficerPasswordBySuperAdmin,
} from '../../src/actions/checkin-tenant';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function RtDashboardPage() {
  const router = useRouter();
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'warga' | 'properti' | 'pengurus' | 'kas' | 'audit'>('warga');
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form Iuran Kas
  const [payerName, setPayerName] = useState('');
  const [unitRoom, setUnitRoom] = useState('');
  const [duesAmount, setDuesAmount] = useState('50000');
  const [duesMonth, setDuesMonth] = useState('Agustus');
  const [duesYear, setDuesYear] = useState('2026');
  const [savingDues, setSavingDues] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  // ... (State lain tetap sama)
  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);
  const [officerName, setOfficerName] = useState('');
  const [officerRole, setOfficerRole] = useState('SEKRETARIS');
  const [officerPhone, setOfficerPhone] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerInitialPassword, setOfficerInitialPassword] = useState('admin12345');
  const [savingOfficer, setSavingOfficer] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<any | null>(null);

  useEffect(() => {
    async function checkAuthAndLoad() {
      const { data } = await supabase.auth.getSession();
      if (!data.session && !localStorage.getItem('rt_admin_logged_in')) {
        window.location.href = '/login';
        return;
      }
      setCurrentUserEmail(data.session?.user?.email || 'ajipsas@gmail.com');
      setAuthChecking(false);
      await loadAllData();
    }
    checkAuthAndLoad();
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    const [tRes, pRes, oRes, aRes] = await Promise.all([
      getAllTenantsForRt(),
      getPublicPropertiesList(),
      getRtOfficers(),
      getDuesAuditLogs(),
    ]);
    setTenants(tRes.tenants || []);
    setProperties(pRes.properties || []);
    setOfficers(oRes.officers || []);
    setAuditLogs(aRes.logs || []);
    setLoadingData(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') localStorage.removeItem('rt_admin_logged_in');
    window.location.href = '/';
  };

  const handleRecordDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName || !unitRoom || !duesAmount) {
      alert('Pilih Warga, Unit, dan Nominal.');
      return;
    }
    setSavingDues(true);
    const res = await recordRtDues(payerName, unitRoom, parseInt(duesAmount), duesMonth, duesYear, 'Pengurus RT');
    setSavingDues(false);
    if (res.success) {
      setCopyMsg('Iuran berhasil dicatat.');
      setTimeout(() => setCopyMsg(''), 3000);
      loadAllData();
    }
  };

  if (authChecking) return null;

  return (
    <main style={{ fontSize: `${zoomPercent}%` }} className="min-h-screen p-8 bg-slate-50 text-slate-900 font-sans">
      {activeTab === 'kas' && (
        <div className="bg-white p-6 rounded-3xl border-2 shadow-sm space-y-4">
          <h3 className="font-black text-lg">Catat Iuran Kas RT</h3>
          <form onSubmit={handleRecordDuesSubmit} className="space-y-4">
            <div>
              <label className="block font-bold mb-1">Nama Pembayar / Warga *</label>
              <select value={payerName} onChange={(e) => setPayerName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white">
                <option value="">Pilih Nama Warga / Pemilik</option>
                {tenants.map(t => <option key={t.id} value={t.name}>{t.name} (Warga - {t.room_number})</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Nomor Rumah / Unit Kos *</label>
              <select value={unitRoom} onChange={(e) => setUnitRoom(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white">
                <option value="">Pilih Unit</option>
                {properties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full py-3 bg-emerald-700 text-white font-black rounded-xl">Simpan Iuran</button>
          </form>
        </div>
      )}
    </main>
  );
}
