'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRtDashboardData, verifyTenantByRt, approvePropertyByRt, resetPropertyPinByRt } from '../../src/actions/rt-actions';
import { getTenantKtpUrl } from '../../src/actions/checkin-tenant';
import { submitDuesPayment } from '../../src/actions/manage-dues';
import { logoutAdminRT } from '../../src/actions/auth';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  address_ktp: string;
  entry_date: string;
  status: string;
  relation?: string;
  room_number?: string;
  full_address?: string;
  household_id?: string;
  is_head?: boolean;
  birth_date?: string;
  ktp_url?: string;
  ktp_path?: string;
  property_id?: string;
  properties?: { id: string; name: string; type: string; slug: string };
}

interface Property {
  id: string;
  name: string;
  property_name?: string;
  type: string;
  slug: string;
  address?: string;
  status?: string;
  pin_code?: string;
  failed_pin_attempts?: number;
  pin_locked_until?: string;
}

export default function RtDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [selectedKtpUrl, setSelectedKtpUrl] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState<string>('');
  const [loadingKtp, setLoadingKtp] = useState<boolean>(false);
  const [ktpErrorMsg, setKtpErrorMsg] = useState<string>('');

  const [resetPinProp, setResetPinProp] = useState<Property | null>(null);
  const [newPinInput, setNewPinInput] = useState('1234');
  const [resetMsg, setResetMsg] = useState('');
  const [resettingPin, setResettingPin] = useState(false);

  // Form Iuran Kas RT
  const [duesName, setDuesName] = useState('');
  const [duesHouse, setDuesHouse] = useState('');
  const [duesAmount, setDuesAmount] = useState('50000');
  const [duesMonth, setDuesMonth] = useState('Agustus 2026');
  const [duesMsg, setDuesMsg] = useState('');
  const [submittingDues, setSubmittingDues] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const res = await getRtDashboardData();
    setProperties(res.properties || []);
    setTenants(res.tenants || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyTenant = async (id: string, newStatus: 'VERIFIED' | 'REJECTED' | 'ACTIVE') => {
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    await verifyTenantByRt(id, newStatus);
    await loadData();
  };

  const handleApproveProperty = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    await approvePropertyByRt(id, newStatus);
    await loadData();
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinProp || !newPinInput) return;

    setResettingPin(true);
    const res = await resetPropertyPinByRt(resetPinProp.id, newPinInput);
    setResettingPin(false);

    if (res.success) {
      setResetMsg(`🔑 PIN untuk ${resetPinProp.name || resetPinProp.property_name} berhasil direset ke: ${newPinInput}`);
      setTimeout(() => setResetMsg(''), 4000);
      setResetPinProp(null);
      await loadData();
    } else {
      alert('Gagal reset PIN: ' + res.error);
    }
  };

  const handleViewKtp = async (tenant: Tenant) => {
    const targetPath = tenant.ktp_url || tenant.ktp_path;
    setSelectedTenantName(tenant.name);
    setLoadingKtp(true);
    setKtpErrorMsg('');
    setSelectedKtpUrl(null);

    if (!targetPath) {
      setLoadingKtp(false);
      setKtpErrorMsg('Warga ini tidak memiliki lampiran foto KTP.');
      return;
    }

    const res = await getTenantKtpUrl(targetPath);
    setLoadingKtp(false);

    if (res && res.success && res.url) {
      setSelectedKtpUrl(res.url);
    } else {
      setKtpErrorMsg(res?.error || 'Gagal membuka berkas KTP.');
    }
  };

  const handleDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duesName || !duesAmount) return;
    setSubmittingDues(true);
    const formData = new FormData();
    formData.append('resident_name', duesName);
    formData.append('house_number', duesHouse || 'Griya Alfatihah 78');
    formData.append('amount', duesAmount);
    formData.append('period_month', duesMonth);

    const res = await submitDuesPayment(formData);
    setSubmittingDues(false);

    if (res && res.success) {
      setDuesMsg('Pembayaran iuran kas atas nama "' + duesName + '" berhasil dicatat!');
      setDuesName('');
      setDuesHouse('');
      setTimeout(() => setDuesMsg(''), 4000);
    } else {
      alert('Gagal mencatat iuran: ' + (res?.error || 'Kesalahan teknis'));
    }
  };

  // FOTO 3: KELUAR DARI DASBOR RT KEMBALI KE HALAMAN UTAMA /
  const handleLogout = async () => {
    await logoutAdminRT();
    window.location.href = '/';
  };

  const calculateAge = (dobString?: string): number => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const exportCSV = () => {
    const headers = ['Nama Warga', 'Hubungan', 'Lokasi Unit/Kamar', 'Asal KTP', 'WhatsApp', 'Tanggal Masuk', 'Status Verifikasi RT'];
    const rows = filteredTenants.map((t) => [
      `"${t.name}"`,
      `"${t.relation || (t.is_head ? 'Kepala Keluarga' : 'Anggota')}"`,
      `"${t.room_number ? 'Kamar ' + t.room_number : t.full_address || t.properties?.name}"`,
      `"${t.address_ktp}"`,
      `"${t.phone}"`,
      `"${t.entry_date}"`,
      `"${t.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Buku_Register_Warga_RT_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      (t.address_ktp || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProperty =
      selectedProperty === 'ALL' || t.property_id === selectedProperty || t.properties?.id === selectedProperty;

    const st = (t.status || '').toUpperCase();
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'PENDING' && (st === 'PENDING' || st === 'ACTIVE')) ||
      (selectedStatus === 'VERIFIED' && st === 'VERIFIED');

    return matchesSearch && matchesProperty && matchesStatus;
  });

  const pendingProperties = properties.filter((p) => p.status !== 'APPROVED');
  const approvedProperties = properties.filter((p) => p.status === 'APPROVED');

  return (
    <main className="min-h-screen bg-slate-100 p-3 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER DASBOR RT */}
        <div className="bg-slate-900 text-white p-5 md:p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-500 text-slate-950 rounded uppercase">
              PORTAL PENGURUS RT / KEPENDUDUKAN
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold mt-2 text-white">Dasbor Pengurus RT Terpadu</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Buku Register Warga Pendatang, Verifikasi & Reset PIN Properti, Kas Iuran RT
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={exportCSV}
              className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all shadow"
            >
              📊 Ekspor CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-700 border border-slate-700 transition-all"
            >
              🖨️ Cetak
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-all shadow flex items-center gap-1"
            >
              🚪 Keluar ke Utama
            </button>
          </div>
        </div>

        {resetMsg && (
          <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold">
            {resetMsg}
          </div>
        )}

        {/* PANEL PERMOHONAN PROPERTI BARU */}
        {pendingProperties.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <span>⚠️</span>
              <h3>Permohonan Pendaftaran Properti Kos/Kontrakan Baru ({pendingProperties.length})</h3>
            </div>
            <p className="text-xs text-amber-800">
              Berikut adalah pemilik unit baru yang mendaftar mandiri di wilayah RT Anda. Verifikasi lokasi untuk memberikan izin operasional publik.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {pendingProperties.map((p) => (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded uppercase">
                        {p.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">/checkin/{p.slug}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{p.name || p.property_name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{p.address || 'Alamat tidak dicantumkan'}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleApproveProperty(p.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
                    >
                      Tolak
                    </button>
                    <button
                      onClick={() => handleApproveProperty(p.id, 'APPROVED')}
                      className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 shadow-sm"
                    >
                      ✅ Setujui Properti
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL MANAJEMEN PIN KOS/KONTRAKAN TERDAFTAR */}
        <div className="bg-white p-5 rounded-2xl shadow border border-slate-200 space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase">
              🔑 Manajemen PIN Operasional Pemilik Unit ({properties.length})
            </h3>
            <span className="text-[11px] text-slate-500">Fitur Bantuan RT</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {properties.map((p) => (
              <div key={p.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{p.name || p.property_name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-500">PIN: <b>{p.pin_code || '1234'}</b></span>
                    {p.pin_locked_until && new Date(p.pin_locked_until) > new Date() && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-red-100 text-red-700 rounded">TERKUNCI</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setResetPinProp(p); setNewPinInput(p.pin_code || '1234'); }}
                  className="px-2.5 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-900"
                >
                  🔑 Reset PIN
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* STATS CARDS RT */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Warga</span>
            <p className="text-2xl md:text-3xl font-black text-slate-900 mt-1">{tenants.length}</p>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
            <span className="text-xs font-bold text-amber-800 uppercase">Perlu RT</span>
            <p className="text-2xl md:text-3xl font-black text-amber-600 mt-1">
              {tenants.filter((t) => (t.status || '').toUpperCase() === 'PENDING' || (t.status || '').toUpperCase() === 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
            <span className="text-xs font-bold text-emerald-800 uppercase">Verified</span>
            <p className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">
              {tenants.filter((t) => (t.status || '').toUpperCase() === 'VERIFIED').length}
            </p>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Unit Properti</span>
            <p className="text-2xl md:text-3xl font-black text-slate-800 mt-1">{approvedProperties.length}</p>
          </div>
        </div>

        {/* PANEL FILTER & CARI */}
        <div className="bg-white p-4 rounded-2xl shadow border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pencarian Warga / WA / Asal</label>
            <input
              type="text"
              placeholder="Cari nama, nomor telepon, asal kota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Unit Properti</label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl outline-none bg-white font-semibold"
            >
              <option value="ALL">🏢 Semua Kos & Kontrakan ({properties.length})</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.property_name} ({p.type?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Verifikasi RT</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs p-2.5 border rounded-xl outline-none bg-white font-semibold"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">⚠️ Menunggu Verifikasi RT</option>
              <option value="VERIFIED">✅ Terverifikasi Resmi RT</option>
            </select>
          </div>
        </div>

        {/* TABEL DATA PENDUDUK RT DENGAN RESPONSIVE MOBILE CARD */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Daftar Lengkap Warga Pendatang Sementara
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              Menampilkan {filteredTenants.length} data
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-semibold">Memuat data kependudukan RT...</div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              Tidak ada data warga pendatang yang cocok dengan kriteria pencarian.
            </div>
          ) : (
            <>
              {/* MOBILE CARD VIEW FOR RT */}
              <div className="block md:hidden p-3 space-y-3">
                {filteredTenants.map((t) => {
                  const isVerified = (t.status || '').toUpperCase() === 'VERIFIED';
                  const age = calculateAge(t.birth_date);
                  const location = t.room_number ? `Kamar ${t.room_number}` : (t.full_address || 'Kos Melati 1');

                  return (
                    <div key={t.id} className="p-4 bg-slate-50 border rounded-xl space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{t.name}</h3>
                          <div className="flex gap-1 mt-0.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded">
                              {t.relation || (t.is_head ? 'Penanggung Jawab' : 'Anggota')}
                            </span>
                            {age > 0 && <span className="text-[9px] text-slate-500">{age} Thn</span>}
                          </div>
                        </div>
                        {isVerified ? (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                            ✅ VERIFIED
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                            ⚠️ MENUNGGU
                          </span>
                        )}
                      </div>

                      <div className="text-xs space-y-1 text-slate-600 font-medium border-t pt-2 border-slate-200">
                        <p>🏠 <b>Unit:</b> {location} ({t.properties?.name || 'Kos Melati 1'})</p>
                        <p>📍 <b>KTP Asal:</b> {t.address_ktp || '-'}</p>
                        <p>📱 <b>WA:</b> {t.phone}</p>
                        <p>📅 <b>Masuk:</b> {t.entry_date}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleViewKtp(t)}
                          className="flex-1 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg"
                        >
                          🪪 Periksa KTP
                        </button>
                        {!isVerified ? (
                          <button
                            onClick={() => handleVerifyTenant(t.id, 'VERIFIED')}
                            className="flex-1 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-lg"
                          >
                            ✓ Setujui RT
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerifyTenant(t.id, 'ACTIVE')}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW FOR RT */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700 font-bold uppercase text-[10px]">
                      <th className="p-3">Nama Warga & Peran</th>
                      <th className="p-3">Lokasi Unit & Kamar</th>
                      <th className="p-3">Kota Asal KTP</th>
                      <th className="p-3">Kontak WA</th>
                      <th className="p-3">Dokumen KTP</th>
                      <th className="p-3">Mulai Menetap</th>
                      <th className="p-3">Status RT</th>
                      <th className="p-3 text-right print:hidden">Aksi Verifikasi RT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTenants.map((t) => {
                      const isVerified = (t.status || '').toUpperCase() === 'VERIFIED';
                      const age = calculateAge(t.birth_date);
                      const location = t.room_number ? `Kamar ${t.room_number}` : (t.full_address || 'Kos Melati 1');

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{t.name}</div>
                            <div className="flex gap-1.5 mt-0.5">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded">
                                {t.relation || (t.is_head ? 'Penanggung Jawab' : 'Anggota')}
                              </span>
                              {age > 0 && <span className="text-[9px] text-slate-500">{age} Thn</span>}
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="font-semibold text-emerald-800 block">{location}</span>
                            <span className="text-[10px] text-slate-500">{t.properties?.name || 'Kos Melati 1'}</span>
                          </td>

                          <td className="p-3 font-medium text-slate-700">{t.address_ktp || '-'}</td>

                          <td className="p-3 font-mono text-slate-800">{t.phone}</td>

                          <td className="p-3">
                            <button
                              onClick={() => handleViewKtp(t)}
                              className="px-2.5 py-1 bg-slate-800 text-white text-[10px] font-semibold rounded hover:bg-slate-900 transition-colors"
                            >
                              🪪 Periksa KTP
                            </button>
                          </td>

                          <td className="p-3 font-mono">{t.entry_date}</td>

                          <td className="p-3">
                            {isVerified ? (
                              <span className="text-[10px] font-extrabold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                                ✅ VERIFIED RT
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                                ⚠️ MENUNGGU RT
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right space-x-1.5 print:hidden">
                            {!isVerified ? (
                              <button
                                onClick={() => handleVerifyTenant(t.id, 'VERIFIED')}
                                className="px-3 py-1.5 bg-emerald-700 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-800 transition-all shadow-sm"
                              >
                                ✓ Setujui RT
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerifyTenant(t.id, 'ACTIVE')}
                                className="px-2.5 py-1.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-300"
                              >
                                Batal Verifikasi
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* MODUL MANAJEMEN IURAN & KAS RT */}
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow border border-slate-200 space-y-4 print:hidden">
          <h2 className="text-base font-bold text-slate-900 uppercase border-b pb-2">
            Pencatatan Iuran Kas Warga
          </h2>

          {duesMsg && (
            <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold">
              {duesMsg}
            </div>
          )}

          <form onSubmit={handleDuesSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Warga / Pembayar *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Saiful"
                value={duesName}
                onChange={(e) => setDuesName(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor Rumah / Blok</label>
              <input
                type="text"
                placeholder="Griya Alfatihah 78"
                value={duesHouse}
                onChange={(e) => setDuesHouse(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nominal Iuran (Rp) *</label>
              <input
                type="number"
                required
                value={duesAmount}
                onChange={(e) => setDuesAmount(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Periode Bulan *</label>
              <input
                type="text"
                required
                placeholder="Agustus 2026"
                value={duesMonth}
                onChange={(e) => setDuesMonth(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submittingDues}
                className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all disabled:bg-slate-400"
              >
                {submittingDues ? 'Mencatat...' : 'Catat Iuran'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* MODAL RESET PIN */}
      {resetPinProp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold">🔑 Reset PIN Pemilik Unit</h3>
              <button onClick={() => setResetPinProp(null)} className="text-slate-400 hover:text-white font-bold text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleResetPinSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{resetPinProp.name || resetPinProp.property_name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Atur ulang PIN 4-digit untuk pemilik unit yang lupa PIN:</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN 4-Digit Baru</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="Contoh: 1234"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-2xl tracking-[0.5em] p-3 border-2 border-slate-300 rounded-xl font-mono focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPinProp(null)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resettingPin || newPinInput.length !== 4}
                  className="flex-1 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 disabled:bg-slate-300 shadow transition-all"
                >
                  {resettingPin ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PERIKSA KTP */}
      {(selectedTenantName || loadingKtp) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <span>🛡️ Verifikasi Fisik KTP RT:</span>
                <span className="text-emerald-400">{selectedTenantName}</span>
              </h3>
              <button
                onClick={() => { setSelectedKtpUrl(null); setSelectedTenantName(''); setKtpErrorMsg(''); }}
                className="text-slate-400 hover:text-white font-bold text-base leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center min-h-[200px] bg-slate-50">
              {loadingKtp ? (
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500 font-semibold">Memuat Tautan KTP Terenkripsi...</p>
                </div>
              ) : ktpErrorMsg ? (
                <div className="text-center space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-semibold text-amber-800">{ktpErrorMsg}</p>
                </div>
              ) : selectedKtpUrl ? (
                <div className="space-y-3 w-full text-center">
                  <img
                    src={selectedKtpUrl}
                    alt="KTP Warga Pendatang"
                    className="max-h-[350px] w-auto mx-auto rounded-xl border shadow-sm object-contain"
                  />
                  <p className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-semibold">
                    🔒 Akses Khusus Pengurus RT.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="p-3 bg-slate-100 text-right">
              <button
                onClick={() => { setSelectedKtpUrl(null); setSelectedTenantName(''); setKtpErrorMsg(''); }}
                className="px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
