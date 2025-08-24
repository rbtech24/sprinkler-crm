"use client";

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function InspectionIndexPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const clientId = searchParams.get('clientId');
  const siteId = searchParams.get('siteId');
  const inspectionId = searchParams.get('inspectionId');

  useEffect(() => {
    // Redirect to appropriate route based on parameters
    const queryParams = new URLSearchParams();
    if (clientId) queryParams.set('clientId', clientId);
    if (siteId) queryParams.set('siteId', siteId);
    
    if (inspectionId) {
      // Editing existing inspection
      router.replace(`/tech/inspection/${inspectionId}?${queryParams.toString()}`);
    } else {
      // Creating new inspection
      router.replace(`/tech/inspection/new?${queryParams.toString()}`);
    }
  }, [router, clientId, siteId, inspectionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}