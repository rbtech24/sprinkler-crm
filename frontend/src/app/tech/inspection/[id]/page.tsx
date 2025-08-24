"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { MobileInspectionForm } from '@/components/inspections/mobile-inspection-form';
import { SignaturePad } from '@/components/inspections/signature-pad';
import { QuoteBuilder } from '@/components/inspections/quote-builder';
import { PDFReportGenerator } from '@/components/inspections/pdf-report-generator';
import { IrrigationInspection } from '@/types/irrigation-inspection';
import { Button } from '@/components/ui';
import { 
  FileText, 
  Calculator, 
  Share2, 
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Edit3
} from 'lucide-react';

function InspectionWrapper() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const inspectionId = params.id as string;
  const clientId = searchParams.get('clientId') || '';
  const siteId = searchParams.get('siteId') || '';

  const [inspection, setInspection] = useState<IrrigationInspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<'loading' | 'completed' | 'editing' | 'error'>('loading');

  // Load existing inspection
  useEffect(() => {
    if (inspectionId && inspectionId !== 'new') {
      loadExistingInspection(inspectionId);
    } else if (inspectionId === 'new') {
      // New inspection mode
      setIsEditing(true);
      setCompletionStatus('editing');
      setIsLoading(false);
    }
  }, [inspectionId]);

  const loadExistingInspection = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/inspections/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Safely parse JSON fields that might be empty or malformed
        const parseJsonSafely = (jsonString: any, fallback: any = {}) => {
          if (!jsonString || jsonString === '') return fallback;
          if (typeof jsonString === 'object') return jsonString;
          try {
            return JSON.parse(jsonString);
          } catch (e) {
            console.warn('Failed to parse JSON:', jsonString, e);
            return fallback;
          }
        };
        
        // Convert the backend data to our frontend format
        const inspectionData = {
          ...data.data,
          clientId: data.data.client_id,
          siteId: data.data.site_id,
          technicianId: data.data.technician_id,
          inspectionType: data.data.inspection_type,
          scheduledDate: data.data.scheduled_date,
          startedAt: data.data.started_at,
          completedAt: data.data.completed_at,
          propertyAddress: data.data.property_address || '',
          propertyType: data.data.property_type || 'residential',
          propertySize: data.data.property_size_sq_ft || 0,
          overallCondition: data.data.overall_condition || 'good',
          controller: parseJsonSafely(data.data.controller_data, { 
            brand: '', 
            model: '', 
            condition: 'good',
            powerStatus: 'working',
            displayCondition: 'clear'
          }),
          zones: parseJsonSafely(data.data.zones_data, []),
          backflowDevice: parseJsonSafely(data.data.backflow_data),
          mainLine: parseJsonSafely(data.data.main_line_data, {
            material: 'pvc',
            size: 1,
            depth: 12,
            condition: 'good',
            staticPressure: 0,
            flowingPressure: 0,
            flowRate: 0,
            leaks: [],
            lowPressure: false,
            inadequateFlow: false,
            signOfCorrosion: false,
            photos: [],
            repairNeeded: false
          }),
          issuesFound: parseJsonSafely(data.data.issues_found, []),
          recommendations: parseJsonSafely(data.data.recommendations, []),
          priorityRepairs: parseJsonSafely(data.data.priority_repairs, []),
          photos: parseJsonSafely(data.data.photos, []),
          customerSignature: data.data.signature_url,
          technicianNotes: data.data.technician_notes,
          customerNotes: data.data.customer_notes,
          estimatedRepairCost: data.data.estimated_repair_cost_cents || 0,
          quoteGenerated: !!data.data.quote_generated,
          quoteId: data.data.quote_id,
          followUpRequired: !!data.data.follow_up_required,
          backflowTestRequired: !!data.data.backflow_test_required,
          permitRequired: !!data.data.permit_required,
          status: data.data.status,
          createdAt: data.data.created_at,
          updatedAt: data.data.updated_at
        };
        
        setInspection(inspectionData);
        setCompletionStatus(data.data.status === 'completed' ? 'completed' : 'editing');
        setIsEditing(data.data.status !== 'completed');
      } else {
        setCompletionStatus('error');
      }
    } catch (error) {
      console.error('Failed to load inspection:', error);
      setCompletionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectionSubmit = async (inspectionData: IrrigationInspection) => {
    setIsLoading(true);
    try {
      const url = inspectionId && inspectionId !== 'new'
        ? `http://localhost:3000/api/inspections-mobile/${inspectionId}`
        : 'http://localhost:3000/api/inspections-mobile';
      
      const method = inspectionId && inspectionId !== 'new' ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...inspectionData,
          clientId: clientId || inspectionData.clientId,
          siteId: siteId || inspectionData.siteId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setInspection(result.data);
        setCompletionStatus('completed');
        setIsEditing(false);
        
        // Update URL if this was a new inspection
        if (inspectionId === 'new') {
          router.replace(`/tech/inspection/${result.data.id}?clientId=${clientId}&siteId=${siteId}`);
        }
      } else {
        setCompletionStatus('error');
      }
    } catch (error) {
      console.error('Failed to submit inspection:', error);
      setCompletionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSave = async (partialData: Partial<IrrigationInspection>) => {
    if (!inspectionId || inspectionId === 'new') return;
    
    try {
      await fetch(`http://localhost:3000/api/inspections-mobile/${inspectionId}/autosave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(partialData)
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSignature = (signatureDataUrl: string) => {
    if (inspection) {
      setInspection({
        ...inspection,
        customerSignature: signatureDataUrl
      });
    }
  };

  const handleQuoteSave = async (quote: any) => {
    try {
      const response = await fetch('http://localhost:3000/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...quote,
          inspectionId: inspection?.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (inspection) {
          setInspection({
            ...inspection,
            quoteGenerated: true,
            quoteId: result.data.id
          });
        }
      }
    } catch (error) {
      console.error('Failed to save quote:', error);
    }
  };

  const handleQuoteSend = async (quote: any) => {
    try {
      const response = await fetch('http://localhost:3000/api/quotes/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...quote,
          inspectionId: inspection?.id
        })
      });

      if (response.ok) {
        if (inspection) {
          setInspection({
            ...inspection,
            quoteGenerated: true
          });
        }
        setShowQuoteBuilder(false);
      }
    } catch (error) {
      console.error('Failed to send quote:', error);
    }
  };

  const handlePDFGenerate = async (options: any): Promise<string> => {
    try {
      const response = await fetch('http://localhost:3000/api/inspections-mobile/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          inspectionId: inspection?.id,
          options
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.pdfUrl;
      }
      
      throw new Error('PDF generation failed');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      throw error;
    }
  };

  const handlePDFEmail = async (pdfUrl: string, emailOptions: any) => {
    try {
      await fetch('http://localhost:3000/api/inspections-mobile/email-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          inspectionId: inspection?.id,
          pdfUrl,
          emailOptions
        })
      });
    } catch (error) {
      console.error('Failed to email report:', error);
      throw error;
    }
  };

  const handleEditInspection = () => {
    setIsEditing(true);
    setCompletionStatus('editing');
  };

  // Loading state
  if (isLoading && !inspection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inspection...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (completionStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {inspectionId === 'new' ? 'Creation Error' : 'Inspection Not Found'}
            </h1>
            <p className="text-gray-600 mb-6">
              {inspectionId === 'new' 
                ? 'There was an error creating the inspection. Please try again.'
                : `Inspection #${inspectionId} could not be found or you don't have access to it.`
              }
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/tech')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Editing mode (new inspection or editing existing)
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileInspectionForm
          clientId={clientId}
          siteId={siteId}
          existingInspection={inspection || undefined}
          onSubmit={handleInspectionSubmit}
          onAutoSave={handleAutoSave}
        />
      </div>
    );
  }

  // Completed inspection view
  if (completionStatus === 'completed' && inspection) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Inspection Completed
              </h1>
              <p className="text-gray-600">
                Inspection #{inspectionId} has been successfully completed.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Property:</span>
                  <div className="font-medium">{inspection.propertyAddress}</div>
                </div>
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <div className="font-medium">
                    {new Date(inspection.completedAt || inspection.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Zones Inspected:</span>
                  <div className="font-medium">{inspection.zones?.length || 0}</div>
                </div>
                <div>
                  <span className="text-gray-500">Photos Taken:</span>
                  <div className="font-medium">{inspection.photos?.length || 0}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Overall Condition:</span>
                  <div className="font-medium capitalize">{inspection.overallCondition}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleEditInspection}
                variant="outline"
                className="w-full"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Inspection
              </Button>

              {!inspection.customerSignature && (
                <Button
                  onClick={() => setShowSignaturePad(true)}
                  variant="outline"
                  className="w-full"
                >
                  Add Customer Signature
                </Button>
              )}

              <Button
                onClick={() => setShowQuoteBuilder(true)}
                variant="outline"
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Create Repair Quote
              </Button>

              <Button
                onClick={() => setShowPDFGenerator(true)}
                variant="outline"
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>

              <Button
                onClick={() => router.push('/tech')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Modals */}
        <SignaturePad
          isOpen={showSignaturePad}
          onClose={() => setShowSignaturePad(false)}
          onSignature={handleSignature}
          title="Customer Signature"
        />

        <QuoteBuilder
          inspection={inspection}
          isOpen={showQuoteBuilder}
          onClose={() => setShowQuoteBuilder(false)}
          onSave={handleQuoteSave}
          onSend={handleQuoteSend}
        />

        <PDFReportGenerator
          inspection={inspection}
          isOpen={showPDFGenerator}
          onClose={() => setShowPDFGenerator(false)}
          onGenerate={handlePDFGenerate}
          onEmail={handlePDFEmail}
        />
      </div>
    );
  }

  return null;
}

export default function InspectionByIdPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inspection...</p>
        </div>
      </div>
    }>
      <InspectionWrapper />
    </Suspense>
  );
}