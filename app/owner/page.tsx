'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  loginOwnerDashboard,
  getOwnerPropertyDetails,
  createProperty,
  updateProperty,
  deleteProperty,
  updateTenantData,
  deleteTenant,
  updateHouseRules,
  updateTenantPaymentStatus,
  addPropertyExpense,
  deletePropertyExpense,
} from '../../src/actions/checkin-tenant';

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
  rent_price?: number;
  payment_status?: string;
  marital_status?: string;
  occupation?: string;
  property_id?: string;
  marriage_doc_url?: string;
  kk_doc_url?: string;
  ktp_path?: string;
}

interface Expense {
  id: string;
  property_id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  notes?: string;
}

interface Property {
  id: string;
  name: string;
  property_name?: string;
  type: string;
  slug: string;
  address?: string;
  house_rules?: string;
  status?: string;
  owner_name?: string;
  owner_phone?: string;
  manager_name?: string;
  manager_phone?: string;
  total_rooms?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  pin_code?: string;
}

function cleanDigits(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function isPhoneMatch(phoneA?: string, phoneB?: string): boolean {
  const a = cleanDigits(phoneA);
  const b = cleanDigits(phoneB);
  if (!a || !b) return false;
  if (a === b) return true;
  const suffixA = a.length >= 8 ? a.slice(-9) : a;
  const suffixB = b.length >= 8 ? b.slice(-9) : b;
  return suffixA === suffixB;
}

function parseRoomNumber(roomStr?: string): number | null {
  if (!roomStr) return null;
  const match = roomStr.match(/(?:kamar|unit|no\.?)\s*(\d+)/i) || roomStr.match(/^(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

// LOGIKA RIWAYAT SEWA (SINKRON 100% DENGAN PORTAL WARGA)
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
    if (dYearMonth < entryYearMonth) {
      status = 'N/A'; // Belum masuk kos di bulan ini
    } else if (dYearMonth === currentYearMonth) {
      status = isPaidCurrent ? 'PAID' : 'UNPAID';
    } else {
      status = 'PAID'; // Asumsi bulan lalu sudah lunas
    }

    history.push({
      labelShort: MONTH_NAMES_SHORT[d.getMonth()],
      status: status,
      isCurrent: i === 0
    });
  }
  return history;
}

export default function OwnerDashboard() {
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'penyewa' | 'pengeluaran' | 'matrix'>('penyewa');

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showAddPropModal, setShowAddPropModal] = useState<boolean>(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propName, setPropName] = useState<string>('');
  const [propType, setPropType] = useState<'kos' | 'kontrakan'>('kos');
  const [propTotalRooms, setPropTotalRooms] = useState<number>(10);
  const [propOwnerName, setPropOwnerName] = useState<string>('');
  const [propOwnerPhone, setPropOwnerPhone] = useState<string>('');
  const [propManagerName, setPropManagerName] = useState<string>('');
  const [propManagerPhone, setPropManagerPhone] = useState<string>('');
  const [propBankName, setPropBankName] = useState<string>('BCA');
  const [propBankAcc, setPropBankAcc] = useState<string>('');
  const [propBankHolder, setPropBankHolder] = useState<string>('');
  const [propAddress, setPropAddress] = useState<string>('');
  const [propRules, setPropRules] = useState<string>('');
  const [propPin, setPropPin] = useState<string>('');
  const [submittingProp, setSubmittingProp] = useState<boolean>(false);

  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
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
  const [rulesText, setRulesText] = useState<string>('');
  const [savingRules, setSavingRules] = useState<boolean>(false);

  const [posterProp, setPosterProp] = useState<Property | null>(null);

  const handleZoomIn = () => setZoomPercent((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomPercent((prev) => Math.max(prev - 15, 85));

  const handleOpenAddPropModal = () => {
    setEditingProperty(null);
    setPropName('');
    setPropType('kos');
    setPropTotalRooms(10);
    setPropOwnerName('');
    setPropOwnerPhone(loginPhone || '');
    setPropManagerName('');
    setPropManagerPhone('');
    setPropBankName('BCA');
    setPropBankAcc('');
    setPropBankHolder('');
    setPropAddress('');
    setPropRules('');
    setPropPin('');
    setShowAddPropModal(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || !loginPin) return;

    setLoginLoading(true);
    setLoginError('');

    const res = await loginOwnerDashboard(loginPhone, loginPin);
    setLoginLoading(false);

    if (res.success && res.properties && res.properties.length > 0) {
      setMyProperties(res.properties);
      setIsLoggedIn(true);

      if (res.initialDetails) {
        setActiveProperty(res.initialDetails.property);
        setTenants(res.initialDetails.tenants || []);
        setExpenses(res.initialDetails.expenses || []);
      } else {
        await handleSelectProperty(res.properties[0]);
      }
    } else {
      setLoginError(res.error || 'Nomor WhatsApp atau PIN 4-Digit salah.');
    }
  };

  const handleSelectProperty = async (prop: Property) => {
    setLoadingDetails(true);
    setActiveProperty(prop);
    const details = await getOwnerPropertyDetails(prop.id);
    setLoadingDetails(false);

    if (details.success) {
      setTenants(details.tenants || []);
      setExpenses(details.expenses || []);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginPhone('');
    setLoginPin('');
    setMyProperties([]);
    setActiveProperty(null);
    setTenants([]);
    setExpenses([]);
  };

  const handleOpenEditProp = (prop: Property) => {
    setEditingProperty(prop);
    setPropName(prop.name || prop.property_name || '');
    setPropType((prop.type as 'kos' | 'kontrakan') || 'kos');
    setPropTotalRooms(prop.total_rooms || 10);
    setPropOwnerName(prop.owner_name || '');
    setPropOwnerPhone(prop.owner_phone || '');
    setPropManagerName(prop.manager_name || '');
    setPropManagerPhone(prop.manager_phone || '');
    setPropBankName(prop.bank_name || 'BCA');
    setPropBankAcc(prop.bank_account_number || '');
    setPropBankHolder(prop.bank_account_holder || '');
    setPropAddress(prop.address || '');
    setPropPin(prop.pin_code || '1234');
    setShowAddPropModal(true);
  };

  const handlePropFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName) return;

    setSubmittingProp(true);

    if (editingProperty) {
      const res = await updateProperty(editingProperty.id, {
        name: propName,
        type: propType,
        total_rooms: propTotalRooms,
        owner_name: propOwnerName,
        owner_phone: propOwnerPhone,
        manager_name: propManagerName,
        manager_phone: propManagerPhone,
        bank_name: propBankName,
        bank_account_number: propBankAcc,
        bank_account_holder: propBankHolder,
        address: propAddress,
        pin_code: propPin,
      });
      setSubmittingProp(false);

      if (res.success) {
        alert(`✅ Berhasil! Data properti "${propName}" & PIN unit berhasil diperbarui.`);
        setEditingProperty(null);
        setShowAddPropModal(false);

        const updatedList = myProperties.map((p) =>
          p.id === editingProperty.id
            ? { ...p, name: propName, property_name: propName, type: propType, total_rooms: propTotalRooms, owner_name: propOwnerName, owner_phone: propOwnerPhone, manager_name: propManagerName, manager_phone: propManagerPhone, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder, address: propAddress, pin_code: propPin }
            : p
        );
        setMyProperties(updatedList);

        if (activeProperty && activeProperty.id === editingProperty.id) {
          setActiveProperty({ ...activeProperty, name: propName, property_name: propName, type: propType, total_rooms: propTotalRooms, owner_name: propOwnerName, owner_phone: propOwnerPhone, manager_name: propManagerName, manager_phone: propManagerPhone, bank_name: propBankName, bank_account_number: propBankAcc, bank_account_holder: propBankHolder, address: propAddress, pin_code: propPin });
        }
      } else {
        alert('Gagal update properti: ' + res.error);
      }
    } else {
      if (!propPin || !/^\d{4}$/.test(propPin)) {
        alert('PIN harus berupa 4-digit angka (contoh: 1234)');
        setSubmittingProp(false);
        return;
      }

      const res = await createProperty(
        propName, propType, propAddress, propRules, propPin,
        propOwnerName || loginPhone, propOwnerPhone || loginPhone, propManagerName, propManagerPhone,
        propTotalRooms, propBankName, propBankAcc, propBankHolder
      );
      setSubmittingProp(false);

      if (res && res.success && res.data) {
        alert(`✅ Berhasil! Properti "${propName}" berhasil didaftarkan ke sistem RT.`);
        setShowAddPropModal(false);

        if (isLoggedIn) {
          const newPropList = [res.data, ...myProperties];
          setMyProperties(newPropList);
          await handleSelectProperty(res.data);
        } else {
          setLoginPhone(propOwnerPhone || loginPhone);
          setLoginPin(propPin);
          setIsLoggedIn(true);
          setMyProperties([res.data]);
          await handleSelectProperty(res.data);
        }
      } else {
        alert('Gagal membuat properti: ' + (res?.error || 'Kesalahan teknis'));
      }
    }
  };

  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty || !expenseTitle || !expenseAmount) return;

    setSavingExpense(true);
    const parsedAmount = parseInt(expenseAmount.replace(/\D/g, ''), 10) || 0;

    const res = await addPropertyExpense(activeProperty.id, expenseTitle, expenseCategory, parsedAmount, expenseDate);
    setSavingExpense(false);

    if (res.success && res.data) {
      setExpenses([res.data, ...expenses]);
      setShowAddExpenseModal(false);
      setExpenseTitle('');
      setExpenseAmount('');
      alert(`✅ Berhasil Tersimpan!\n\nPengeluaran "${expenseTitle}" (${expenseCategory}) sebesar Rp ${parsedAmount.toLocaleString('id-ID')} telah dicatat di Buku Kas.`);
    } else {
      alert('Gagal mencatat pengeluaran: ' + res.error);
    }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Hapus catatan pengeluaran "${title}"?`)) {
      setExpenses(expenses.filter((e) => e.id !== id));
      await deletePropertyExpense(id);
    }
  };

  const handleOpenEditTenant = (t: Tenant) => {
    setEditingTenant(t);
    setTenantName(t.name);
    setTenantPhone(t.phone);
    setTenantRoom(t.room_number || '');
    setTenantRelation(t.relation || 'Istri');
    setTenantRentPrice(t.rent_price ? String(t.rent_price) : '1500000');
  };

  const handleSaveTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setSavingTenant(true);
    const parsedPrice = parseInt(tenantRentPrice.replace(/\D/g, ''), 10) || 0;

    const res = await updateTenantData(editingTenant.id, {
      name: tenantName, phone: tenantPhone, room_number: tenantRoom, relation: tenantRelation, rent_price: parsedPrice,
    });
    setSavingTenant(false);

    if (res.success) {
      setTenants((prev) =>
        prev.map((t) => t.id === editingTenant.id ? { ...t, name: tenantName, phone: tenantPhone, room_number: tenantRoom, relation: tenantRelation, rent_price: parsedPrice } : t)
      );
      setEditingTenant(null);
      alert(`✅ Berhasil Tersimpan!\n\nData penyewa ${tenantName} (${tenantRoom || 'Kamar'}) telah diperbarui dengan nominal sewa Rp ${parsedPrice.toLocaleString('id-ID')}/bulan.`);
    } else {
      alert('Gagal update data penyewa: ' + res.error);
    }
  };

  const handleTogglePaymentStatus = async (tenantId: string, currentStatus?: string) => {
    const newStatus = (currentStatus || '').toUpperCase() === 'PAID' ? 'UNPAID' : 'PAID';
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, payment_status: newStatus } : t)));
    await updateTenantPaymentStatus(tenantId, newStatus);
  };

  const handleShareWA = (prop: Property) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const checkinUrl = origin + '/checkin/' + prop.slug;
    const propNameStr = prop.name || prop.property_name;

    const message = `Halo calon penghuni *${propNameStr}*,\n\nSesuai Peraturan Wajib Lapor RT setempat, mohon melengkapi formulir lapor diri digital resmi melalui tautan berikut:\n\n👉 ${checkinUrl}\n\nProses ini wajib untuk pendataan kependudukan RT. Terima kasih.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendReminderWA = (t: Tenant) => {
    if (!activeProperty) return;
    const rawPhone = (t.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
    const propNameStr = activeProperty.name || activeProperty.property_name;
    const roomStr = t.room_number || 'Kamar Unit';
    const nominalStr = Number(t.rent_price || 0).toLocaleString('id-ID');
    const bankInfo = activeProperty.bank_account_number ? `${activeProperty.bank_name} ${activeProperty.bank_account_number} a.n. ${activeProperty.bank_account_holder}` : 'rekening pengelola';

    const message = `Halo Kak *${t.name}*,\n\nMengingatkan tagihan sewa *${propNameStr}* (${roomStr}) sebesar *Rp ${nominalStr}* untuk periode bulan ini.\n\nPembayaran dapat ditransfer ke:\n🏦 *${bankInfo}*\n\nMohon konfirmasi jika telah melakukan transfer. Terima kasih.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDeleteTenantRow = async (id: string, name: string) => {
    if (confirm(`Hapus data penghuni "${name}" dari sistem?`)) {
      setTenants((prev) => prev.filter((t) => t.id !== id));
      await deleteTenant(id);
    }
  };

  const handleOpenRulesModal = (prop: Property) => {
    setEditingRulesProp(prop);
    setRulesText(
      prop.house_rules ||
        `1. Wajib menjaga ketertiban, ketenangan, dan kebersihan lingkungan.\n2. Dilarang membawa barang terlarang (narkoba, miras, senjata tajam).\n3. Jam bertamu maksimal pukul 22.00 WIB demi keamanan lingkungan.\n4. Pembayaran sewa paling lambat tanggal 5 setiap bulannya.`
    );
  };

  const handleSaveRules = async () => {
    if (!editingRulesProp) return;
    setSavingRules(true);
    const res = await updateHouseRules(editingRulesProp.id, rulesText);
    setSavingRules(false);

    if (res && res.success) {
      alert('✅ Berhasil Tersimpan!\n\nTata tertib hunian telah diperbarui dan langsung aktif di portal warga.');
      setEditingRulesProp(null);
      if (activeProperty) setActiveProperty({ ...activeProperty, house_rules: rulesText });
    } else {
      alert('Gagal menyimpan tata tertib: ' + (res?.error || 'Kesalahan database'));
    }
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

  return (
    <main style={{ fontSize: `${zoomPercent}%` }} className="min-h-screen p-3 md:p-8 bg-slate-50 text-slate-900 transition-all font-sans">
      <div className="max-w-6xl mx-auto space-y-5">
        <header className="bg-emerald-800 text-white p-5 md:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[1.3rem]">🏢⚡</span>
              <h1 className="text-[1.4rem] font-black text-white">Portal <span className="text-amber-400">Pemilik Kos & Kontrakan</span></h1>
            </div>
            <p className="text-[0.8rem] text-emerald-100 mt-1 font-medium">Sistem Manajemen Properti Privat & Terintegrasi RT</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-600/80 flex items-center gap-1.5 shadow-inner">
              <span className="text-[0.75rem] font-bold text-emerald-300 px-1">T↕</span>
              <button onClick={handleZoomOut} className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400">A-</button>
              <span className="text-[0.7rem] font-mono font-black text-amber-300 px-1">{zoomPercent}%</span>
              <button onClick={handleZoomIn} className="px-2.5 py-1 rounded-xl text-[0.75rem] font-black bg-emerald-900 text-emerald-200 hover:bg-amber-400">A+</button>
            </div>
            <Link href="/" className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-[0.75rem] rounded-2xl shadow">🚪 Keluar</Link>
          </div>
        </header>

        {!isLoggedIn ? (
          <div className="max-w-md mx-auto bg-white p-6 md:p-8 rounded-3xl shadow-md border-2 border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-900 rounded-3xl flex items-center justify-center text-[1.8rem] mx-auto shadow-inner">🏢</div>
            <h2 className="text-[1.2rem] font-black text-slate-900">Masuk Dasbor Pemilik</h2>
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <input type="tel" required placeholder="08xxxxxxxxxx" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))} className="w-full p-3.5 border-2 border-slate-200 rounded-2xl outline-none font-mono text-[1rem] font-bold bg-white focus:border-emerald-600" />
              <input type="password" maxLength={4} required placeholder="• • • •" value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))} className="w-full p-3.5 border-2 border-slate-200 rounded-2xl outline-none font-mono text-[1.2rem] font-bold text-center bg-white tracking-[0.4em] focus:border-emerald-600" />
              <button type="submit" disabled={loginLoading || !loginPhone || loginPin.length !== 4} className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[0.95rem] rounded-2xl cursor-pointer shadow-md">{loginLoading ? 'Memeriksa...' : 'Buka Dasbor Saya →'}</button>
            </form>
            <div className="pt-3 border-t-2 border-slate-100 text-center">
              <button onClick={handleOpenAddPropModal} className="text-[0.85rem] text-emerald-800 font-black hover:underline cursor-pointer">➕ Daftarkan Properti Kos Baru</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* DROPDOWN & MENU OWNER */}
            <div className="bg-white p-4 md:p-5 rounded-3xl shadow-sm border-2 border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.85rem] font-black text-slate-700">Unit Aktif:</span>
                <select value={activeProperty?.id || ''} onChange={(e) => { const s = myProperties.find((p) => p.id === e.target.value); if(s) handleSelectProperty(s); }} className="p-2.5 border-2 border-emerald-400 rounded-2xl font-black text-emerald-950 bg-emerald-50 text-[0.9rem] outline-none cursor-pointer">
                  {myProperties.map((p) => (<option key={p.id} value={p.id}>🏠 {p.name || p.property_name}</option>))}
                </select>
                <span className="text-[0.7rem] font-black px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">👑 PEMILIK</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleOpenAddPropModal} className="px-3.5 py-2.5 bg-emerald-700 text-white text-[0.75rem] font-black rounded-xl shadow-sm cursor-pointer">➕ Tambah Unit</button>
                <button onClick={() => activeProperty && handleOpenEditProp(activeProperty)} className="px-3.5 py-2.5 bg-amber-400 text-slate-950 text-[0.75rem] font-black rounded-xl border border-amber-500 cursor-pointer">✏️ Edit Properti</button>
                <button onClick={handleLogout} className="px-3.5 py-2.5 bg-red-100 text-red-800 text-[0.75rem] font-bold rounded-xl border border-red-300 cursor-pointer">🔒 Logout</button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="p-12 text-center bg-white rounded-3xl border-2">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 font-bold text-slate-600 text-[0.85rem]">Memuat Data Finansial & Kamar...</p>
              </div>
            ) : activeProperty ? (
              <div className="space-y-5">
                {/* 3 HERO CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-800 text-white p-6 rounded-3xl shadow-lg space-y-1">
                    <span className="text-[0.7rem] font-black uppercase bg-emerald-950/60 px-2.5 py-0.5 rounded-full">SEWA MASUK (LUNAS)</span>
                    <h3 className="text-[1.6rem] font-black mt-1">Rp {totalRentCollected.toLocaleString('id-ID')}</h3>
                    <p className="text-[0.75rem] text-emerald-100 font-medium">Dari kamar berstatus lunas</p>
                  </div>
                  <div className="bg-red-800 text-white p-6 rounded-3xl shadow-lg space-y-1">
                    <span className="text-[0.7rem] font-black uppercase bg-red-950/60 px-2.5 py-0.5 rounded-full">PENGELUARAN BULAN INI</span>
                    <h3 className="text-[1.6rem] font-black mt-1">Rp {totalExpenses.toLocaleString('id-ID')}</h3>
                    <p className="text-[0.75rem] text-red-100 font-medium">Listrik, air, WiFi, sampah</p>
                  </div>
                  {isOwner ? (
                    <div className="bg-amber-400 text-slate-950 p-6 rounded-3xl shadow-lg space-y-1 border-2 border-amber-500">
                      <span className="text-[0.7rem] font-black uppercase bg-amber-200/80 px-2.5 py-0.5 rounded-full">LABA BERSIH BULAN INI</span>
                      <h3 className="text-[1.6rem] font-black mt-1">Rp {netProfit.toLocaleString('id-ID')}</h3>
                      <p className="text-[0.75rem] font-bold">Okupansi: {Math.round((countActiveRooms / totalRooms) * 100)}% ({countActiveRooms}/{totalRooms} Terisi)</p>
                    </div>
                  ) : (
                    <div className="bg-slate-200 p-6 rounded-3xl text-center"><p className="text-[0.8rem] font-bold mt-2">🔒 Laba bersih khusus Pemilik.</p></div>
                  )}
                </div>

                {/* TAB NAVIGASI DASBOR OWNER */}
                <div className="flex border-b-2 border-slate-200 gap-2">
                  <button onClick={() => setActiveTab('penyewa')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 ${activeTab === 'penyewa' ? 'bg-white border-slate-300 text-emerald-800 -mb-0.5 shadow-sm' : 'bg-slate-100 border-transparent text-slate-600'} cursor-pointer`}>👥 Daftar Penyewa ({tenants.length})</button>
                  <button onClick={() => setActiveTab('pengeluaran')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 ${activeTab === 'pengeluaran' ? 'bg-white border-slate-300 text-red-800 -mb-0.5 shadow-sm' : 'bg-slate-100 border-transparent text-slate-600'} cursor-pointer`}>📈 Pengeluaran ({expenses.length})</button>
                  <button onClick={() => setActiveTab('matrix')} className={`py-3 px-5 text-[0.85rem] font-black rounded-t-2xl border-t-2 border-l-2 border-r-2 ${activeTab === 'matrix' ? 'bg-white border-slate-300 text-slate-900 -mb-0.5 shadow-sm' : 'bg-slate-100 border-transparent text-slate-600'} cursor-pointer`}>🏠 Matrix ({emptyRooms} Kosong)</button>
                </div>

                {/* TAB 1: PENYEWA */}
                {activeTab === 'penyewa' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 gap-2">
                      <h3 className="text-[1rem] font-black uppercase text-slate-900">Penghuni: {activeProperty.name || activeProperty.property_name}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => handleShareWA(activeProperty)} className="px-3 py-2 bg-emerald-600 text-white text-[0.75rem] font-bold rounded-2xl shadow cursor-pointer">💬 Link WA Check-in</button>
                        <button onClick={() => setPosterProp(activeProperty)} className="px-3 py-2 bg-slate-800 text-white text-[0.75rem] font-bold rounded-2xl shadow cursor-pointer">🖨️ Poster QR</button>
                        <button onClick={() => handleOpenRulesModal(activeProperty)} className="px-3 py-2 bg-amber-400 text-slate-950 text-[0.75rem] font-black rounded-2xl shadow cursor-pointer">📜 Tata Tertib</button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[0.8rem]">
                        <thead>
                          <tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]">
                            <th className="p-3">Nama & Peran</th>
                            <th className="p-3">Kamar & Tgl Masuk</th>
                            <th className="p-3">Status Tagihan</th>
                            <th className="p-3">Riwayat Sewa (3 Bulan)</th>
                            <th className="p-3">Nominal Sewa</th>
                            <th className="p-3">Status RT</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {tenants.map((t) => {
                            const isPaid = (t.payment_status || '').toUpperCase() === 'PAID';
                            const isHeadPerson = t.is_head || (t.relation || '').toLowerCase().includes('penanggung');
                            // Panggil fungsi terpusat Riwayat Sewa (Sinkron 100%)
                            const threeMonthHistory = getThreeMonthHistory(t.payment_status || '', t.entry_date);

                            return (
                              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                  <div className="font-black text-slate-900">{t.name}</div>
                                  <span className="text-[0.65rem] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border inline-block mt-0.5">{t.relation || 'Anggota'}</span>
                                </td>
                                <td className="p-3">
                                  <span className="font-bold text-emerald-900 block">{t.room_number || '-'}</span>
                                  <span className="text-[0.65rem] font-mono text-slate-500 font-bold block mt-0.5">Tgl Masuk: {t.entry_date}</span>
                                </td>
                                <td className="p-3">
                                  {isHeadPerson ? (
                                    <button onClick={() => handleTogglePaymentStatus(t.id, t.payment_status)} className={`px-2.5 py-1 rounded-xl text-[0.7rem] font-black cursor-pointer shadow-sm ${isPaid ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>{isPaid ? '✅ LUNAS' : '❌ BELUM LUNAS'}</button>
                                  ) : (<span className="text-slate-400 font-bold text-[0.7rem] italic">- (Ikut Tagihan PJ)</span>)}
                                </td>
                                <td className="p-3">
                                  {isHeadPerson ? (
                                    <div className="flex gap-1">
                                      {threeMonthHistory.map((m, idx) => (
                                        <span key={idx} className={`text-[0.65rem] font-black px-2 py-0.5 rounded-lg border ${m.status === 'N/A' ? 'bg-slate-100 text-slate-400 border-slate-200' : m.status === 'PAID' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'}`}>
                                          {m.labelShort} {m.status === 'N/A' ? '-' : m.status === 'PAID' ? '✓' : '✗'}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (<span className="text-slate-400 font-bold text-[0.7rem]">-</span>)}
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-900">{isHeadPerson ? `Rp ${Number(t.rent_price || 0).toLocaleString('id-ID')}` : 'Rp 0'}</td>
                                <td className="p-3">
                                  <span className={'text-[0.65rem] font-black px-2 py-0.5 rounded-full uppercase inline-block ' + (t.status === 'VERIFIED' || t.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-amber-100 text-amber-900 border border-amber-300')}>{t.status === 'VERIFIED' || t.status === 'ACTIVE' ? '✅ TERVERIFIKASI' : '⚠️ MENUNGGU'}</span>
                                </td>
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

                {/* TAB 2: PENGELUARAN (PULIH 100%) */}
                {activeTab === 'pengeluaran' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                      <div><h3 className="text-[1rem] font-black text-slate-900 uppercase">Buku Kas Pengeluaran Kos</h3></div>
                      <button onClick={() => setShowAddExpenseModal(true)} className="px-4 py-2 bg-red-700 text-white text-[0.8rem] font-black rounded-2xl shadow cursor-pointer">➕ Catat Pengeluaran</button>
                    </div>
                    {expenses.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-slate-50"><p className="text-[0.8rem] text-slate-500 font-medium">Belum ada pengeluaran dicatat.</p></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[0.8rem]">
                          <thead>
                            <tr className="bg-slate-100 border-b-2 text-slate-700 font-black uppercase text-[0.7rem]">
                              <th className="p-3">Tanggal</th><th className="p-3">Kategori</th><th className="p-3">Keterangan</th><th className="p-3">Nominal (Rp)</th><th className="p-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {expenses.map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-50">
                                <td className="p-3 font-mono font-semibold">{exp.expense_date}</td>
                                <td className="p-3"><span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-lg text-[0.7rem] font-bold">{exp.category}</span></td>
                                <td className="p-3 font-medium text-slate-800">{exp.title}</td>
                                <td className="p-3 font-mono font-black text-red-700">- Rp {Number(exp.amount || 0).toLocaleString('id-ID')}</td>
                                <td className="p-3 text-right"><button onClick={() => handleDeleteExpense(exp.id, exp.title)} className="text-red-600 font-bold cursor-pointer hover:underline">✕ Hapus</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: MATRIX KAMAR (PULIH 100%) */}
                {activeTab === 'matrix' && (
                  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border-2 border-slate-200 space-y-4">
                    <div className="border-b pb-3">
                      <h3 className="text-[1rem] font-black text-slate-900 uppercase">Matrix Okupansi Kamar ({activeProperty.total_rooms || 10} Total Unit)</h3>
                    </div>
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

              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* MODAL EDIT PENYEWA (BESERTA POP-UP SIMPAN) */}
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

      {/* MODAL INPUT PENGELUARAN */}
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

      {/* MODAL POSTER QR */}
      {posterProp && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border-2">
            <div className="p-4 bg-emerald-800 text-white flex justify-between print:hidden"><h3 className="font-bold text-[0.85rem]">🖨️ Poster Resmi QR RT</h3><button onClick={() => setPosterProp(null)}>✕</button></div>
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-black uppercase">WAJIB LAPOR DIRI</h2><h3 className="text-lg font-black">{posterProp.name || posterProp.property_name}</h3>
              <div className="bg-slate-50 p-4 rounded-2xl border inline-block"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent((typeof window !== 'undefined' ? window.location.origin : '') + '/checkin/' + posterProp.slug)}`} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl" /></div>
            </div>
            <div className="p-3 bg-slate-100 flex justify-end gap-2 print:hidden"><button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white font-black rounded-xl">🖨️ Cetak Poster</button></div>
          </div>
        </div>
      )}

      {/* MODAL TATA TERTIB */}
      {editingRulesProp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border-2">
            <div className="p-4 bg-emerald-800 text-white flex justify-between"><h3 className="font-bold text-[0.85rem]">📜 Tata Tertib ({editingRulesProp.name})</h3><button onClick={() => setEditingRulesProp(null)}>✕</button></div>
            <div className="p-4 bg-slate-50"><textarea rows={7} value={rulesText} onChange={(e) => setRulesText(e.target.value)} className="w-full p-3 border rounded-2xl font-mono text-[0.8rem]"></textarea></div>
            <div className="p-3 bg-slate-100 flex justify-end gap-2"><button onClick={handleSaveRules} className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl shadow">Simpan Aturan</button></div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PROPERTI */}
      {showAddPropModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border-2 max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-emerald-800 text-white flex justify-between"><h3 className="font-bold text-[0.9rem]">{editingProperty ? '✏️ Edit Properti' : '🏢 Daftar Properti Baru'}</h3><button onClick={() => {setShowAddPropModal(false); setEditingProperty(null);}}>✕</button></div>
            <form onSubmit={handlePropFormSubmit} className="p-5 space-y-4 text-[0.8rem]">
              <input type="text" required placeholder="Nama Kos" value={propName} onChange={(e) => setPropName(e.target.value)} className="w-full p-2.5 border-2 rounded-xl font-bold" />
              <input type="number" required placeholder="Total Kamar" value={propTotalRooms} onChange={(e) => setPropTotalRooms(parseInt(e.target.value, 10)||1)} className="w-full p-2.5 border-2 rounded-xl font-bold" />
              <input type="text" maxLength={4} required placeholder="PIN 4 Digit Akses" value={propPin} onChange={(e) => setPropPin(e.target.value.replace(/\D/g, ''))} className="w-full p-2.5 border-2 border-emerald-400 rounded-xl font-mono font-black text-center text-lg text-emerald-900" />
              <div className="flex justify-end gap-2 pt-2"><button type="submit" disabled={submittingProp} className="px-5 py-2.5 bg-emerald-700 text-white font-black rounded-xl">Simpan Properti</button></div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
