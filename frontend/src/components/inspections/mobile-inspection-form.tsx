"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Camera, 
  Save, 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Wifi, 
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  PenTool
} from 'lucide-react';
import { Button, Input, Textarea, Select, Card, CardContent, Badge } from '@/components/ui';
import { SignaturePad } from '@/components/inspections/signature-pad';
import { IrrigationInspection, ZoneInspection, PhotoCapture, InspectionFormState } from '@/types/irrigation-inspection';

// Enhanced form validation schema
const inspectionSchema = z.object({
  propertyAddress: z.string().min(1, 'Property address is required'),
  propertyType: z.enum(['residential', 'commercial', 'municipal', 'athletic']),
  propertySize: z.number().min(1),
  weatherConditions: z.string().optional(),
  temperature: z.number().optional(),
  overallCondition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
  controller: z.object({
    brand: z.string().min(1, 'Controller brand is required'),
    model: z.string().min(1, 'Controller model is required'),
    condition: z.enum(['excellent', 'good', 'fair', 'poor', 'failed']),
    powerStatus: z.enum(['working', 'intermittent', 'failed']),
    displayCondition: z.enum(['clear', 'dim', 'cracked', 'blank']),
    notes: z.string().optional()
  }),
  zones: z.array(z.object({
    zoneNumber: z.number().min(1),
    zoneName: z.string().optional(),
    zoneType: z.enum(['grass', 'shrubs', 'trees', 'flower_beds', 'vegetables', 'mixed']),
    coverageRating: z.enum(['excellent', 'good', 'fair', 'poor']),
    sprinklerType: z.enum(['spray', 'rotary', 'drip', 'bubbler', 'micro_spray']),
    totalHeads: z.number().min(0),
    workingHeads: z.number().min(0),
    notes: z.string().optional()
  })).min(1, 'At least one zone is required'),
  technicianNotes: z.string().optional(),
  customerNotes: z.string().optional()
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

interface MobileInspectionFormProps {
  clientId: string;
  siteId?: string;
  existingInspection?: Partial<IrrigationInspection>;
  onSubmit: (data: IrrigationInspection) => Promise<void>;
  onAutoSave?: (data: Partial<IrrigationInspection>) => Promise<void>;
}

const FORM_STEPS = [
  { id: 'property', title: 'Property Info', icon: '🏠' },
  { id: 'controller', title: 'Controller', icon: '🎛️' },
  { id: 'zones', title: 'Zone Inspection', icon: '💧' },
  { id: 'backflow', title: 'Backflow Device', icon: '🔄' },
  { id: 'mainline', title: 'Main Line', icon: '🚰' },
  { id: 'final', title: 'Final Review', icon: '✅' }
];

export function MobileInspectionForm({
  clientId,
  siteId,
  existingInspection,
  onSubmit,
  onAutoSave
}: MobileInspectionFormProps) {
  // Form state management
  const [currentStep, setCurrentStep] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoCapture[]>([]);
  const [geolocation, setGeolocation] = useState<GeolocationPosition | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // React Hook Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors, isDirty }
  } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      propertyType: 'residential',
      overallCondition: 'good',
      controller: {
        brand: '',
        model: '',
        condition: 'good',
        powerStatus: 'working',
        displayCondition: 'clear'
      },
      zones: [{
        zoneNumber: 1,
        zoneType: 'grass',
        coverageRating: 'good',
        sprinklerType: 'spray',
        totalHeads: 0,
        workingHeads: 0
      }]
    }
  });

  const { fields: zoneFields, append: appendZone, remove: removeZone } = useFieldArray({
    control,
    name: 'zones'
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setGeolocation(position),
        (error) => console.warn('Geolocation error:', error)
      );
    }
  }, []);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!onAutoSave || !isDirty) return;
    
    setIsAutoSaving(true);
    try {
      const currentData = getValues();
      await onAutoSave({
        ...currentData,
        clientId,
        siteId,
        photos: capturedPhotos.map(p => ({
          id: crypto.randomUUID(),
          url: p.preview,
          type: 'issue' as const,
          component: p.component,
          description: p.description,
          timestamp: new Date().toISOString(),
          gpsCoordinates: p.gpsCoordinates
        }))
      } as Partial<IrrigationInspection>);
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [onAutoSave, isDirty, getValues, clientId, siteId, capturedPhotos]);

  // Debounced auto-save
  useEffect(() => {
    if (isDirty) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(performAutoSave, 3000);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isDirty, performAutoSave]);

  // Photo capture
  const capturePhoto = useCallback((component: string, description: string = '') => {
    if (cameraInputRef.current) {
      cameraInputRef.current.dataset.component = component;
      cameraInputRef.current.dataset.description = description;
      cameraInputRef.current.click();
    }
  }, []);

  const handlePhotoCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const component = event.target.dataset.component || 'general';
    const description = event.target.dataset.description || '';
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      const newPhoto: PhotoCapture = {
        file,
        preview,
        component,
        description,
        gpsCoordinates: geolocation ? {
          latitude: geolocation.coords.latitude,
          longitude: geolocation.coords.longitude
        } : undefined
      };
      
      setCapturedPhotos(prev => [...prev, newPhoto]);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
  }, [geolocation]);

  // Navigation functions
  const nextStep = async () => {
    const isStepValid = await trigger();
    if (isStepValid && currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addZone = () => {
    const nextZoneNumber = Math.max(...zoneFields.map(z => z.zoneNumber), 0) + 1;
    appendZone({
      zoneNumber: nextZoneNumber,
      zoneType: 'grass',
      coverageRating: 'good',
      sprinklerType: 'spray',
      totalHeads: 0,
      workingHeads: 0
    });
  };

  // Form submission
  const onFormSubmit = async (data: InspectionFormData) => {
    const inspectionData: IrrigationInspection = {
      clientId,
      siteId,
      technicianId: '', // Will be set by backend
      inspectionType: 'routine',
      scheduledDate: new Date().toISOString(),
      status: 'completed',
      ...data,
      zones: data.zones.map(zone => ({
        ...zone,
        id: crypto.randomUUID(),
        coverageArea: 0,
        pressureRating: 'good',
        uniformityRating: 'good',
        sprinklerBrand: '',
        brokenHeads: 0,
        missingHeads: 0,
        cloggedHeads: 0,
        misalignedHeads: 0,
        pipeMaterial: 'pvc',
        pipeSize: 1,
        valveBrand: '',
        valveCondition: 'good',
        flowRate: 0,
        operatingPressure: 0,
        runtime: 0,
        precipitationRate: 0,
        issues: [],
        recommendedRepairs: [],
        photos: []
      })) as ZoneInspection[],
      mainLine: {
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
      },
      issuesFound: [],
      recommendations: [],
      priorityRepairs: [],
      photos: capturedPhotos.map(p => ({
        id: crypto.randomUUID(),
        url: p.preview,
        type: 'issue' as const,
        component: p.component,
        description: p.description,
        timestamp: new Date().toISOString(),
        gpsCoordinates: p.gpsCoordinates
      })),
      customerSignature,
      estimatedRepairCost: 0,
      quoteGenerated: false,
      followUpRequired: false,
      backflowTestRequired: false,
      permitRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await onSubmit(inspectionData);
  };

  // Step content rendering
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Property Info
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Address *
              </label>
              <Input
                {...register('propertyAddress')}
                placeholder="Enter full property address"
                error={errors.propertyAddress?.message}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type *
                </label>
                <Select {...register('propertyType')}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="municipal">Municipal</option>
                  <option value="athletic">Athletic</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Size (sq ft) *
                </label>
                <Input
                  type="number"
                  {...register('propertySize', { valueAsNumber: true })}
                  placeholder="e.g., 5000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weather Conditions
                </label>
                <Select {...register('weatherConditions')}>
                  <option value="">Select conditions</option>
                  <option value="sunny">Sunny</option>
                  <option value="cloudy">Cloudy</option>
                  <option value="overcast">Overcast</option>
                  <option value="light_rain">Light Rain</option>
                  <option value="windy">Windy</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°F)
                </label>
                <Input
                  type="number"
                  {...register('temperature', { valueAsNumber: true })}
                  placeholder="e.g., 75"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => capturePhoto('property', 'Property overview')}
              className="w-full flex items-center justify-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Property Photo
            </Button>
          </div>
        );

      case 1: // Controller
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Controller Brand *
                </label>
                <Input
                  {...register('controller.brand')}
                  placeholder="e.g., Rain Bird"
                  error={errors.controller?.brand?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Controller Model *
                </label>
                <Input
                  {...register('controller.model')}
                  placeholder="e.g., ESP-4M"
                  error={errors.controller?.model?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Condition *
                </label>
                <Select {...register('controller.condition')}>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="failed">Failed</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Power Status *
                </label>
                <Select {...register('controller.powerStatus')}>
                  <option value="working">Working</option>
                  <option value="intermittent">Intermittent</option>
                  <option value="failed">Failed</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Condition *
              </label>
              <Select {...register('controller.displayCondition')}>
                <option value="clear">Clear</option>
                <option value="dim">Dim</option>
                <option value="cracked">Cracked</option>
                <option value="blank">Blank</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Controller Notes
              </label>
              <Textarea
                {...register('controller.notes')}
                placeholder="Any additional notes about the controller..."
                rows={3}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => capturePhoto('controller', 'Controller inspection')}
              className="w-full flex items-center justify-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Controller Photo
            </Button>
          </div>
        );

      case 2: // Zones
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Zone Inspections</h3>
              <Button
                type="button"
                variant="outline"
                onClick={addZone}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Zone
              </Button>
            </div>

            {zoneFields.map((field, index) => (
              <Card key={field.id} className="border-l-4 border-l-blue-500">
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Zone {field.zoneNumber}</h4>
                    {zoneFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeZone(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zone Name
                      </label>
                      <Input
                        {...register(`zones.${index}.zoneName`)}
                        placeholder="e.g., Front lawn"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zone Type *
                      </label>
                      <Select {...register(`zones.${index}.zoneType`)}>
                        <option value="grass">Grass</option>
                        <option value="shrubs">Shrubs</option>
                        <option value="trees">Trees</option>
                        <option value="flower_beds">Flower Beds</option>
                        <option value="vegetables">Vegetables</option>
                        <option value="mixed">Mixed</option>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sprinkler Type *
                      </label>
                      <Select {...register(`zones.${index}.sprinklerType`)}>
                        <option value="spray">Spray</option>
                        <option value="rotary">Rotary</option>
                        <option value="drip">Drip</option>
                        <option value="bubbler">Bubbler</option>
                        <option value="micro_spray">Micro Spray</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coverage Rating *
                      </label>
                      <Select {...register(`zones.${index}.coverageRating`)}>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Heads *
                      </label>
                      <Input
                        type="number"
                        {...register(`zones.${index}.totalHeads`, { valueAsNumber: true })}
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Working Heads *
                      </label>
                      <Input
                        type="number"
                        {...register(`zones.${index}.workingHeads`, { valueAsNumber: true })}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zone Notes
                    </label>
                    <Textarea
                      {...register(`zones.${index}.notes`)}
                      placeholder="Any issues or observations..."
                      rows={2}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => capturePhoto(`zone_${field.zoneNumber}`, `Zone ${field.zoneNumber} inspection`)}
                    size="sm"
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Zone Photo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 5: // Final Review
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overall System Condition *
              </label>
              <Select {...register('overallCondition')}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="critical">Critical</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Technician Notes
              </label>
              <Textarea
                {...register('technicianNotes')}
                placeholder="Summary of findings and recommendations..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Notes
              </label>
              <Textarea
                {...register('customerNotes')}
                placeholder="Customer concerns or requests..."
                rows={3}
              />
            </div>

            {capturedPhotos.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  Captured Photos ({capturedPhotos.length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {capturedPhotos.slice(0, 4).map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo.preview}
                        alt={photo.description}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1 left-1 text-xs"
                      >
                        {photo.component}
                      </Badge>
                    </div>
                  ))}
                </div>
                {capturedPhotos.length > 4 && (
                  <p className="text-sm text-gray-500 mt-2">
                    +{capturedPhotos.length - 4} more photos
                  </p>
                )}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSignaturePad(true)}
              className="w-full"
            >
              <PenTool className="h-4 w-4 mr-2" />
              {customerSignature ? 'Update Customer Signature' : 'Add Customer Signature'}
            </Button>
            
            {customerSignature && (
              <div className="mt-2">
                <p className="text-sm text-green-600 mb-2">✓ Customer signature captured</p>
                <img 
                  src={customerSignature} 
                  alt="Customer signature" 
                  className="border rounded h-20 w-full object-contain bg-white"
                />
              </div>
            )}
          </div>
        );

      default:
        return <div>Step not implemented</div>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b pb-4 mb-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">
            Irrigation Inspection
          </h1>
          <div className="flex items-center space-x-2">
            {geolocation && (
              <div className="flex items-center text-xs text-green-600">
                <MapPin className="h-3 w-3 mr-1" />
                GPS
              </div>
            )}
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            {isAutoSaving && (
              <div className="flex items-center text-xs text-blue-600">
                <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
                Saving...
              </div>
            )}
            {lastSavedAt && (
              <div className="text-xs text-gray-500">
                Saved {lastSavedAt.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-2">
          {FORM_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                index <= currentStep ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                {index < currentStep ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
              </div>
              {index < FORM_STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${index < currentStep ? 'bg-blue-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="text-sm text-gray-600 text-center">
          Step {currentStep + 1} of {FORM_STEPS.length}: {FORM_STEPS[currentStep].title}
        </div>
      </div>

      {/* Form content */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {renderStepContent()}
      </form>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-2xl mx-auto flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep === FORM_STEPS.length - 1 ? (
            <Button
              type="submit"
              onClick={handleSubmit(onFormSubmit)}
              className="flex items-center"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Inspection
            </Button>
          ) : (
            <Button
              type="button"
              onClick={nextStep}
              className="flex items-center"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Hidden camera input */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handlePhotoCapture}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
      />

      {/* Signature Pad Modal */}
      <SignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSignature={(signature) => {
          setCustomerSignature(signature);
          setShowSignaturePad(false);
        }}
        title="Customer Signature"
      />
    </div>
  );
}