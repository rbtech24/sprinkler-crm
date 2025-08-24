// Enhanced TypeScript interfaces for comprehensive irrigation inspection system
// Based on mobile-optimized specification for irrigation technicians

export interface IrrigationController {
  id?: string;
  brand: string;
  model: string;
  serialNumber?: string;
  installDate?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  powerStatus: 'working' | 'intermittent' | 'failed';
  displayCondition: 'clear' | 'dim' | 'cracked' | 'blank';
  programming: {
    currentProgram: string;
    zonesConfigured: number;
    scheduleActive: boolean;
    rainDelayActive: boolean;
  };
  issues: string[];
  photos: string[];
  notes?: string;
  repairNeeded: boolean;
  estimatedRepairCost?: number;
}

export interface ZoneInspection {
  id?: string;
  zoneNumber: number;
  zoneName?: string;
  zoneType: 'grass' | 'shrubs' | 'trees' | 'flower_beds' | 'vegetables' | 'mixed';
  
  // Coverage and Performance
  coverageArea: number; // sq ft
  coverageRating: 'excellent' | 'good' | 'fair' | 'poor';
  pressureRating: 'excellent' | 'good' | 'fair' | 'poor';
  uniformityRating: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Sprinkler Heads
  sprinklerType: 'spray' | 'rotary' | 'drip' | 'bubbler' | 'micro_spray';
  sprinklerBrand: string;
  totalHeads: number;
  workingHeads: number;
  brokenHeads: number;
  missingHeads: number;
  cloggedHeads: number;
  misalignedHeads: number;
  
  // Pipes and Valves
  pipeMaterial: 'pvc' | 'poly' | 'copper' | 'galvanized';
  pipeSize: number; // inches
  valveBrand: string;
  valveCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  
  // Performance Metrics
  flowRate: number; // gpm
  operatingPressure: number; // psi
  runtime: number; // minutes
  precipitationRate: number; // in/hr
  
  // Issues and Repairs
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
  }>;
  recommendedRepairs: Array<{
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedCost: number;
  }>;
  
  photos: string[];
  notes?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface BackflowDevice {
  id?: string;
  type: 'rpz' | 'dcv' | 'pvb' | 'spill_resistant_vacuum_breaker';
  brand: string;
  model: string;
  serialNumber?: string;
  size: string; // e.g., "3/4", "1", "1.5"
  installDate?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  
  // Test Information
  lastTestDate?: string;
  testDueDate?: string;
  testerCertNumber?: string;
  testPassed: boolean;
  
  // Physical Condition
  leaks: boolean;
  corrosion: boolean;
  properInstallation: boolean;
  accessibleForTesting: boolean;
  
  issues: string[];
  photos: string[];
  notes?: string;
  repairNeeded: boolean;
  estimatedRepairCost?: number;
}

export interface MainLine {
  id?: string;
  material: 'pvc' | 'poly' | 'copper' | 'galvanized' | 'pex';
  size: number; // inches
  depth: number; // inches
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Performance
  staticPressure: number; // psi
  flowingPressure: number; // psi
  flowRate: number; // gpm
  
  // Issues
  leaks: Array<{
    location: string;
    severity: 'minor' | 'moderate' | 'major';
    description: string;
  }>;
  
  // Condition Assessment
  lowPressure: boolean;
  inadequateFlow: boolean;
  signOfCorrosion: boolean;
  
  photos: string[];
  notes?: string;
  repairNeeded: boolean;
  estimatedRepairCost?: number;
}

export interface EmergencyShutoff {
  id?: string;
  location: string;
  type: 'gate_valve' | 'ball_valve' | 'angle_stop';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  accessible: boolean;
  operational: boolean;
  
  // Physical Condition
  leaking: boolean;
  corroded: boolean;
  hardToOperate: boolean;
  properlyMarked: boolean;
  
  photos: string[];
  notes?: string;
  repairNeeded: boolean;
  estimatedRepairCost?: number;
}

export interface RainSensor {
  id?: string;
  type: 'wired' | 'wireless' | 'soil_moisture';
  brand: string;
  model: string;
  location: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  
  // Functionality
  responding: boolean;
  calibrated: boolean;
  bypassActive: boolean;
  
  // Physical Condition
  mountingSecure: boolean;
  wiringIntact: boolean;
  cleanAndClear: boolean;
  
  photos: string[];
  notes?: string;
  repairNeeded: boolean;
  estimatedRepairCost?: number;
}

export interface IrrigationInspection {
  id?: string;
  
  // Basic Information
  clientId: string;
  siteId?: string;
  technicianId: string;
  inspectionType: 'routine' | 'seasonal_startup' | 'seasonal_shutdown' | 'repair_assessment' | 'compliance';
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  
  // Property Information
  propertyAddress: string;
  propertyType: 'residential' | 'commercial' | 'municipal' | 'athletic';
  propertySize: number; // sq ft
  lotSize: number; // acres
  
  // Weather Conditions
  weatherConditions?: string;
  temperature?: number; // fahrenheit
  
  // System Overview
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  systemAge?: number; // years
  lastServiceDate?: string;
  
  // Detailed Component Inspections
  controller: IrrigationController;
  zones: ZoneInspection[];
  backflowDevice?: BackflowDevice;
  mainLine: MainLine;
  emergencyShutoff?: EmergencyShutoff;
  rainSensor?: RainSensor;
  
  // Overall Assessment
  issuesFound: Array<{
    component: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  
  recommendations: Array<{
    type: 'repair' | 'replacement' | 'upgrade' | 'maintenance';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    estimatedCost: number;
  }>;
  
  priorityRepairs: Array<{
    description: string;
    urgency: 'immediate' | 'within_week' | 'within_month' | 'seasonal';
    estimatedCost: number;
    safetyIssue: boolean;
  }>;
  
  // Photos and Documentation
  photos: Array<{
    id: string;
    url: string;
    type: 'overview' | 'issue' | 'before' | 'after' | 'controller' | 'backflow' | 'zone';
    component?: string;
    description?: string;
    timestamp: string;
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
    };
  }>;
  
  // Customer Interaction
  customerSignature?: string;
  customerNotes?: string;
  technicianNotes?: string;
  
  // Estimates and Follow-up
  estimatedRepairCost: number;
  quoteGenerated: boolean;
  quoteId?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  
  // Compliance
  backflowTestRequired: boolean;
  backflowTestDueDate?: string;
  permitRequired: boolean;
  permitNumber?: string;
  
  // Status
  status: 'in_progress' | 'completed' | 'needs_followup' | 'quote_pending';
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Form state for mobile inspection
export interface InspectionFormState {
  currentStep: number;
  totalSteps: number;
  isAutoSaving: boolean;
  lastSavedAt?: string;
  hasUnsavedChanges: boolean;
  offlineMode: boolean;
}

// Photo capture interface
export interface PhotoCapture {
  file: File;
  preview: string;
  component: string;
  description: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Auto-save configuration
export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number;
  onFieldChange: boolean;
  onPhotoCapture: boolean;
}