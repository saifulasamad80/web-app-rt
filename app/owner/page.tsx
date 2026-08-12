'use client';

import React, { useEffect, useState } from 'react';
import { getOwnerPropertiesAndTenants, updateTenantStatus } from '../../src/actions/checkin-tenant';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  address_ktp: string;
  entry_date: string;
  status: string;
  properties?: { name: string; type: string; slug: string };
}

interface Property {
  id: string;
  name: string;
  type: string;
  slug: string;
  address: string;
}

export default function OwnerDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyMsg, setCopyMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const res = await getOwnerPropertiesAndTenants();
    setProperties(res.properties || []);
    setTenants(res.tenants || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyLink = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = origin + '/checkin/' + slug;
    navigator.clipboard.writeText(url);
    setCopyMsg('Tautan ' + slug + ' berhasil disalin!');
    setTimeout(() => setCopyMsg(''), 3000);
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'checked_out') => {
    // Perbarui UI secara instan (Optimistic Update)
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus.toUpperCase() } : t))
    );

    const res = await updateTenantStatus(id, newStatus);
    if (res && !res.success) {
      await fetchData(); // Rollback data jika backend gagal
    } else {
      await fetchData();
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="bg-emerald-900 text-white p-6 rounded-xl shadow flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dasbor Pemilik Kos & Kontrakan</h1>
            <p className="text-xs text-emerald-200 mt-1">
              Kelola Tautan Check-In, Daftar Penghuni, dan Status Hunian
            </p>
          </div>
        </div>

        {copyMsg && (
          <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold">
            {copyMsg}
          </div>
        )}

        {/* SECTION 1: TAUTAN CHECK-IN PROPERTI */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-lg font-bold mb-3">Properti Milik Anda</h2>
          {properties.length === 0 ? (
            <div className="text-sm text-gray-500">
              Properti default: <span className="font-mono font-semibold">kos-melati-1</span>
              <button
                onClick={() => handleCopyLink('kos-melati-1')}
                className="ml-3 px-2.5 py-1 bg-emerald-700 text-white text-xs font-semibold rounded hover:bg-emerald-800"
              >
                📋 Salin Link Check-In
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.map((prop) => (
                <div key={prop.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded uppercase">
                      {prop.type}
                    </span>
                    <h3 className="font-bold text-sm mt-1">{prop.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">/checkin/{prop.slug}</p>
                  </div>
                  <button
                    onClick={() => handleCopyLink(prop.slug)}
                    className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded hover:bg-emerald-800 transition-colors"
                  >
                    Salin Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: DAFTAR PENGHUNI */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-lg font-bold mb-4">Daftar Penghuni / Penyewa</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Memuat data penyewa...</p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada penyewa yang mendaftar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-2.5">Nama Penghuni</th>
                    <th className="p-2.5">Properti</th>
                    <th className="p-2.5">WhatsApp</th>
                    <th className="p-2.5">Tanggal Masuk</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((t) => {
                    const st = (t.status || '').toLowerCase();
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-2.5 font-medium">{t.name}</td>
                        <td className="p-2.5 text-xs text-gray-600">{t.properties?.name || 'Kos Melati 1'}</td>
                        <td className="p-2.5 text-xs font-mono">{t.phone}</td>
                        <td className="p-2.5 text-xs">{t.entry_date}</td>
                        <td className="p-2.5">
                          <span className={'text-[10px] font-bold px-2 py-0.5 rounded uppercase ' + 
                            (st === 'active' ? 'bg-green-100 text-green-800' : 
                             st === 'checked_out' ? 'bg-gray-100 text-gray-800' : 'bg-amber-100 text-amber-800')}>
                            {st}
                          </span>
                        </td>
                        <td className="p-2.5 text-right space-x-1">
                          {st !== 'active' && (
                            <button
                              onClick={() => handleStatusChange(t.id, 'active')}
                              className="px-2 py-1 bg-green-600 text-white text-[10px] rounded font-semibold hover:bg-green-700"
                            >
                              Set Active
                            </button>
                          )}
                          {st !== 'checked_out' && (
                            <button
                              onClick={() => handleStatusChange(t.id, 'checked_out')}
                              className="px-2 py-1 bg-red-600 text-white text-[10px] rounded font-semibold hover:bg-red-700"
                            >
                              Check-Out
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

      </div>
    </main>
  );
}
