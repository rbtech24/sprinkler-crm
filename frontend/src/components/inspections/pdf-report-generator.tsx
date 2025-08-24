"use client";

import React, { useState } from 'react';
import { FileText, Download, Mail, Printer, Share2, Image } from 'lucide-react';
import { Button, Modal, Select, Textarea } from '@/components/ui';
import { IrrigationInspection } from '@/types/irrigation-inspection';

interface PDFReportGeneratorProps {
  inspection: IrrigationInspection;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: PDFGenerationOptions) => Promise<string>; // Returns PDF URL
  onEmail?: (pdfUrl: string, emailOptions: EmailOptions) => Promise<void>;
}

interface PDFGenerationOptions {
  includePhotos: boolean;
  includeSignature: boolean;
  includeQuote: boolean;
  includeRecommendations: boolean;
  format: 'standard' | 'detailed' | 'summary';
  branding: boolean;
  watermark: boolean;
  templateId?: string;
}

interface EmailOptions {
  to: string;
  cc?: string;
  subject: string;
  message: string;
}

const PDF_TEMPLATES = [
  { id: 'standard', name: 'Standard Report', description: 'Complete inspection report with all details' },
  { id: 'summary', name: 'Summary Report', description: 'High-level overview with key findings' },
  { id: 'detailed', name: 'Detailed Technical Report', description: 'Comprehensive technical analysis' },
  { id: 'customer_friendly', name: 'Customer-Friendly Report', description: 'Simplified report for homeowners' }
];

export function PDFReportGenerator({
  inspection,
  isOpen,
  onClose,
  onGenerate,
  onEmail
}: PDFReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  
  const [pdfOptions, setPdfOptions] = useState<PDFGenerationOptions>({
    includePhotos: true,
    includeSignature: true,
    includeQuote: false,
    includeRecommendations: true,
    format: 'standard',
    branding: true,
    watermark: false
  });

  const [emailOptions, setEmailOptions] = useState<EmailOptions>({
    to: '',
    cc: '',
    subject: `Irrigation Inspection Report - ${inspection.propertyAddress}`,
    message: `Dear Customer,\n\nPlease find attached your irrigation system inspection report.\n\nThe inspection was completed on ${new Date(inspection.scheduledDate).toLocaleDateString()}.\n\nIf you have any questions about the findings or recommendations, please don't hesitate to contact us.\n\nBest regards,\nYour Irrigation Team`
  });

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdfUrl = await onGenerate({
        ...pdfOptions,
        templateId: selectedTemplate
      });
      setGeneratedPdfUrl(pdfUrl);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (generatedPdfUrl) {
      const link = document.createElement('a');
      link.href = generatedPdfUrl;
      link.download = `Inspection_Report_${inspection.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const printPDF = () => {
    if (generatedPdfUrl) {
      window.open(generatedPdfUrl, '_blank');
    }
  };

  const handleEmailSend = async () => {
    if (generatedPdfUrl && onEmail) {
      try {
        await onEmail(generatedPdfUrl, emailOptions);
        setShowEmailModal(false);
        onClose();
      } catch (error) {
        console.error('Email sending failed:', error);
      }
    }
  };

  const getReportPreview = () => {
    const sections = [];
    
    sections.push('• Property Information');
    sections.push('• System Overview');
    sections.push('• Controller Inspection');
    sections.push(`• Zone Analysis (${inspection.zones?.length || 0} zones)`);
    
    if (inspection.backflowDevice) {
      sections.push('• Backflow Device Assessment');
    }
    
    sections.push('• Main Line Evaluation');
    
    if (inspection.rainSensor) {
      sections.push('• Rain Sensor Check');
    }
    
    if (pdfOptions.includeRecommendations) {
      sections.push('• Recommendations & Next Steps');
    }
    
    if (pdfOptions.includePhotos && inspection.photos?.length > 0) {
      sections.push(`• Photo Documentation (${inspection.photos.length} photos)`);
    }
    
    if (pdfOptions.includeSignature && inspection.customerSignature) {
      sections.push('• Customer Signature');
    }
    
    return sections;
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <div className="p-6 space-y-6">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Generate Inspection Report
            </h2>
            <p className="text-sm text-gray-600">
              Create a professional PDF report for {inspection.propertyAddress}
            </p>
          </div>

          {!generatedPdfUrl ? (
            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Template
                </label>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  {PDF_TEMPLATES.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {PDF_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                </p>
              </div>

              {/* Content Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Include in Report
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includePhotos}
                      onChange={(e) => setPdfOptions(prev => ({
                        ...prev,
                        includePhotos: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Photos ({inspection.photos?.length || 0} available)
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includeSignature}
                      onChange={(e) => setPdfOptions(prev => ({
                        ...prev,
                        includeSignature: e.target.checked
                      }))}
                      disabled={!inspection.customerSignature}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Customer Signature
                      {!inspection.customerSignature && (
                        <span className="text-gray-400"> (not available)</span>
                      )}
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includeRecommendations}
                      onChange={(e) => setPdfOptions(prev => ({
                        ...prev,
                        includeRecommendations: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Recommendations & Priority Repairs
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={pdfOptions.includeQuote}
                      onChange={(e) => setPdfOptions(prev => ({
                        ...prev,
                        includeQuote: e.target.checked
                      }))}
                      disabled={!inspection.quoteGenerated}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Repair Quote
                      {!inspection.quoteGenerated && (
                        <span className="text-gray-400"> (not generated)</span>
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {/* Formatting Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Formatting Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={pdfOptions.branding}
                      onChange={(e) => setPdfOptions(prev => ({
                        ...prev,
                        branding: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Include company branding
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={pdfOptions.watermark}
                      onChange={(e) => setPdfOptions(prev => ({
                        ...prev,
                        watermark: e.target.checked
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Add watermark
                    </span>
                  </label>
                </div>
              </div>

              {/* Report Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Contents Preview
                </label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-700 space-y-1">
                    {getReportPreview().map((section, index) => (
                      <div key={index}>{section}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                
                <Button
                  type="button"
                  onClick={generatePDF}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-800 font-medium mb-2">
                  ✓ Report Generated Successfully
                </div>
                <div className="text-sm text-green-700">
                  Your inspection report is ready for download or sharing.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadPDF}
                  className="flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={printPDF}
                  className="flex items-center justify-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>

                {onEmail && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEmailModal(true)}
                    className="flex items-center justify-center col-span-2"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email to Customer
                  </Button>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGeneratedPdfUrl(null)}
                >
                  Generate Another
                </Button>
                
                <Button
                  type="button"
                  onClick={onClose}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Email Modal */}
      {showEmailModal && (
        <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} size="md">
          <div className="p-6 space-y-4">
            <div className="text-center mb-4">
              <Mail className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Email Report
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Email Address *
              </label>
              <input
                type="email"
                value={emailOptions.to}
                onChange={(e) => setEmailOptions(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="customer@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CC Email Address
              </label>
              <input
                type="email"
                value={emailOptions.cc}
                onChange={(e) => setEmailOptions(prev => ({ ...prev, cc: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="manager@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={emailOptions.subject}
                onChange={(e) => setEmailOptions(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <Textarea
                value={emailOptions.message}
                onChange={(e) => setEmailOptions(prev => ({ ...prev, message: e.target.value }))}
                rows={6}
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmailModal(false)}
              >
                Cancel
              </Button>
              
              <Button
                type="button"
                onClick={handleEmailSend}
                disabled={!emailOptions.to || !emailOptions.subject || !emailOptions.message}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}