'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  loginOwnerDashboard,
  getOwnerPropertyDetails,
  updateTenantData,
  updateTenantPaymentStatus,
  addPropertyExpense,
  deletePropertyExpense,
  deleteTenant,
} from '../../src/actions/checkin-tenant';

export default function OwnerDashboard() {
  // ... (tambah state: const isOwner = activeProperty?.owner_phone === loginPhone;)
  // Di bagian render Laba Bersih:
  // {isOwner && ( ... kotak laba bersih ... )}
  // Di bagian tombol Edit:
  // {isOwner && ( <button onClick={() => { setEditingProperty(prop); setShowAddPropModal(true); }}>Edit</button> )}

  // Pastikan tombol Edit memicu modal
  const handleOpenEditProp = (prop: Property) => {
    setEditingProperty(prop);
    setShowAddPropModal(true); // <--- KUNCI: Paksa buka modal
    // ... isi field ...
  };
}
