'use client';

import React, { useEffect, useState } from 'react';
import { getRtDashboardData, verifyTenantByRt, approvePropertyByRt } from '../src/actions/rt-actions';
import { getTenantKtpUrl } from '../src/actions/checkin-tenant';
import { submitDuesPayment } from '../src/actions/manage-dues';
import { logoutAdminRT } from '../src/actions/auth';

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
}

export default function UnifiedRtDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // State KTP Modal
  const [selectedKtpUrl, setSelectedKtpUrl] = useState<string | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState<string>('');
  const [loadingKtp, setLoadingKtp] = useState<boolean>(false);
  const [ktpErrorMsg, setKtpErrorMsg] = useState<string>('');

  // State Form Iuran Kas RT
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
    formData.append('house_number', duesHouse);
    formData.append('amount', duesAmount);
    formData.append('period_month', duesMonth);

    const res = await submitDuesPayment(formData);
    setSubmittingDues(false);

    if (res && res.success) {
      setDuesMsg('Pembayaran iuran kas atas nama ' + duesName + ' berhasil dicatat!');
      setDuesName('');
      setDuesHouse('');
      setTimeout(() => setDuesMsg(''), 4000);
    } else {
      alert('Gagal mencatat iuran: ' + (res?.error || 'Kesalahan teknis'));
    }
  };

  const handleLogout = async () => {
    await logoutAdminRT();
    window.location.href = '/login';
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
  const approvedPropertiesCount = properties.filter((p) => p.status === 'APPROVED').length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER DASBOR RT */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-500 text-slate-950 rounded uppercase">
              PORTAL PENGURUS RT / KEPENDUDUKAN
            </span>
            <h1 className="text-2xl font-extrabold mt-2 text-white">Dasbor Pengurus RT Terpadu</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Buku Register Warga Pendatang, Verifikasi Properti, dan Kas Iuran RT
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all shadow"
            >
              📊 Ekspor Excel/CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-700 border border-slate-700 transition-all"
            >
              🖨️ Cetak Register
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-all shadow"
            >
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* PANEL PERMOHONAN PROPERTI KOS/KONTRAKAN BARU */}
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

        {/* STATS CARDS RT */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Warga Pendatang</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{tenants.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
            <span className="text-xs font-bold text-amber-800 uppercase">Perlu Verifikasi RT</span>
            <p className="text-3xl font-black text-amber-600 mt-1">
              {tenants.filter((t) => (t.status || '').toUpperCase() === 'PENDING' || (t.status || '').toUpperCase() === 'ACTIVE').length}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
            <span className="text-xs font-bold text-emerald-800 uppercase">Terverifikasi Resmi RT</span>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {tenants.filter((t) => (t.status || '').toUpperCase() === 'VERIFIED').length}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Unit Properti Terverifikasi</span>
            <p className="text-3xl font-black text-slate-800 mt-1">{approvedPropertiesCount}</p>
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

        {/* TABEL DATA PENDUDUK RT */}
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
            <div className="overflow-x-auto">
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
          )}
        </div>

        {/* MODUL MANAJEMEN IURAN & KAS RT */}
        <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 space-y-4 print:hidden">
          <h2 className="text-base font-bold text-slate-900 uppercase border-b pb-2">
            Pencatatan Iuran Kas Warga
          </h2>

          {duesMsg && (
            <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold">
              {duesMsg}
            </div>
          )}

          <form onSubmit={handleDuesSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Warga / Pembayar</label>
              <input
                type="text"
                required
                placeholder="Contoh: Saiful Anwar"
                value={duesName}
                onChange={(e) => setDuesName(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nomor Rumah / Blok</label>
              <input
                type="text"
                placeholder="Contoh: B-12 / Kos Melati"
                value={duesHouse}
                onChange={(e) => setDuesHouse(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nominal Iuran (Rp)</label>
              <input
                type="number"
                required
                value={duesAmount}
                onChange={(e) => setDuesAmount(e.target.value)}
                className="w-full text-xs p-2.5 border rounded-xl outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submittingDues}
                className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all disabled:bg-slate-400"
              >
                {submittingDues ? 'Catat...' : 'Catat Pembayaran Iuran'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* MODAL PERIKSA KTP RT */}
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
