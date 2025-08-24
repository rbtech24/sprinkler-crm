const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const db = require('../database/sqlite');

class PDFReportService {
  constructor() {
    this.pageMargin = 50;
    this.contentWidth = 595 - (this.pageMargin * 2); // Letter size width minus margins
  }

  async generateInspectionReport(inspectionId) {
    try {
      // Get complete inspection data
      const inspection = await this.getInspectionData(inspectionId);
      if (!inspection) {
        throw new Error('Inspection not found');
      }

      // Get company branding
      const company = await db.get(`
        SELECT * FROM companies WHERE id = ?
      `, [inspection.company_id]);

      // Create PDF document
      const doc = new PDFDocument({
        margin: this.pageMargin,
        size: 'LETTER',
      });

      // Set up file path
      const reportsDir = path.join(__dirname, '../../uploads/reports');
      try {
        await fs.access(reportsDir);
      } catch {
        await fs.mkdir(reportsDir, { recursive: true });
      }

      const filename = `inspection_${inspectionId}_${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, filename);
      const stream = await fs.open(filePath, 'w');

      // Pipe PDF to file
      doc.pipe(require('fs').createWriteStream(filePath));

      // Generate PDF content
      await this.addHeader(doc, company, inspection);
      await this.addInspectionSummary(doc, inspection);
      await this.addInspectionData(doc, inspection);
      await this.addCallouts(doc, inspection);
      await this.addPhotos(doc, inspection);
      await this.addRecommendations(doc, inspection);
      await this.addFooter(doc, company);

      // Finalize PDF
      doc.end();

      // Wait for PDF generation to complete
      await new Promise((resolve) => {
        doc.on('end', resolve);
      });

      return {
        success: true,
        filename,
        file_path: `/uploads/reports/${filename}`,
        full_path: filePath,
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getInspectionData(inspectionId) {
    try {
      const inspection = await db.get(`
        SELECT i.*, s.address, s.lat, s.lng, s.city, s.state, s.zip,
               c.name as client_name, c.email as client_email, c.phone as client_phone,
               u.name as technician_name, u.email as technician_email,
               comp.name as company_name
        FROM inspections i
        JOIN sites s ON i.site_id = s.id
        JOIN clients c ON s.client_id = c.id
        JOIN users u ON i.technician_id = u.id
        JOIN companies comp ON i.company_id = comp.id
        WHERE i.id = ?
      `, [inspectionId]);

      if (!inspection) return null;

      // Get inspection form data
      const inspectionData = await db.query(`
        SELECT section_id, field_data FROM inspection_data
        WHERE inspection_id = ?
      `, [inspectionId]);

      // Get callouts
      const callouts = await db.query(`
        SELECT * FROM inspection_callouts
        WHERE inspection_id = ?
        ORDER BY zone_number, created_at
      `, [inspectionId]);

      // Get photos
      const photos = await db.query(`
        SELECT * FROM inspection_photos
        WHERE inspection_id = ?
        ORDER BY zone_number, created_at
      `, [inspectionId]);

      return {
        ...inspection,
        data: inspectionData.reduce((acc, item) => {
          acc[item.section_id] = JSON.parse(item.field_data);
          return acc;
        }, {}),
        callouts,
        photos,
      };
    } catch (error) {
      console.error('Get inspection data error:', error);
      throw error;
    }
  }

  async addHeader(doc, company, inspection) {
    const startY = doc.y;

    // Add company logo if available
    if (company.logo_path) {
      try {
        const logoPath = path.join(__dirname, '../../uploads/logos', company.logo_path);
        await fs.access(logoPath);
        doc.image(logoPath, this.pageMargin, startY, { width: 100 });
      } catch {
        // Logo not found, skip
      }
    }

    // Company information (right side)
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text(company.name || 'Sprinkler Inspection Report', 300, startY);

    doc.fontSize(10).font('Helvetica');
    if (company.address) doc.text(company.address, 300, startY + 25);
    if (company.city) doc.text(`${company.city}, ${company.state} ${company.zip}`, 300, startY + 38);
    if (company.phone) doc.text(`Phone: ${company.phone}`, 300, startY + 51);
    if (company.email) doc.text(`Email: ${company.email}`, 300, startY + 64);

    // Report title
    doc.fontSize(20).font('Helvetica-Bold');
    doc.text('SPRINKLER SYSTEM INSPECTION REPORT', this.pageMargin, startY + 100, {
      width: this.contentWidth,
      align: 'center',
    });

    // Inspection details box
    const boxY = startY + 140;
    doc.rect(this.pageMargin, boxY, this.contentWidth, 80).stroke();

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('INSPECTION DETAILS', this.pageMargin + 10, boxY + 10);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Client: ${inspection.client_name}`, this.pageMargin + 10, boxY + 25);
    doc.text(`Property Address: ${inspection.address}`, this.pageMargin + 10, boxY + 38);
    doc.text(`Inspection Date: ${new Date(inspection.completed_at || inspection.created_at).toLocaleDateString()}`, this.pageMargin + 10, boxY + 51);
    doc.text(`Technician: ${inspection.technician_name}`, this.pageMargin + 300, boxY + 25);
    doc.text(`Inspection ID: ${inspection.id}`, this.pageMargin + 300, boxY + 38);

    doc.y = boxY + 100;
  }

  async addInspectionSummary(doc, inspection) {
    doc.addPage();

    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('INSPECTION SUMMARY', this.pageMargin, doc.y);
    doc.y += 20;

    // Overall system condition
    const systemData = inspection.data.system_overview || {};
    if (Object.keys(systemData).length > 0) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('System Overview', this.pageMargin, doc.y);
      doc.y += 15;

      doc.fontSize(10).font('Helvetica');
      for (const [key, value] of Object.entries(systemData)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        doc.text(`${label}: ${value}`, this.pageMargin + 20, doc.y);
        doc.y += 12;
      }
      doc.y += 10;
    }

    // Zone summary
    const zoneData = inspection.data.zone_inspection || [];
    if (Array.isArray(zoneData) && zoneData.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Zone Summary', this.pageMargin, doc.y);
      doc.y += 15;

      // Table header
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Zone', this.pageMargin + 20, doc.y);
      doc.text('Type', this.pageMargin + 60, doc.y);
      doc.text('Coverage', this.pageMargin + 120, doc.y);
      doc.text('Pressure', this.pageMargin + 180, doc.y);
      doc.text('Working', this.pageMargin + 240, doc.y);
      doc.text('Broken', this.pageMargin + 290, doc.y);
      doc.text('Valve', this.pageMargin + 340, doc.y);
      doc.y += 15;

      doc.font('Helvetica');
      zoneData.forEach((zone) => {
        if (doc.y > 720) { // Near bottom of page
          doc.addPage();
          doc.y = this.pageMargin;
        }

        doc.text(zone.zone_number || 'N/A', this.pageMargin + 20, doc.y);
        doc.text(zone.zone_type || 'N/A', this.pageMargin + 60, doc.y);
        doc.text(zone.coverage_rating || 'N/A', this.pageMargin + 120, doc.y);
        doc.text(zone.pressure_rating || 'N/A', this.pageMargin + 180, doc.y);
        doc.text(zone.head_count_working || '0', this.pageMargin + 240, doc.y);
        doc.text(zone.head_count_broken || '0', this.pageMargin + 290, doc.y);
        doc.text(zone.valve_condition || 'N/A', this.pageMargin + 340, doc.y);
        doc.y += 12;
      });
    }
  }

  async addInspectionData(doc, inspection) {
    // Add detailed inspection data for each section
    for (const [sectionId, sectionData] of Object.entries(inspection.data)) {
      if (sectionId === 'zone_inspection') continue; // Already handled in summary

      if (doc.y > 650) {
        doc.addPage();
        doc.y = this.pageMargin;
      }

      const sectionTitle = sectionId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      doc.fontSize(14).font('Helvetica-Bold');
      doc.text(sectionTitle, this.pageMargin, doc.y);
      doc.y += 20;

      doc.fontSize(10).font('Helvetica');

      if (Array.isArray(sectionData)) {
        sectionData.forEach((item, index) => {
          doc.font('Helvetica-Bold').text(`Item ${index + 1}:`, this.pageMargin + 20, doc.y);
          doc.y += 12;

          for (const [key, value] of Object.entries(item)) {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            doc.font('Helvetica').text(`${label}: ${value}`, this.pageMargin + 40, doc.y);
            doc.y += 12;
          }
          doc.y += 5;
        });
      } else if (typeof sectionData === 'object') {
        for (const [key, value] of Object.entries(sectionData)) {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          doc.text(`${label}: ${value}`, this.pageMargin + 20, doc.y);
          doc.y += 12;
        }
      }

      doc.y += 15;
    }
  }

  async addCallouts(doc, inspection) {
    if (!inspection.callouts || inspection.callouts.length === 0) return;

    if (doc.y > 650) {
      doc.addPage();
      doc.y = this.pageMargin;
    }

    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('ISSUES IDENTIFIED', this.pageMargin, doc.y);
    doc.y += 25;

    inspection.callouts.forEach((callout, index) => {
      if (doc.y > 700) {
        doc.addPage();
        doc.y = this.pageMargin;
      }

      // Callout header
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`${index + 1}. ${callout.callout_type.replace(/_/g, ' ').toUpperCase()}`, this.pageMargin, doc.y);
      doc.y += 15;

      doc.fontSize(10).font('Helvetica');
      if (callout.zone_number) {
        doc.text(`Zone: ${callout.zone_number}`, this.pageMargin + 20, doc.y);
        doc.y += 12;
      }

      doc.text(`Severity: ${callout.severity || 'Medium'}`, this.pageMargin + 20, doc.y);
      doc.y += 12;

      if (callout.description) {
        doc.text('Description:', this.pageMargin + 20, doc.y);
        doc.y += 12;
        doc.text(callout.description, this.pageMargin + 40, doc.y, { width: this.contentWidth - 60 });
        doc.y += 20;
      }

      // GPS coordinates if available
      if (callout.lat && callout.lng) {
        doc.text(`Location: ${callout.lat}, ${callout.lng}`, this.pageMargin + 20, doc.y);
        doc.y += 12;
      }

      doc.y += 10;
    });
  }

  async addPhotos(doc, inspection) {
    if (!inspection.photos || inspection.photos.length === 0) return;

    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('INSPECTION PHOTOS', this.pageMargin, doc.y);
    doc.y += 25;

    const photosPerRow = 2;
    const photoWidth = (this.contentWidth - 20) / photosPerRow;
    const photoHeight = photoWidth * 0.75; // 4:3 aspect ratio

    let currentRow = 0;
    let currentCol = 0;

    for (const photo of inspection.photos) {
      try {
        const photoPath = path.join(__dirname, '../../uploads/inspections', photo.filename);
        await fs.access(photoPath);

        const x = this.pageMargin + (currentCol * (photoWidth + 10));
        const { y } = doc;

        // Check if we need a new page
        if (y + photoHeight + 80 > 720) {
          doc.addPage();
          doc.y = this.pageMargin;
          currentRow = 0;
          currentCol = 0;
        }

        // Add photo
        doc.image(photoPath, x, y, { width: photoWidth, height: photoHeight });

        // Add caption
        doc.fontSize(8).font('Helvetica');
        let caption = '';
        if (photo.zone_number) caption += `Zone ${photo.zone_number}`;
        if (photo.caption) caption += (caption ? ' - ' : '') + photo.caption;
        if (caption) {
          doc.text(caption, x, y + photoHeight + 5, { width: photoWidth, align: 'center' });
        }

        currentCol++;
        if (currentCol >= photosPerRow) {
          currentCol = 0;
          currentRow++;
          doc.y += photoHeight + 30;
        }
      } catch (error) {
        // Photo file not found, skip
        console.warn(`Photo not found: ${photo.filename}`);
      }
    }

    // Adjust Y position if we ended mid-row
    if (currentCol > 0) {
      doc.y += photoHeight + 30;
    }
  }

  async addRecommendations(doc, inspection) {
    if (!inspection.summary_notes && !inspection.recommendations) return;

    if (doc.y > 600) {
      doc.addPage();
      doc.y = this.pageMargin;
    }

    doc.fontSize(16).font('Helvetica-Bold');
    doc.text('RECOMMENDATIONS', this.pageMargin, doc.y);
    doc.y += 25;

    if (inspection.summary_notes) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Summary Notes:', this.pageMargin, doc.y);
      doc.y += 15;

      doc.fontSize(10).font('Helvetica');
      doc.text(inspection.summary_notes, this.pageMargin + 20, doc.y, { width: this.contentWidth - 40 });
      doc.y += 30;
    }

    if (inspection.recommendations) {
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Technician Recommendations:', this.pageMargin, doc.y);
      doc.y += 15;

      doc.fontSize(10).font('Helvetica');
      doc.text(inspection.recommendations, this.pageMargin + 20, doc.y, { width: this.contentWidth - 40 });
      doc.y += 20;
    }

    // Add repair recommendations from form data if available
    const repairData = inspection.data.repair_recommendations;
    if (repairData) {
      if (repairData.immediate_repairs) {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Immediate Repairs Needed:', this.pageMargin, doc.y);
        doc.y += 15;
        doc.fontSize(10).font('Helvetica');
        doc.text(repairData.immediate_repairs, this.pageMargin + 20, doc.y, { width: this.contentWidth - 40 });
        doc.y += 20;
      }

      if (repairData.seasonal_maintenance) {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Seasonal Maintenance:', this.pageMargin, doc.y);
        doc.y += 15;
        doc.fontSize(10).font('Helvetica');
        doc.text(repairData.seasonal_maintenance, this.pageMargin + 20, doc.y, { width: this.contentWidth - 40 });
        doc.y += 20;
      }

      if (repairData.estimated_repair_cost) {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Estimated Repair Cost: $${repairData.estimated_repair_cost}`, this.pageMargin, doc.y);
        doc.y += 20;
      }
    }
  }

  async addFooter(doc, company) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Footer line
      doc.moveTo(this.pageMargin, 750)
        .lineTo(this.pageMargin + this.contentWidth, 750)
        .stroke();

      // Footer text
      doc.fontSize(8).font('Helvetica');
      doc.text(
        `Generated by ${company.name || 'Sprinkler Inspection System'} on ${new Date().toLocaleDateString()}`,
        this.pageMargin,
        755,
        { align: 'left' },
      );

      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        this.pageMargin,
        755,
        { align: 'right' },
      );
    }
  }
}

module.exports = new PDFReportService();
