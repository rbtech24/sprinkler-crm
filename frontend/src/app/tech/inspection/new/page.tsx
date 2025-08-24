"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MobileInspectionForm } from '@/components/inspections/mobile-inspection-form';
import { IrrigationInspection } from '@/types/irrigation-inspection';

function InspectionFormWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const clientId = searchParams.get('clientId') || '';
  const siteId = searchParams.get('siteId') || '';

  const handleInspectionSubmit = async (inspectionData: IrrigationInspection) => {
    try {
      const response = await fetch('http://localhost:3000/api/inspections-mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...inspectionData,
          clientId,
          siteId
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect to the completed inspection page
        router.push(`/tech/inspection/${result.data.id}?clientId=${clientId}&siteId=${siteId}`);
      } else {
        throw new Error('Failed to create inspection');
      }
    } catch (error) {
      console.error('Failed to submit inspection:', error);
      // Could show error state here
    }
  };

  const handleAutoSave = async (partialData: Partial<IrrigationInspection>) => {
    // For new inspections, we don't auto-save until first submission
    console.log('Auto-save data for new inspection:', partialData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileInspectionForm
        clientId={clientId}
        siteId={siteId}
        onSubmit={handleInspectionSubmit}
        onAutoSave={handleAutoSave}
      />
    </div>
  );
}

export default function NewInspectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <InspectionFormWrapper />
    </Suspense>
  );
}