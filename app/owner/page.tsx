'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loginOwnerDashboard, getOwnerPropertyDetails, createProperty, updateProperty, deleteProperty,
  updateTenantData, deleteTenant, updateHouseRules, updateTenantPaymentStatus, addPropertyExpense, deletePropertyExpense,
  getOwnerAuditLogs
} from '../../src/actions/checkin-tenant';

interface Tenant { id: string; name: string; phone: string; address_ktp: string; entry_date: string; status: string; relation?: string; room_number?: string; full_address?: string; household_id?: string; is_head?: boolean; rent_price?: number; payment_status?: string; marital_status?: string; occupation?: string; property_id?: string; marriage_doc_url?: string; kk_doc_url?: string; ktp_path?: string; }
interface Expense { id: string; property_id: string; title: string; category: string; amount: number; expense_date: string; notes?: string; }
interface Property { id: string; name: string; property_name?: string; type: string; slug: string; address?: string; house_rules?: string; status?: string; owner_name?: string; owner_phone?: string; manager_name?: string; manager_phone?: string; total_rooms?: number; bank_name?: string; bank_account_number?: string; bank_account_holder?: string; pin_code?: string; }

function cleanDigits(phone?: string): string { return phone ? phone.replace(/\D/g, '') : ''; }
function isPhoneMatch(phoneA?: string, phoneB?: string): boolean { 
  const a = cleanDigits(phoneA); const b = cleanDigits(phoneB); 
  if (!a || !b) return false; 
  if (a === b) return true; 
  return (a.length >= 8 ? a.slice(-9) : a) === (b.length >= 8 ? b.slice(-9) : b); 
}
function parseRoomNumber(roomStr?: string): number | null { if (!roomStr) return null; const match = roomStr.match(/(?:kamar|unit|no\.?)\s*(\d+)/i) || roomStr.match(/^(\d+)/); return match ? parseInt(match[1], 10) : null; }

function getThreeMonthHistory(paymentStatus: string, entryDateStr: string) {
  const today = new Date();
  const entryDate = entryDateStr ? new Date(entryDateStr) : today;
  const entryYearMonth = entryDate.getFullYear() * 12 + entryDate.getMonth();
  const currentYearMonth = today.getFullYear() * 12 + today.getMonth();

  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const history = [];
  const isPaidCurrent = (paymentStatus || '').toUpperCase() === 'PAID';

  for (let i = 2; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dYearMonth = d.getFullYear() * 12 + d.getMonth();
    let status = 'PAID';
    if (dYearMonth < entryYearMonth) { status = 'N/A'; } 
    else if (dYearMonth === currentYearMonth) { status = isPaidCurrent ? 'PAID' : 'UNPAID'; } 
    else { status = 'PAID'; }

    history.push({ labelShort: MONTH_NAMES_SHORT[d.getMonth()], status: status, isCurrent: i === 0 });
  }
  return history;
}

export default function OwnerDashboard() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'penyewa' | 'pengeluaran' | 'matrix' | 'audit'>('penyewa');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propName, setPropName] = useState('');
  const [propType, setPropType] = useState<'kos' | 'kontrakan'>('kos');
  const [propTotalRooms, setPropTotalRooms] = useState(10);
  const [propOwnerName, setPropOwnerName] = useState('');
  const [propOwnerPhone, setPropOwnerPhone] = useState('');
  const [propManagerName, setPropManagerName] = useState('');
  const [propManagerPhone, setPropManagerPhone] = useState('');
  const [propBankName, setPropBankName] = useState('BCA');
  const [propBankAcc, setPropBankAcc] = useState('');
  const [propBankHolder, setPropBankHolder] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propRules, setPropRules] = useState('');
  const [propPin, setPropPin] = useState('');
  const [submittingProp, setSubmittingProp] = useState(false);

  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Listrik');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingExpense, setSavingExpense] = useState(false);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantRoom, setTenantRoom] = useState('');
  const [tenantRelation, setTenantRelation] = useState('Istri');
  const [tenantRentPrice, setTenantRentPrice] = useState('1500000');
  const [savingTenant, setSavingTenant] = useState(false);

  const [editingRulesProp, setEditingRulesProp] = useState<Property | null>(null);
  const [rulesText, setRulesText] = useState('');
  const [savingRules, setSavingRules] = useState(false);
  const [posterProp, setPosterProp] = useState<Property | null>(null);

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  const loadAuditLogs = async () => {
    const res = await getOwnerAuditLogs();
    if (res.success) setAuditLogs(res.logs);
  };

  const handleOpenAddPropModal = () => {
    setEditingProperty(null); setPropName(''); setPropType('kos'); setPropTotalRooms(10);
    setPropOwnerName(''); setPropOwnerPhone(loginPhone || ''); setPropManagerName(''); setPropManagerPhone('');
    setPropBankName('BCA'); setPropBankAcc(''); setPropBankHolder(''); setPropAddress(''); setPropRules(''); setPropPin('');
    setShowAddPropModal(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || !loginPin) return;
    setLoginLoading(true); setLoginError('');
    const res = await loginOwnerDashboard(loginPhone, loginPin);
    setLoginLoading(false);
    if (res.success && res.properties && res.properties.length > 0) {
      setMyProperties(res.properties); setIsLoggedIn(true);
      if (res.initialDetails) {
        setActiveProperty(res.initialDetails.property); setTenants(res.initialDetails.tenants || []); setExpenses(res.initialDetails.expenses || []);
      } else { await handleSelectProperty(res.properties[0]); }
      await loadAuditLogs();
    } else { setLoginError(res.error || 'Nomor WhatsApp atau PIN salah.'); }
  };

  const handleSelectProperty = async (prop: Property) => {
    setLoadingDetails(true); setActiveProperty(prop);
    const details = await getOwnerPropertyDetails(prop.id);
    setLoadingDetails(false);
    if (details.success) { setTenants(details.tenants || []); setExpenses(details.expenses || []); }
  };

  const handleLogout = () => { setIsLoggedIn(false); setLoginPhone(''); setLoginPin(''); setMyProperties([]); setActiveProperty(null); setTenants([]); setExpenses([]); };

  const handleOpenEditProp = (prop: Property) => {
    setEditingProperty(prop); setPropName(prop.name || prop.property_name || ''); setPropType((prop.type as 'kos' | 'kontrakan') || 'kos');
    setPropTotalRooms(prop.total_rooms || 10); setPropOwnerName(prop.owner_name || ''); setPropOwnerPhone(prop.owner_phone || '');
    setPropManagerName(prop.manager_name || ''); setPropManagerPhone(prop.manager_phone || ''); setPropBankName(prop.bank_name || 'BCA');
    setPropBankAcc(prop.bank_account_number || ''); setPropBankHolder(prop.bank_account_holder || ''); setPropAddress(prop.address || ''); setPropPin(prop.pin_code || '1234');
    setShowAddPropModal(true);
  };

  const handlePropFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!propName) return; setSubmittingProp(true);
    if (editingProperty) {
      const res = await updateProperty(editingProperty.id, { name: propName, type: propType, total_rooms: propTotalRooms, owner_name: propOwnerName, owner_phone: propOwnerPhone, manager_name: propManagerName, manager_phone: propManagerPhone, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder, address: propAddress, pin_code: propPin });
      setSubmittingProp(false);
      if (res.success) {
        alert(`✅ Data properti diperbarui.`); setEditingProperty(null); setShowAddPropModal(false);
        const updatedList = myProperties.map((p) => p.id === editingProperty.id ? { ...p, name: propName, property_name: propName, type: propType, total_rooms: propTotalRooms, owner_name: propOwnerName, owner_phone: propOwnerPhone, manager_name: propManagerName, manager_phone: propManagerPhone, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder, address: propAddress, pin_code: propPin } : p);
        setMyProperties(updatedList);
        if (activeProperty && activeProperty.id === editingProperty.id) { setActiveProperty({ ...activeProperty, name: propName, property_name: propName, type: propType, total_rooms: propTotalRooms, owner_name: propOwnerName, owner_phone: propOwnerPhone, manager_name: propManagerName, manager_phone: propManagerPhone, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder, address: propAddress, pin_code: propPin }); }
      } else { alert('Gagal update properti: ' + res.error); }
    } else {
      if (!propPin || !/^\d{4}$/.test(propPin)) { alert('PIN harus 4 digit angka'); setSubmittingProp(false); return; }
      const res = await createProperty(propName, propType, propAddress, propRules, propPin, propOwnerName || loginPhone, propOwnerPhone || loginPhone, propManagerName, propManagerPhone, propTotalRooms, propBankName, propBankAcc, propBankHolder);
      setSubmittingProp(false);
      if (res && res.success && res.data) {
        alert(`✅ Properti berhasil didaftarkan.`); setShowAddPropModal(false);
        if (isLoggedIn) { setMyProperties([res.data, ...myProperties]); await handleSelectProperty(res.data); } 
        else { setLoginPhone(propOwnerPhone || loginPhone); setLoginPin(propPin); setIsLoggedIn(true); setMyProperties([res.data]); await handleSelectProperty(res.data); }
      } else { alert('Gagal: ' + (res?.error || 'Kesalahan teknis')); }
    }
    await loadAuditLogs();
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeProperty || !expenseTitle || !expenseAmount) return; setSavingExpense(true);
    const parsedAmount = parseInt(expenseAmount.replace(/\D/g, ''), 10) || 0;
    const res = await addPropertyExpense(activeProperty.id, expenseTitle, expenseCategory, parsedAmount, expenseDate);
    setSavingExpense(false);
    if (res.success && res.data) {
      setExpenses([res.data, ...expenses]); setShowAddExpenseModal(false); setExpenseTitle(''); setExpenseAmount('');
      alert(`✅ Pengeluaran dicatat.`);
      await loadAuditLogs();
    } else { alert('Gagal: ' + res.error); }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Hapus catatan pengeluaran "${title}"?`)) { setExpenses(expenses.filter((e) => e.id !== id)); await deletePropertyExpense(id); await loadAuditLogs(); }
  };

  const handleOpenEditTenant = (t: Tenant) => { setEditingTenant(t); setTenantName(t.name); setTenantPhone(t.phone); setTenantRoom(t.room_number || ''); setTenantRelation(t.relation || 'Istri'); setTenantRentPrice(t.rent_price ? String(t.rent_price) : '1500000'); };

  const handleSaveTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingTenant) return; setSavingTenant(true);
    const parsedPrice = parseInt(tenantRentPrice.replace(/\D/g, ''), 10) || 0;
    const res = await updateTenantData(editingTenant.id, { name: tenantName, phone: tenantPhone, room_number: tenantRoom, relation: tenantRelation, rent_price: parsedPrice });
    setSavingTenant(false);
    if (res.success) {
      setTenants((prev) => prev.map((t) => t.id === editingTenant.id ? { ...t, name: tenantName, phone: tenantPhone, room_number: tenantRoom, relation: tenantRelation, rent_price: parsedPrice } : t));
      setEditingTenant(null); alert(`✅ Data diperbarui.`);
      await loadAuditLogs();
    } else { alert('Gagal: ' + res.error); }
  };

  const handleTogglePaymentStatus = async (tenantId: string, currentStatus?: string) => {
    const newStatus = (currentStatus || '').toUpperCase() === 'PAID' ? 'UNPAID' : 'PAID';
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, payment_status: newStatus } : t)));
    await updateTenantPaymentStatus(tenantId, newStatus);
    await loadAuditLogs();
  };

  const handleShareWA = (prop: Property) => {
    const checkinUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/checkin/' + prop.slug;
    const message = `Halo calon penghuni *${prop.name || prop.property_name}*,\n\nMohon lengkapi lapor diri digital melalui tautan ini:\n\n👉 ${checkinUrl}\n\nTerima kasih.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendReminderWA = (t: Tenant) => {
    if (!activeProperty) return;
    const rawPhone = (t.phone || '').replace(/\D/g, ''); const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
    const bankInfo = activeProperty.bank_account_number ? `${activeProperty.bank_name} ${activeProperty.bank_account_number} a.n. ${activeProperty.bank_account_holder}` : 'rekening pengelola';
    const message = `Halo Kak *${t.name}*,\n\nMengingatkan tagihan sewa *${activeProperty.name || activeProperty.property_name}* (${t.room_number || 'Kamar Unit'}) sebesar *Rp ${Number(t.rent_price || 0).toLocaleString('id-ID')}*.\n\nPembayaran ke:\n🏦 *${bankInfo}*\n\nTerima kasih.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDeleteTenantRow = async (id: string, name: string) => {
    if (confirm(`Hapus penghuni "${name}"?`)) { setTenants((prev) => prev.filter((t) => t.id !== id)); await deleteTenant(id); await loadAuditLogs(); }
  };

  const handleOpenRulesModal = (prop: Property) => {
    setEditingRulesProp(prop);
    setRulesText(prop.house_rules || `1. Wajib lapor diri 1x24 jam.\n2. Jaga kebersihan.\n3. Dilarang bawa barang terlarang.\n4. Jam bertamu max 22.00 WIB.`);
  };

  const handleSaveRules = async () => {
    if (!editingRulesProp) return; setSavingRules(true);
    const res = await updateHouseRules(editingRulesProp.id, rulesText);
    setSavingRules(false);
    if (res && res.success) {
      alert('✅ Tata tertib diperbarui.'); setEditingRulesProp(null);
      if (activeProperty) setActiveProperty({ ...activeProperty, house_rules: rulesText });
    } else { alert('Gagal: ' + (res?.error || 'Kesalahan database')); }
  };

  const totalRooms = activeProperty?.total_rooms || 10;
  const occupiedRoomSet = new Set<string>();
  tenants.forEach((t) => {
    const st = (t.status || '').toUpperCase();
    if (st === 'ACTIVE' || st === 'VERIFIED' || st === 'PENDING') {
      const parsedNum = parseRoomNumber(t.room_number);
      if (parsedNum !== null) occupiedRoomSet.add(`room-${parsedNum}`);
      else if (t.room_number) occupiedRoomSet.add(t.room_number.trim().toLowerCase());
    }
  });

  const countActiveRooms = occupiedRoomSet.size;
  const emptyRooms = Math.max(totalRooms - countActiveRooms, 0);
  const totalRentCollected = tenants.filter((t) => (t.payment_status || '').toUpperCase() === 'PAID').reduce((sum, t) => sum + (Number(t.rent_price) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalRentCollected - totalExpenses;
  
  const isOwner = isPhoneMatch(loginPhone, activeProperty?.owner_phone);
  
  // NAMA LOGIN AKTIF
  const activeLoginName = isOwner 
    ? (activeProperty?.owner_name || 'Pemilik Sah') 
    : (activeProperty?.manager_name || 'Pengelola');

  const handleExportOwner = () => {
    const headers = ["Nama Lengkap", "No WhatsApp", "Peran", "Kamar", "Tanggal Masuk", "Status RT", "Nominal Sewa", "Status Bayar"];
    const rows = tenants.map(t => [
      `"${t.name || ""}"`, `"${t.phone || ""}"`, `"${t.relation || (t.is_head ? "Penanggung Jawab" : "Anggota")}"`,
      `"${t.room_number || ""}"`, `"${t.entry_date || ""}"`, `"${t.status || "PENDING"}"`, 
      `"${t.is_head ? t.rent_price : 0}"`, `"${t.payment_status || "UNPAID"}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", `Laporan_Penyewa_Kos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <main style={{ fontSize: `${zoomPercent}%` }} className="min-h-screen p-3 md:p-8 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="bg-emerald-800 text-white p-5 md:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><span className="text-[1.3rem]">🏢⚡</span><h1 className="text-[1.4rem] font-black text-white">Portal <span className="text-amber-400">Pemilik Kos & Kontrakan</span></h1></div>
            <p className="text-[0.8rem] text-emerald-100 mt-1 font-medium">Sistem Manajemen Properti Privat & Terintegrasi RT</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1.5 shadow-inner">
              <span className="text-[0.75rem] font-bold text-emerald-300 px-1">T↕</span>
              <button onClick={handleZoomOut} className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer">A-</button>
              <span className="text-[0.7rem] font-mono font-black text-amber-300 px-1">{zoomPercent}%</span>
              <button onClick={handleZoomIn} className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer">A+</button>
            </div>
            <Link href="/" className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-[0.75rem] rounded-2xl shadow">🚪 Keluar</Link>
          </div>
        </header>

        {!isLoggedIn ? (
          <div className="max-w-md mx-auto bg-white p-6 md:p-8 rounded-3xl shadow-md border-2 border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-900 rounded-3xl flex items-center justify-center text-[1.8rem] mx-auto shadow-inner">🏢</div>
            <h2 className="text-[1.2rem] font-black">Masuk Dasbor Pemilik</h2>
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <input type="tel" required placeholder="08xxxxxxxxxx" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))} className="w-full p-3.5 border-2 rounded-2xl font-mono font-bold bg-white" />
              <input type="password" maxLength={4} required placeholder="• • • •" value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))} className="w-full p-3.5 border-2 rounded-2xl font-mono text-[1.2rem] font-bold text-center bg-white tracking-[0.4em]" />
              <button type="submit" disabled={loginLoading || loginPin.length !== 4} className="w-full py-4 bg-emerald-700 text-white font-black rounded-2xl">{loginLoading ? 'Memeriksa...' : 'Buka Dasbor Saya →'}</button>
            </form>
            <div className="pt-3 border-t-2 text-center">
              <button onClick={handleOpenAddPropModal} className="text-[0.85rem] text-emerald-800 font-black hover:underline cursor-pointer">➕ Daftarkan Properti Kos Baru</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[0.85rem] font-black text-slate-700">Unit Aktif:</span>
                  <select value={activeProperty?.id || ''} onChange={(e) => { const s = myProperties.find((p) => p.id === e.target.value); if(s) handleSelectProperty(s); }} className="p-2.5 border-2 border-emerald-400 rounded-2xl font-black text-emerald-950 bg-emerald-50">
                    {myProperties.map((p) => (<option key={p.id} value={p.id}>🏠 {p.name || p.property_name}</option>))}
                  </select>
                  <span className={`text-[0.7rem] font-black px-3 py-1.5 rounded-full uppercase ${isOwner ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'}`}>
                    {isOwner ? '👑 PEMILIK' : '🔑 PENGELOLA'}
                  </span>
                </div>
                <span className="text-[0.75rem] font-bold text-slate-500 mt-2">Login: {activeLoginName} ({loginPhone})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <>
                    <button onClick={handleOpenAddPropModal} className="px-3.5 py-2.5 bg-emerald-700 text-white text-[0.75rem] font-black rounded-xl shadow-sm">➕ Tambah Unit</button>
                    <button onClick={() => activeProperty && handleOpenEditProp(activeProperty)} className="px-3.5 py-2.5 bg-amber-400 text-slate-950 text-[0.75rem] font-black rounded-xl border border-amber-500">✏️ Edit Properti</button>
                  </>
                )}
                <button onClick={handleLogout} className="px-3.5 py-2.5 bg-red-100 text-red-800 text-[0.75rem] font-bold rounded-xl border border-red-300">🔒 Logout</button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="p-12 text-center bg-white rounded-3xl border-2">Memuat Data...</div>
            ) : activeProperty ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg space-y-1"><span className="text-[0.7rem] font-black bg-emerald-950/60 px-2.5 py-0.5 rounded-full">SEWA MASUK</span><h3 className="text-[1.6rem] font-black mt-1">Rp {totalRentCollected.toLocaleString('id-ID')}</h3></div>
                  <div className="bg-red-800 text-white p-6 rounded-3xl shadow-lg space-y-1"><span className="text-[0.7rem] font-black bg-red-950/60 px-2.5 py-0.5 rounded-full">PENGELUARAN</span><h3 className="text-[1.6rem] font-black mt-1">Rp {totalExpenses.toLocaleString('id-ID')}</h3></div>
                  {isOwner ? (
                    <div className="bg-amber-400 text-slate-950 p-6 rounded-3xl shadow-lg space-y-1 border-2 border-amber-500"><span className="text-[0.7rem] font-black bg-amber-200/80 px-2.5 py-0.5 rounded-full">LABA BERSIH</span><h3 className="text-[1.6rem] font-black mt-1">Rp {netProfit.toLocaleString('id-ID')}</h3><p className="text-[0.75rem] font-bold">Okupansi: {countActiveRooms}/{totalRooms} Terisi</p></div>
                  ) : (
                    <div className="bg-slate-200 p-6 rounded-3xl text-center flex items-center justify-center border-2 border-slate-300"><p className="text-[0.8rem] font-bold text-slate-600">🔒 Laba Bersih Khusus Pemilik</p></div>
                  )}
                </div>

                <div className="flex border-b-2 border-slate-200 gap-2 overflow-x-auto">
                  <button onClick={() => setActiveTab('penyewa')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 whitespace-nowrap ${activeTab === 'penyewa' ? 'bg-white border-slate-300 text-emerald-800 -mb-0.5 shadow-sm' : 'bg-slate-100 border-transparent text-slate-600'}`}>👥 Daftar Penyewa ({tenants.length})</button>
                  <button onClick={() => setActiveTab('pengeluaran')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 whitespace-nowrap ${activeTab === 'pengeluaran' ? 'bg-white border-slate-300 text-red-800 -mb-0.5 shadow-sm' : 'bg-slate-100 border-transparent text-slate-600'}`}>📈 Pengeluaran ({expenses.length})</button>
                  <button onClick={() => setActiveTab('matrix')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 whitespace-nowrap ${activeTab === 'matrix' ? 'bg-white border-slate-300 text-slate-900 -mb-0.5 shadow-sm' : 'bg-slate-100 border-transparent text-slate-600'}`}>🏠 Matrix ({emptyRooms} Kosong)</button>
                  {isOwner && (
                    <button onClick={() => setActiveTab('audit')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 whitespace-nowrap ${activeTab === 'audit' ? 'bg-white border-slate-300 text-purple-800 -mb-0.5 shadow-sm' : 'bg-slate-100 border-transparent text-slate-600'}`}>📋 Jejak Audit</button>
                  )}
                </div>

                {activeTab === 'penyewa' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between border-b pb-3 gap-2">
                      <h3 className="text-[1rem] font-black uppercase">Penghuni: {activeProperty.name || activeProperty.property_name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        {isOwner && (<button onClick={handleExportOwner} className="px-3 py-2 bg-slate-900 text-white text-[0.75rem] font-bold rounded-2xl shadow cursor-pointer">📥 Export Excel</button>)}
                        <button onClick={() => handleShareWA(activeProperty)} className="px-3 py-2 bg-emerald-600 text-white text-[0.75rem] font-bold rounded-2xl shadow cursor-pointer">💬 Link WA</button>
                        <button onClick={() => setPosterProp(activeProperty)} className="px-3 py-2 bg-slate-800 text-white text-[0.75rem] font-bold rounded-2xl shadow cursor-pointer">🖨️ Poster QR</button>
                        {isOwner && (<button onClick={() => handleOpenRulesModal(activeProperty)} className="px-3 py-2 bg-amber-400 text-slate-950 text-[0.75rem] font-black rounded-2xl shadow cursor-pointer">📜 Tata Tertib</button>)}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[0.8rem]">
                        <thead><tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]"><th className="p-3">Nama & Peran</th><th className="p-3">Kamar & Tgl Masuk</th><th className="p-3">Status Tagihan</th><th className="p-3">Riwayat Sewa (3 Bulan)</th><th className="p-3">Nominal Sewa</th><th className="p-3">Status RT</th><th className="p-3 text-right">Aksi</th></tr></thead>
                        <tbody className="divide-y divide-slate-200">
                          {tenants.map((t) => {
                            const isPaid = (t.payment_status || '').toUpperCase() === 'PAID'; const isHeadPerson = t.is_head || (t.relation || '').toLowerCase().includes('penanggung');
                            const history = getThreeMonthHistory(t.payment_status || '', t.entry_date);
                            return (
                              <tr key={t.id} className="hover:bg-slate-50">
                                <td className="p-3"><div className="font-black text-slate-900">{t.name}</div><span className="text-[0.65rem] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border inline-block mt-0.5">{t.relation || 'Anggota'}</span></td>
                                <td className="p-3"><span className="font-bold text-emerald-900 block">{t.room_number || '-'}</span><span className="text-[0.65rem] font-mono text-slate-500 font-bold block mt-0.5">Tgl Masuk: {t.entry_date}</span></td>
                                <td className="p-3">{isHeadPerson ? (<button onClick={() => handleTogglePaymentStatus(t.id, t.payment_status)} className={`px-2.5 py-1 rounded-xl text-[0.7rem] font-black shadow-sm cursor-pointer ${isPaid ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>{isPaid ? '✅ LUNAS' : '❌ BELUM'}</button>) : (<span className="text-slate-400 font-bold text-[0.7rem] italic">- (Ikut PJ)</span>)}</td>
                                <td className="p-3">{isHeadPerson ? (<div className="flex gap-1">{history.map((m, idx) => (<span key={idx} className={`text-[0.65rem] font-black px-2 py-0.5 rounded-lg border ${m.status === 'N/A' ? 'bg-slate-100 text-slate-400 border-slate-200' : m.status === 'PAID' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'}`}>{m.labelShort} {m.status === 'N/A' ? '-' : m.status === 'PAID' ? '✓' : '✗'}</span>))}</div>) : (<span className="text-slate-400 font-bold">-</span>)}</td>
                                <td className="p-3 font-mono font-bold text-slate-900">{isHeadPerson ? `Rp ${Number(t.rent_price || 0).toLocaleString('id-ID')}` : 'Rp 0'}</td>
                                <td className="p-3"><span className={'text-[0.65rem] font-black px-2 py-0.5 rounded-full uppercase inline-block ' + (t.status === 'VERIFIED' || t.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-amber-100 text-amber-900 border border-amber-300')}>{t.status === 'VERIFIED' || t.status === 'ACTIVE' ? '✅ TERVERIFIKASI' : '⚠️ MENUNGGU'}</span></td>
                                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                                  {isHeadPerson && !isPaid && (<button onClick={() => handleSendReminderWA(t)} className="px-2 py-1 bg-emerald-600 text-white text-[0.7rem] font-bold rounded-lg cursor-pointer">💬 Tagih</button>)}
                                  <button onClick={() => handleOpenEditTenant(t)} className="px-2 py-1 bg-amber-400 text-slate-950 text-[0.7rem] font-black rounded-lg cursor-pointer">✏️ Edit</button>
                                  <button onClick={() => handleDeleteTenantRow(t.id, t.name)} className="px-2 py-1 bg-slate-200 text-slate-700 text-[0.7rem] font-bold rounded-lg hover:bg-red-100 hover:text-red-700 cursor-pointer">🗑️</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'pengeluaran' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                      <h3 className="text-[1rem] font-black text-slate-900 uppercase">Buku Kas Pengeluaran</h3>
                      <button onClick={() => setShowAddExpenseModal(true)} className="px-4 py-2 bg-red-700 text-white text-[0.8rem] font-black rounded-2xl shadow cursor-pointer">➕ Catat Pengeluaran</button>
                    </div>
                    {expenses.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-slate-50"><p className="text-[0.8rem] text-slate-500 font-medium">Belum ada pengeluaran dicatat.</p></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[0.8rem]">
                          <thead><tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]"><th className="p-3">Tanggal</th><th className="p-3">Kategori</th><th className="p-3">Keterangan</th><th className="p-3">Nominal (Rp)</th><th className="p-3 text-right">Aksi</th></tr></thead>
                          <tbody className="divide-y divide-slate-200">
                            {expenses.map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-semibold">{exp.expense_date}</td><td className="p-3"><span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-lg text-[0.7rem] font-bold">{exp.category}</span></td><td className="p-3 font-medium text-slate-800">{exp.title}</td><td className="p-3 font-mono font-black text-red-700">- Rp {Number(exp.amount || 0).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-right"><button onClick={() => handleDeleteExpense(exp.id, exp.title)} className="text-red-600 font-bold hover:underline cursor-pointer">✕ Hapus</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'matrix' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <h3 className="text-[1rem] font-black text-slate-900 uppercase border-b pb-3">Matrix Okupansi ({activeProperty.total_rooms || 10} Total Unit)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                      {Array.from({ length: activeProperty.total_rooms || 10 }).map((_, idx) => {
                        const targetRoomNum = idx + 1; const roomLabel = `Kamar ${String(targetRoomNum).padStart(2, '0')}`;
                        const occupant = tenants.find((t) => { const pNum = parseRoomNumber(t.room_number); if (pNum !== null) return pNum === targetRoomNum; return (t.room_number || '').trim().toLowerCase() === roomLabel.toLowerCase(); });
                        return (
                          <div key={idx} className={`p-4 rounded-2xl border-2 space-y-2 ${occupant ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-300 text-slate-500 border-dashed'}`}>
                            <div className="flex justify-between items-center"><span className="font-black text-[0.85rem]">{roomLabel}</span><span className={`text-[0.65rem] font-extrabold px-2 py-0.5 rounded-full ${occupant ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'}`}>{occupant ? 'TERISI' : 'KOSONG'}</span></div>
                            {occupant ? (
                              <div className="text-[0.75rem] space-y-0.5"><p className="font-bold text-slate-900 truncate">👤 {occupant.name}</p><p className="font-mono text-emerald-800 font-bold">Rp {Number(occupant.rent_price || 0).toLocaleString('id-ID')} /bln</p></div>
                            ) : (<p className="text-[0.75rem] font-medium text-slate-400 pt-2">Siap ditempati</p>)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'audit' && isOwner && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <h3 className="text-[1rem] font-black text-slate-900 uppercase border-b pb-3">📋 Jejak Audit Sistem Owner</h3>
                    {auditLogs.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-slate-50"><p className="text-[0.8rem] text-slate-500 font-medium">Belum ada aktivitas audit.</p></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[0.8rem]">
                          <thead><tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]"><th className="p-3">Waktu</th><th className="p-3">Aksi</th><th className="p-3">Pelaksana</th><th className="p-3">Rincian Perubahan</th></tr></thead>
                          <tbody className="divide-y divide-slate-200">
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-[0.75rem] text-slate-600">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                                <td className="p-3"><span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-black text-[0.7rem]">{log.action_type}</span></td>
                                <td className="p-3 font-bold text-slate-900">{log.performed_by}</td>
                                <td className="p-3 font-medium text-slate-700">{log.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {editingTenant && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border-2">
            <div className="p-4 bg-emerald-800 text-white flex justify-between items-center"><h3 className="font-black text-[0.85rem]">✏️ Edit Kamar & Nominal Sewa</h3><button onClick={() => setEditingTenant(null)} className="cursor-pointer text-xl">✕</button></div>
            <form onSubmit={handleSaveTenantSubmit} className="p-5 space-y-3">
              <div><label className="block font-bold text-slate-700 mb-1 text-[0.8rem]">Nama Penyewa</label><input type="text" required value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="w-full p-2.5 border-2 rounded-xl font-bold bg-white" /></div>
              <div><label className="block font-bold text-slate-700 mb-1 text-[0.8rem]">Nomor Kamar</label><input type="text" value={tenantRoom} onChange={(e) => setTenantRoom(e.target.value)} className="w-full p-2.5 border-2 rounded-xl font-bold bg-white text-emerald-900" /></div>
              <div className="bg-emerald-50 p-3 rounded-xl border-2 border-emerald-300">
                <label className="block font-black text-emerald-950 text-[0.75rem] mb-1">💰 Harga Sewa Kamar Ini (Rp)</label>
                <input type="text" required value={tenantRentPrice} onChange={(e) => setTenantRentPrice(e.target.value.replace(/\D/g, ''))} className="w-full p-2.5 border-2 border-emerald-400 rounded-xl font-mono text-lg font-black text-emerald-950 bg-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingTenant(null)} className="px-4 py-2 bg-slate-200 font-bold rounded-xl cursor-pointer">Batal</button>
                <button type="submit" disabled={savingTenant} className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer shadow">{savingTenant ? 'Menyimpan...' : 'Simpan Harga'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border-2">
            <div className="p-4 bg-red-800 text-white flex justify-between items-center"><h3 className="font-black text-[0.85rem]">➕ Catat Pengeluaran Kos</h3><button onClick={() => setShowAddExpenseModal(false)} className="cursor-pointer text-xl">✕</button></div>
            <form onSubmit={handleAddExpenseSubmit} className="p-5 space-y-3">
              <input type="text" required placeholder="Keterangan (ex: Listrik)" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} className="w-full p-2.5 border-2 rounded-xl font-bold" />
              <div className="grid grid-cols-2 gap-2">
                <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full p-2.5 border-2 rounded-xl font-bold"><option value="Listrik">Listrik</option><option value="Air / PDAM">Air / PDAM</option><option value="WiFi">WiFi</option><option value="Kebersihan">Sampah</option><option value="Lainnya">Lainnya</option></select>
                <input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full p-2.5 border-2 rounded-xl" />
              </div>
              <input type="text" required placeholder="Nominal Rp" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value.replace(/\D/g, ''))} className="w-full p-2.5 border-2 rounded-xl font-mono text-lg font-black text-red-700" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="submit" disabled={savingExpense} className="px-4 py-2 bg-red-700 text-white font-black rounded-xl cursor-pointer shadow w-full">Simpan Kas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border-2 max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-emerald-800 text-white flex justify-between"><h3 className="font-bold text-[0.9rem]">{editingProperty ? '✏️ Edit Properti & Pengelola' : '🏢 Daftar Properti Baru'}</h3><button onClick={() => {setShowAddPropModal(false); setEditingProperty(null);}} className="cursor-pointer text-xl">✕</button></div>
            <form onSubmit={handlePropFormSubmit} className="p-5 space-y-4 text-[0.8rem]">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="font-bold text-slate-800 mb-1">Nama Kos *</label><input type="text" required value={propName} onChange={(e) => setPropName(e.target.value)} className="w-full p-2 border-2 rounded-xl font-bold" /></div>
                <div><label className="font-bold text-slate-800 mb-1">Total Kamar *</label><input type="number" required value={propTotalRooms} onChange={(e) => setPropTotalRooms(parseInt(e.target.value, 10)||1)} className="w-full p-2 border-2 rounded-xl font-bold" /></div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border-2"><span className="text-[0.7rem] font-black uppercase block mb-1">1. DATA PEMILIK SAH:</span><div className="flex gap-2"><input type="text" placeholder="Nama Pemilik" value={propOwnerName} onChange={(e) => setPropOwnerName(e.target.value)} className="w-full p-2 border-2 rounded-xl" /><input type="tel" placeholder="WA Pemilik" value={propOwnerPhone} onChange={(e) => setPropOwnerPhone(e.target.value)} className="w-full p-2 border-2 rounded-xl font-mono" /></div></div>
              <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-300"><span className="text-[0.7rem] font-black uppercase block mb-1 text-amber-900">2. DATA PENGELOLA LOKASI:</span><div className="flex gap-2"><input type="text" placeholder="Nama Pengelola" value={propManagerName} onChange={(e) => setPropManagerName(e.target.value)} className="w-full p-2 border-2 border-amber-200 rounded-xl" /><input type="tel" placeholder="WA Pengelola" value={propManagerPhone} onChange={(e) => setPropManagerPhone(e.target.value)} className="w-full p-2 border-2 border-amber-200 rounded-xl font-mono" /></div></div>
              <div className="bg-slate-50 p-3 rounded-2xl border-2"><span className="text-[0.7rem] font-black uppercase block mb-1">3. REKENING BANK:</span><div className="flex gap-2 mb-2"><input type="text" placeholder="Bank" value={propBankName} onChange={(e) => setPropBankName(e.target.value)} className="w-1/3 p-2 border-2 rounded-xl" /><input type="text" placeholder="No Rekening" value={propBankAcc} onChange={(e) => setPropBankAcc(e.target.value)} className="w-2/3 p-2 border-2 rounded-xl font-mono" /></div><input type="text" placeholder="Atas Nama" value={propBankHolder} onChange={(e) => setPropBankHolder(e.target.value)} className="w-full p-2 border-2 rounded-xl" /></div>
              <div><label className="font-bold text-slate-800 mb-1">Alamat Unit</label><input type="text" placeholder="Alamat Lengkap Kos" value={propAddress} onChange={(e) => setPropAddress(e.target.value)} className="w-full p-2 border-2 rounded-xl" /></div>
              <input type="text" maxLength={4} required placeholder="PIN 4 Digit Akses" value={propPin} onChange={(e) => setPropPin(e.target.value.replace(/\D/g, ''))} className="w-full p-2.5 border-2 border-emerald-400 rounded-xl font-mono font-black text-center text-lg text-emerald-900 mt-2" />
              <div className="flex justify-end gap-2 pt-2"><button type="submit" disabled={submittingProp} className="px-5 py-2.5 bg-emerald-700 text-white font-black rounded-xl cursor-pointer">Simpan Properti</button></div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}