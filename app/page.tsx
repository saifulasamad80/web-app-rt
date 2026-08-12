'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadAndWatermarkKTP } from '../src/actions/upload-ktp';
import { refreshKTPSignedUrl } from '../src/actions/get-signed-url';
import { generateWALink, normalizeIndonesianPhone } from '../src/utils/whatsapp';
import { submitTenantCheckin } from '../src/actions/checkin-tenant';
import { submitDuesPayment } from '../src/actions/manage-dues';
import { logoutAdminRT } from '../src/actions/auth';
import { downloadCSV } from '../src/utils/export';

interface DuesRecord {
  id: number;
  name: string;
  house: string;
  month: string;
  amount: number;
}

interface TenantRecord {
  id: number;
  name: string;
  phone: string;
  address: string;
  entryDate: string;
}

export default function HomePage() {
  const router = useRouter();

  // State Font Resizer Global
  const [fontScale, setFontScale] = useState<number>(100);

  useEffect(() => {
    document.documentElement.style.fontSize = fontScale + '%';
    return () => {
      document.documentElement.style.fontSize = '100%';
    };
  }, [fontScale]);

  // State Modul KTP
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [sourceInfo, setSourceInfo] = useState<string>('');

  // State Modul WhatsApp
  const [waPhone, setWaPhone] = useState<string>('');
  const [waTemplate, setWaTemplate] = useState<string>('ktp');
  const [waCustomMessage, setWaCustomMessage] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');

  // State Modul Check-In Penyewa
  const [tenantName, setTenantName] = useState<string>('');
  const [tenantPhone, setTenantPhone] = useState<string>('');
  const [tenantAddress, setTenantAddress] = useState<string>('');
  const [tenantEntryDate, setTenantEntryDate] = useState<string>('');
  const [tenantKtpFile, setTenantKtpFile] = useState<File | null>(null);
  const [pdpConsent, setPdpConsent] = useState<boolean>(false);
  const [checkinStatus, setCheckinStatus] = useState<string>('');
  const [checkinLoading, setCheckinLoading] = useState<boolean>(false);
  const [tenantList, setTenantList] = useState<TenantRecord[]>([
    { id: 1, name: 'Budi Santoso', phone: '08123456789', address: 'Jl. Melati No. 12 Malang', entryDate: '2026-08-01' }
  ]);

  // State Modul Iuran & Kas RT
  const [duesResidentName, setDuesResidentName] = useState<string>('');
  const [duesHouseNumber, setDuesHouseNumber] = useState<string>('');
  const [duesPeriodMonth, setDuesPeriodMonth] = useState<string>('Agustus 2026');
  const [duesAmount, setDuesAmount] = useState<string>('50000');
  const [duesStatus, setDuesStatus] = useState<string>('');
  const [duesLoading, setDuesLoading] = useState<boolean>(false);
  const [duesList, setDuesList] = useState<DuesRecord[]>([
    { id: 1, name: 'Budi Santoso', house: 'A-12', month: 'Agustus 2026', amount: 50000 },
    { id: 2, name: 'Saiful Anwar Samad', house: 'B-04', month: 'Agustus 2026', amount: 50000 }
  ]);

  // Handler Logout
  const handleLogout = async () => {
    await logoutAdminRT();
    router.push('/login');
    router.refresh();
  };

  // Handler Font Resizer
  const handleIncreaseFont = () => setFontScale((prev) => Math.min(130, prev + 10));
  const handleDecreaseFont = () => setFontScale((prev) => Math.max(80, prev - 10));
  const handleResetFont = () => setFontScale(100);

  // Handler Ekspor Data Kas RT
  const handleExportDues = () => {
    const headers = ['No', 'Nama Warga', 'Nomor Rumah / Blok', 'Periode Bulan', 'Nominal (Rp)'];
    const rows = duesList.map((item, index) => [
      index + 1,
      item.name,
      item.house,
      item.month,
      item.amount
    ]);
    downloadCSV('Laporan_Kas_RT_' + Date.now() + '.csv', headers, rows);
  };

  // Handler Ekspor Data Penyewa
  const handleExportTenants = () => {
    const headers = ['No', 'Nama Lengkap Penyewa', 'Nomor HP/WA', 'Alamat KTP / Asal', 'Tanggal Masuk'];
    const rows = tenantList.map((item, index) => [
      index + 1,
      item.name,
      item.phone,
      item.address,
      item.entryDate
    ]);
    downloadCSV('Data_Penyewa_RT_' + Date.now() + '.csv', headers, rows);
  };

  // Timer KTP
  useEffect(() => {
    if (!expiresAt) return;

    const calculateRemaining = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      setTimeLeft(diff);
      return diff;
    };

    calculateRemaining();

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Handler Generator WA
  useEffect(() => {
    if (!waPhone) {
      setGeneratedLink('');
      return;
    }

    let finalMessage = '';
    if (waTemplate === 'ktp') {
      finalMessage = 'Halo Bapak/Ibu, data KTP warga/penyewa Anda telah berhasil diverifikasi dan diamankan sesuai standar UU PDP. Terima kasih.';
    } else if (waTemplate === 'iuran') {
      finalMessage = 'Halo Bapak/Ibu, ini adalah pengingat pembayaran iuran kas RT untuk bulan ini. Mohon konfirmasi jika sudah melakukan transfer. Terima kasih.';
    } else {
      finalMessage = waCustomMessage;
    }

    if (finalMessage) {
      const link = generateWALink({ phone: waPhone, message: finalMessage });
      setGeneratedLink(link);
    } else {
      setGeneratedLink('');
    }
  }, [waPhone, waTemplate, waCustomMessage]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setStatus('Silakan pilih berkas KTP terlebih dahulu.');
      return;
    }

    setLoading(true);
    setStatus('Memproses watermark dan mengamankan akses KTP...');

    try {
      const formData = new FormData();
      formData.append('ktp', file);

      const res = await uploadAndWatermarkKTP(formData);

      if (res && res.error) {
        throw new Error(res.error);
      }

      setStatus('Upload berhasil! Akses KTP dilindungi Signed URL (UU PDP).');
      if (res && res.url) {
        setPreviewUrl(res.url);
        setFilePath(res.path || null);
        setSourceInfo(res.source || 'Signed URL');
        setExpiresAt(Date.now() + 60 * 1000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setStatus('Error: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!filePath) return;
    setLoading(true);
    try {
      const res = await refreshKTPSignedUrl(filePath);
      if (res.error) {
        throw new Error(res.error);
      }
      if (res.signedUrl) {
        setPreviewUrl(res.signedUrl);
      }
      setExpiresAt(Date.now() + 60 * 1000);
      setStatus('Akses Signed URL berhasil diperbarui (Aktif 60 detik kembali).');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui token.';
      setStatus('Error: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinLoading(true);
    setCheckinStatus('Mengirim data check-in penyewa...');

    try {
      const formData = new FormData();
      formData.append('name', tenantName);
      formData.append('phone', tenantPhone);
      formData.append('address', tenantAddress);
      formData.append('entryDate', tenantEntryDate);
      if (pdpConsent) formData.append('pdpConsent', 'true');
      if (tenantKtpFile) formData.append('ktp', tenantKtpFile);

      const res = await submitTenantCheckin(formData);

      if (res.error) {
        throw new Error(res.error);
      }

      setCheckinStatus(res.message || 'Check-in berhasil!');

      // Tambahkan ke daftar penyewa lokal
      const newTenant: TenantRecord = {
        id: Date.now(),
        name: tenantName,
        phone: tenantPhone,
        address: tenantAddress,
        entryDate: tenantEntryDate
      };
      setTenantList((prev) => [newTenant, ...prev]);

      setTenantName('');
      setTenantPhone('');
      setTenantAddress('');
      setTenantEntryDate('');
      setTenantKtpFile(null);
      setPdpConsent(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal melakukan check-in.';
      setCheckinStatus('Error: ' + msg);
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleDuesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuesLoading(true);
    setDuesStatus('Mencatat pembayaran iuran...');

    try {
      const formData = new FormData();
      formData.append('residentName', duesResidentName);
      formData.append('houseNumber', duesHouseNumber);
      formData.append('periodMonth', duesPeriodMonth);
      formData.append('amount', duesAmount);

      const res = await submitDuesPayment(formData);

      if (res.error) {
        throw new Error(res.error);
      }

      setDuesStatus(res.message || 'Pembayaran berhasil dicatat!');

      const newRecord: DuesRecord = {
        id: Date.now(),
        name: duesResidentName,
        house: duesHouseNumber,
        month: duesPeriodMonth,
        amount: parseFloat(duesAmount) || 50000
      };
      setDuesList((prev) => [newRecord, ...prev]);

      setDuesResidentName('');
      setDuesHouseNumber('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mencatat iuran.';
      setDuesStatus('Error: ' + msg);
    } finally {
      setDuesLoading(false);
    }
  };

  const totalCash = duesList.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900 transition-all duration-200">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* HEADER APLIKASI */}
        <div className="bg-emerald-900 text-white p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sistem Manajemen RT (UU PDP Compliant)</h1>
            <p className="text-sm text-emerald-200 mt-1">
              Platform Terintegrasi Pendataan KTP, WhatsApp Direct, Check-In Penyewa & Kas RT
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* WIDGET FONT RESIZER */}
            <div className="flex items-center space-x-1.5 bg-emerald-950/80 p-2 rounded-lg border border-emerald-700 shadow-inner">
              <button
                onClick={handleResetFont}
                title="Reset Ukuran Teks (100%)"
                className="px-2 py-1 text-xs text-emerald-200 hover:text-white hover:bg-emerald-800 rounded font-bold transition-colors flex items-center gap-1"
              >
                <span>T↕</span>
                <span className="text-[10px] opacity-75">({fontScale}%)</span>
              </button>
              <div className="h-4 w-px bg-emerald-700 my-auto"></div>
              <button
                onClick={handleDecreaseFont}
                disabled={fontScale <= 80}
                title="Kecilkan Teks (A-)"
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white rounded font-bold text-xs border border-emerald-600 transition-colors"
              >
                A-
              </button>
              <button
                onClick={handleIncreaseFont}
                disabled={fontScale >= 130}
                title="Besarkan Teks (A+)"
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white rounded font-bold text-xs border border-emerald-600 transition-colors"
              >
                A+
              </button>
            </div>

            {/* TOMBOL LOGOUT */}
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg border border-red-500 shadow-sm transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* MODUL 1 & 2: KTP VIEWER & UU PDP */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-2">1. Secure KTP Viewer (UU PDP)</h2>
          <p className="text-sm text-gray-600 mb-6">
            Penyimpanan berkas di Private Bucket dengan Signed URL terenkripsi berdurasi 60 detik.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label htmlFor="ktp-input" className="block text-sm font-medium mb-1">
                Pilih Foto KTP
              </label>
              <input
                id="ktp-input"
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border rounded-md p-1"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Memproses...' : 'Uji Upload & Enkripsi Akses'}
            </button>
          </form>

          {status && (
            <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded text-sm font-mono whitespace-pre-wrap">
              {status}
            </div>
          )}

          {previewUrl && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-sm font-semibold">Hasil Pemrosesan KTP:</h3>
                  <span className="text-xs text-gray-500">{sourceInfo}</span>
                </div>
                <span className={'text-xs font-bold px-2.5 py-1 rounded ' + (timeLeft > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                  {timeLeft > 0 ? 'Akses Aktif: ' + timeLeft + 's' : 'Akses Kedaluwarsa'}
                </span>
              </div>

              {timeLeft > 0 ? (
                <img
                  src={previewUrl}
                  alt="KTP Watermarked"
                  className="w-full rounded-lg border border-gray-300 shadow-sm mb-4"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-gray-600 font-medium mb-4">
                  [ Akses Gambar Telah Kedaluwarsa (UU PDP) ]
                </div>
              )}

              {filePath && (
                <button
                  onClick={handleRefreshToken}
                  disabled={loading}
                  className="w-full py-2 px-4 bg-amber-600 text-white font-medium rounded-md hover:bg-amber-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  {timeLeft === 0 ? 'Perbarui Token Akses Signed URL (Aktifkan Kembali)' : 'Reset / Perbarui Token Akses (60s)'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* MODUL 3: GENERATOR TAUTAN WHATSAPP DIRECT */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-2">2. Generator Tautan WhatsApp Direct (wa.me)</h2>
          <p className="text-sm text-gray-600 mb-6">
            Kirim pesan WhatsApp otomatis ke warga tanpa perlu menyimpan nomor HP di kontak pengurus RT.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="wa-phone" className="block text-sm font-medium mb-1">
                Nomor HP Warga (Format: 08..., 628..., atau 8...)
              </label>
              <input
                id="wa-phone"
                type="text"
                placeholder="Contoh: 08123456789"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {waPhone && (
                <p className="text-xs text-gray-500 mt-1">
                  Format Standar Internasional: <span className="font-mono font-semibold text-blue-600">{normalizeIndonesianPhone(waPhone)}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="wa-template" className="block text-sm font-medium mb-1">
                Pilihan Template Pesan
              </label>
              <select
                id="wa-template"
                value={waTemplate}
                onChange={(e) => setWaTemplate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="ktp">Konfirmasi Pendataan KTP/Penyewa</option>
                <option value="iuran">Pengingat Iuran RT</option>
                <option value="custom">Pesan Kustom (Bebas)</option>
              </select>
            </div>

            {waTemplate === 'custom' && (
              <div>
                <label htmlFor="wa-custom-msg" className="block text-sm font-medium mb-1">
                  Isi Pesan Kustom
                </label>
                <textarea
                  id="wa-custom-msg"
                  rows={3}
                  placeholder="Tulis pesan untuk warga..."
                  value={waCustomMessage}
                  onChange={(e) => setWaCustomMessage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {generatedLink && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <div className="text-xs font-semibold text-green-800">Tautan WhatsApp Siap Digunakan:</div>
                <div className="p-2 bg-white border rounded text-xs font-mono break-all text-gray-700">
                  {generatedLink}
                </div>
                <a
                  href={generatedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full text-center py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  Buka Aplikasi WhatsApp ( Direct Chat )
                </a>
              </div>
            )}
          </div>
        </div>

        {/* MODUL 4: FORMULIR CHECK-IN PENYEWA + TOMBOL EKSPOR */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">3. Formulir Check-In Penyewa / Pendatang Baru</h2>
            <button
              onClick={handleExportTenants}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1 shadow-sm"
            >
              📊 Ekspor Data Penyewa (.csv)
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Pendataan awal identitas penyewa rumah/kontrakan secara mandiri sesuai regulasi UU PDP.
          </p>

          <form onSubmit={handleCheckinSubmit} className="space-y-4">
            <div>
              <label htmlFor="tenant-name" className="block text-sm font-medium mb-1">Nama Lengkap Penyewa *</label>
              <input
                id="tenant-name"
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tenant-phone" className="block text-sm font-medium mb-1">Nomor HP/WA *</label>
                <input
                  id="tenant-phone"
                  type="text"
                  required
                  placeholder="08123456789"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="tenant-date" className="block text-sm font-medium mb-1">Tanggal Mulai Menetap *</label>
                <input
                  id="tenant-date"
                  type="date"
                  required
                  value={tenantEntryDate}
                  onChange={(e) => setTenantEntryDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tenant-address" className="block text-sm font-medium mb-1">Alamat KTP / Asal *</label>
              <textarea
                id="tenant-address"
                required
                rows={2}
                placeholder="Alamat asal sesuai KTP..."
                value={tenantAddress}
                onChange={(e) => setTenantAddress(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="tenant-ktp" className="block text-sm font-medium mb-1">Unggah Lampiran KTP (Otomatis Watermark & Masking)</label>
              <input
                id="tenant-ktp"
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && setTenantKtpFile(e.target.files[0])}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border rounded-md p-1"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={pdpConsent}
                  onChange={(e) => setPdpConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  Saya menyetujui data pribadi ini disimpan secara aman oleh Pengurus RT untuk keperluan tertib administrasi kependudukan sesuai regulasi <strong>UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP)</strong>.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={checkinLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 disabled:bg-gray-400 transition-colors text-sm"
            >
              {checkinLoading ? 'Menyimpan Data...' : 'Kirim Pendataan Check-In'}
            </button>
          </form>

          {checkinStatus && (
            <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded text-sm font-mono whitespace-pre-wrap">
              {checkinStatus}
            </div>
          )}
        </div>

        {/* MODUL 5: MANAJEMEN IURAN & KAS RT + TOMBOL EKSPOR */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">4. Manajemen Iuran & Kas RT</h2>
            <button
              onClick={handleExportDues}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1 shadow-sm"
            >
              📥 Ekspor Kas RT (.csv)
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Pencatatan iuran kas bulanan warga dan rekapitulasi total dana kas RT secara berkala.
          </p>

          <form onSubmit={handleDuesSubmit} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dues-name" className="block text-sm font-medium mb-1">Nama Warga *</label>
                <input
                  id="dues-name"
                  type="text"
                  required
                  placeholder="Contoh: Saiful Anwar"
                  value={duesResidentName}
                  onChange={(e) => setDuesResidentName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="dues-house" className="block text-sm font-medium mb-1">Nomor Rumah / Blok *</label>
                <input
                  id="dues-house"
                  type="text"
                  required
                  placeholder="Contoh: B-04"
                  value={duesHouseNumber}
                  onChange={(e) => setDuesHouseNumber(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dues-month" className="block text-sm font-medium mb-1">Periode Bulan *</label>
                <input
                  id="dues-month"
                  type="text"
                  required
                  value={duesPeriodMonth}
                  onChange={(e) => setDuesPeriodMonth(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="dues-amount" className="block text-sm font-medium mb-1">Nominal Iuran (Rp) *</label>
                <input
                  id="dues-amount"
                  type="number"
                  required
                  value={duesAmount}
                  onChange={(e) => setDuesAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={duesLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition-colors text-sm"
            >
              {duesLoading ? 'Mencatat Iuran...' : 'Catat Pembayaran Iuran'}
            </button>
          </form>

          {duesStatus && (
            <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded text-sm font-mono whitespace-pre-wrap mb-6">
              {duesStatus}
            </div>
          )}

          {/* REKAPITULASI KAS RT */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
              <div>
                <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider block">Total Kas Terkumpul</span>
                <span className="text-2xl font-extrabold text-indigo-900">Rp {totalCash.toLocaleString('id-ID')}</span>
              </div>
              <span className="text-xs px-2.5 py-1 bg-indigo-200 text-indigo-800 rounded-full font-semibold">
                {duesList.length} Transaksi
              </span>
            </div>

            <h3 className="text-sm font-semibold mb-3">Catatan Pembayaran Terakhir:</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 border-b">
                    <th className="p-2.5">Nama Warga</th>
                    <th className="p-2.5">Blok</th>
                    <th className="p-2.5">Periode</th>
                    <th className="p-2.5 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {duesList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2.5 font-medium">{item.name}</td>
                      <td className="p-2.5 text-gray-600">{item.house}</td>
                      <td className="p-2.5 text-gray-600">{item.month}</td>
                      <td className="p-2.5 text-right font-semibold text-emerald-700">Rp {item.amount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
