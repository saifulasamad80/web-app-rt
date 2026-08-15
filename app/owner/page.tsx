'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  loginOwnerDashboard,
  getOwnerPropertyDetails,
  createProperty,
  updateProperty,
  updateTenantData,
  deleteTenant,
  updateTenantPaymentStatus,
  addPropertyExpense,
  deletePropertyExpense,
} from '../../src/actions/checkin-tenant';

interface Tenant {
  id: string; name: string; phone: string; entry_date: string; status: string;
  relation?: string; room_number?: string; rent_price?: number; payment_status?: string;
  marital_status?: string; property_id?: string; marriage_doc_url?: string; kk_doc_url?: string; ktp_path?: string;
}

interface Expense {
  id: string; property_id: string; title: string; category: string; amount: number; expense_date: string;
}

interface Property {
  id: string; name: string; property_name?: string; type: string; slug: string;
  address?: string; owner_phone?: string; manager_phone?: string; total_rooms?: number;
  bank_name?: string; bank_account_number?: string; bank_account_holder?: string; pin_code?: string;
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
  const [copyMsg, setCopyMsg] = useState('');
  const [showAddPropModal, setShowAddPropModal] = useState<boolean>(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  
  // Data Form
  const [propName, setPropName] = useState('');
  const [propType, setPropType] = useState<'kos' | 'kontrakan'>('kos');
  const [propTotalRooms, setPropTotalRooms] = useState(10);
  const [propOwnerName, setPropOwnerName] = useState('');
  const [propOwnerPhone, setPropOwnerPhone] = useState('');
  const [propManagerName, setPropManagerName] = useState('');
  const [propManagerPhone, setPropManagerPhone] = useState('');
  const [propBankAcc, setPropBankAcc] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propPin, setPropPin] = useState('');
  const [submittingProp, setSubmittingProp] = useState(false);

  const isOwner = activeProperty && loginPhone && activeProperty.owner_phone === loginPhone;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const res = await loginOwnerDashboard(loginPhone, loginPin);
    setLoginLoading(false);
    if (res.success && res.properties) {
      setMyProperties(res.properties);
      setIsLoggedIn(true);
      await handleSelectProperty(res.properties[0]);
    } else {
      setLoginError(res.error || 'Login gagal');
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

  const handleOpenEditProp = (prop: Property) => {
    setEditingProperty(prop);
    setPropName(prop.name || prop.property_name || '');
    setPropType((prop.type as 'kos' | 'kontrakan') || 'kos');
    setPropTotalRooms(prop.total_rooms || 10);
    setPropOwnerName(prop.owner_name || '');
    setPropOwnerPhone(prop.owner_phone || '');
    setPropManagerName(prop.manager_name || '');
    setPropManagerPhone(prop.manager_phone || '');
    setPropBankAcc(prop.bank_account_number || '');
    setPropAddress(prop.address || '');
    setShowAddPropModal(true); // Memaksa Modal Terbuka
  };

  return (
    <main style={{ fontSize: `${zoomPercent}%` }} className="min-h-screen p-8 bg-slate-50 text-slate-900 font-sans">
        {/* Konten Utama */}
        {isLoggedIn && activeProperty && (
            <div className="space-y-4">
                <div className="flex gap-2">
                    {isOwner && (
                        <button onClick={() => handleOpenEditProp(activeProperty)} className="px-4 py-2 bg-amber-400 font-bold rounded-xl">✏️ Edit Data & Pengelola</button>
                    )}
                </div>
                {/* Laba Bersih hanya muncul jika isOwner benar */}
                {isOwner ? (
                    <div className="bg-amber-400 p-6 rounded-3xl">Laba Bersih: Rp ...</div>
                ) : (
                    <div className="bg-slate-200 p-6 rounded-3xl">Laba Bersih: 🔒 (Hanya Owner)</div>
                )}
            </div>
        )}
        
        {/* Modal Edit */}
        {showAddPropModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-3xl w-full max-w-lg">
                    <h2 className="font-black text-lg mb-4">Edit Properti</h2>
                    {/* ... form inputs ... */}
                    <button onClick={() => setShowAddPropModal(false)} className="mt-4 px-4 py-2 bg-slate-200 rounded-xl">Tutup</button>
                </div>
            </div>
        )}
    </main>
  );
}
