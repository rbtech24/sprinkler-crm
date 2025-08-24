const db = require('../database/sqlite');
const fs = require('fs').promises;
const path = require('path');

class InspectionService {
  constructor() {
    this.defaultTemplates = {
      'repair-focused': {
        name: 'Repair-Focused Inspection',
        description: 'Comprehensive inspection focused on identifying repair needs',
        sections: [
          {
            id: 'system_overview',
            name: 'System Overview',
            fields: [
              {
                id: 'controller_condition', type: 'select', label: 'Controller Condition', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement'], required: true,
              },
              {
                id: 'backflow_status', type: 'select', label: 'Backflow Prevention Status', options: ['Functional', 'Needs Testing', 'Needs Repair', 'Needs Replacement'], required: true,
              },
              {
                id: 'water_pressure', type: 'number', label: 'Water Pressure (PSI)', min: 0, max: 200,
              },
              {
                id: 'system_age', type: 'select', label: 'Estimated System Age', options: ['0-5 years', '6-10 years', '11-15 years', '16-20 years', '20+ years'],
              },
            ],
          },
          {
            id: 'zone_inspection',
            name: 'Zone-by-Zone Inspection',
            repeatable: true,
            fields: [
              {
                id: 'zone_number', type: 'number', label: 'Zone Number', required: true,
              },
              {
                id: 'zone_type', type: 'select', label: 'Zone Type', options: ['Spray Heads', 'Rotors', 'Drip', 'Bubblers'], required: true,
              },
              {
                id: 'coverage_rating', type: 'select', label: 'Coverage Rating', options: ['Excellent', 'Good', 'Fair', 'Poor'], required: true,
              },
              {
                id: 'pressure_rating', type: 'select', label: 'Pressure Rating', options: ['Excellent', 'Good', 'Fair', 'Poor'], required: true,
              },
              {
                id: 'head_count_working', type: 'number', label: 'Working Heads', min: 0,
              },
              {
                id: 'head_count_broken', type: 'number', label: 'Broken/Missing Heads', min: 0,
              },
              {
                id: 'valve_condition', type: 'select', label: 'Valve Condition', options: ['Good', 'Needs Adjustment', 'Needs Repair', 'Needs Replacement'],
              },
            ],
          },
          {
            id: 'repair_recommendations',
            name: 'Repair Recommendations',
            fields: [
              {
                id: 'immediate_repairs', type: 'textarea', label: 'Immediate Repairs Needed', rows: 4,
              },
              {
                id: 'seasonal_maintenance', type: 'textarea', label: 'Seasonal Maintenance Recommendations', rows: 4,
              },
              {
                id: 'system_upgrades', type: 'textarea', label: 'Recommended System Upgrades', rows: 4,
              },
              {
                id: 'estimated_repair_cost', type: 'number', label: 'Estimated Repair Cost ($)', min: 0,
              },
            ],
          },
        ],
        callouts: [
          {
            id: 'broken_head', name: 'Broken Head', icon: '🚿', color: '#ff4444',
          },
          {
            id: 'leak', name: 'Leak Detected', icon: '💧', color: '#4444ff',
          },
          {
            id: 'low_pressure', name: 'Low Pressure', icon: '⬇️', color: '#ff8800',
          },
          {
            id: 'poor_coverage', name: 'Poor Coverage', icon: '📍', color: '#ffaa00',
          },
          {
            id: 'valve_issue', name: 'Valve Issue', icon: '⚙️', color: '#8800ff',
          },
          {
            id: 'controller_problem', name: 'Controller Problem', icon: '🎛️', color: '#ff0088',
          },
        ],
      },
      'conservation-focused': {
        name: 'Water Conservation Inspection',
        description: 'Inspection focused on water efficiency and conservation opportunities',
        sections: [
          {
            id: 'efficiency_assessment',
            name: 'Water Efficiency Assessment',
            fields: [
              {
                id: 'controller_type', type: 'select', label: 'Controller Type', options: ['Basic Timer', 'Weather-Based', 'Soil Moisture Sensor', 'Smart Controller'], required: true,
              },
              {
                id: 'rain_sensor', type: 'select', label: 'Rain Sensor Status', options: ['Present & Working', 'Present but Not Working', 'Not Installed'], required: true,
              },
              {
                id: 'drip_zones', type: 'number', label: 'Number of Drip Zones', min: 0,
              },
              {
                id: 'spray_zones', type: 'number', label: 'Number of Spray Zones', min: 0,
              },
              {
                id: 'rotor_zones', type: 'number', label: 'Number of Rotor Zones', min: 0,
              },
            ],
          },
          {
            id: 'water_usage_analysis',
            name: 'Water Usage Analysis',
            fields: [
              {
                id: 'current_schedule', type: 'textarea', label: 'Current Watering Schedule', rows: 3,
              },
              {
                id: 'runtime_per_zone', type: 'number', label: 'Average Runtime per Zone (minutes)', min: 0,
              },
              {
                id: 'watering_frequency', type: 'select', label: 'Watering Frequency', options: ['Daily', '3x per week', '2x per week', 'Weekly', 'As needed'],
              },
              {
                id: 'seasonal_adjustment', type: 'select', label: 'Seasonal Adjustment', options: ['Manual adjustment', 'Weather-based', 'No adjustment'],
              },
            ],
          },
          {
            id: 'conservation_opportunities',
            name: 'Conservation Opportunities',
            fields: [
              {
                id: 'efficiency_rating', type: 'select', label: 'Overall Efficiency Rating', options: ['Excellent', 'Good', 'Fair', 'Poor'], required: true,
              },
              {
                id: 'water_waste_areas', type: 'textarea', label: 'Areas with Water Waste', rows: 4,
              },
              {
                id: 'recommended_upgrades', type: 'textarea', label: 'Recommended Efficiency Upgrades', rows: 4,
              },
              {
                id: 'potential_savings', type: 'number', label: 'Estimated Water Savings (%)', min: 0, max: 100,
              },
            ],
          },
        ],
        callouts: [
          {
            id: 'overwatering', name: 'Overwatering', icon: '💧', color: '#0066cc',
          },
          {
            id: 'runoff', name: 'Water Runoff', icon: '🌊', color: '#004499',
          },
          {
            id: 'poor_coverage', name: 'Inefficient Coverage', icon: '📍', color: '#ff8800',
          },
          {
            id: 'upgrade_opportunity', name: 'Upgrade Opportunity', icon: '⬆️', color: '#00aa00',
          },
          {
            id: 'timer_issue', name: 'Timer/Schedule Issue', icon: '⏰', color: '#ff4400',
          },
          {
            id: 'sensor_needed', name: 'Sensor Needed', icon: '📡', color: '#8800ff',
          },
        ],
      },
    };
  }

  async createInspection(companyId, inspectionData) {
    try {
      const {
        site_id,
        technician_id,
        template_id,
        scheduled_date,
        notes,
      } = inspectionData;

      // Verify site belongs to company
      const site = await db.get(`
        SELECT s.*, c.name as client_name, c.company_id
        FROM sites s
        JOIN clients c ON s.client_id = c.id
        WHERE s.id = ? AND c.company_id = ?
      `, [site_id, companyId]);

      if (!site) {
        return { success: false, error: 'Site not found' };
      }

      // Create inspection record
      const result = await db.run(`
        INSERT INTO inspections (
          company_id, site_id, technician_id, template_id,
          status, scheduled_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [companyId, site_id, technician_id, template_id, scheduled_date, notes]);

      return {
        success: true,
        inspection_id: result.id,
        inspection: {
          id: result.id,
          site_id,
          technician_id,
          template_id,
          status: 'scheduled',
          scheduled_date,
          notes,
        },
      };
    } catch (error) {
      console.error('Create inspection error:', error);
      return { success: false, error: error.message };
    }
  }

  async startInspection(inspectionId, technicianId) {
    try {
      const inspection = await db.get(`
        SELECT i.*, s.address, s.lat, s.lng, c.name as client_name
        FROM inspections i
        JOIN sites s ON i.site_id = s.id
        JOIN clients c ON s.client_id = c.id
        WHERE i.id = ? AND i.technician_id = ?
      `, [inspectionId, technicianId]);

      if (!inspection) {
        return { success: false, error: 'Inspection not found' };
      }

      if (inspection.status !== 'scheduled') {
        return { success: false, error: 'Inspection already started or completed' };
      }

      await db.run(`
        UPDATE inspections 
        SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [inspectionId]);

      // Get template data
      const template = await this.getTemplate(inspection.template_id || 'repair-focused');

      return {
        success: true,
        inspection: {
          ...inspection,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        },
        template,
      };
    } catch (error) {
      console.error('Start inspection error:', error);
      return { success: false, error: error.message };
    }
  }

  async saveInspectionData(inspectionId, sectionId, fieldData, technicianId) {
    try {
      // Verify inspection belongs to technician
      const inspection = await db.get(`
        SELECT id, status FROM inspections 
        WHERE id = ? AND technician_id = ? AND status = 'in_progress'
      `, [inspectionId, technicianId]);

      if (!inspection) {
        return { success: false, error: 'Inspection not found or not in progress' };
      }

      // Save or update inspection data
      await db.run(`
        INSERT OR REPLACE INTO inspection_data (
          inspection_id, section_id, field_data, created_at, updated_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [inspectionId, sectionId, JSON.stringify(fieldData)]);

      // Update inspection timestamp
      await db.run(`
        UPDATE inspections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [inspectionId]);

      return { success: true };
    } catch (error) {
      console.error('Save inspection data error:', error);
      return { success: false, error: error.message };
    }
  }

  async addCallout(inspectionId, calloutData, technicianId) {
    try {
      const {
        callout_type,
        zone_number,
        description,
        severity,
        lat,
        lng,
        photos = [],
      } = calloutData;

      // Verify inspection belongs to technician
      const inspection = await db.get(`
        SELECT id FROM inspections 
        WHERE id = ? AND technician_id = ? AND status = 'in_progress'
      `, [inspectionId, technicianId]);

      if (!inspection) {
        return { success: false, error: 'Inspection not found or not in progress' };
      }

      const result = await db.run(`
        INSERT INTO inspection_callouts (
          inspection_id, callout_type, zone_number, description,
          severity, lat, lng, photos, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [inspectionId, callout_type, zone_number, description, severity, lat, lng, JSON.stringify(photos)]);

      return {
        success: true,
        callout_id: result.id,
      };
    } catch (error) {
      console.error('Add callout error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadPhoto(inspectionId, photoData, technicianId) {
    try {
      const {
        zone_number,
        callout_id,
        caption,
        lat,
        lng,
        file_data, // Base64 encoded image data
      } = photoData;

      // Verify inspection belongs to technician
      const inspection = await db.get(`
        SELECT id FROM inspections 
        WHERE id = ? AND technician_id = ?
      `, [inspectionId, technicianId]);

      if (!inspection) {
        return { success: false, error: 'Inspection not found' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `inspection_${inspectionId}_${timestamp}.jpg`;
      const uploadsDir = path.join(__dirname, '../../uploads/inspections');

      // Ensure uploads directory exists
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);

      // Save base64 image to file
      const buffer = Buffer.from(file_data, 'base64');
      await fs.writeFile(filePath, buffer);

      // Save photo record to database
      const result = await db.run(`
        INSERT INTO inspection_photos (
          inspection_id, callout_id, zone_number, filename,
          caption, lat, lng, file_size, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [inspectionId, callout_id, zone_number, filename, caption, lat, lng, buffer.length]);

      return {
        success: true,
        photo_id: result.id,
        filename,
        file_path: `/uploads/inspections/${filename}`,
      };
    } catch (error) {
      console.error('Upload photo error:', error);
      return { success: false, error: error.message };
    }
  }

  async completeInspection(inspectionId, completionData, technicianId) {
    try {
      const {
        summary_notes,
        recommendations,
        completion_photos = [],
        technician_signature,
      } = completionData;

      // Verify inspection belongs to technician
      const inspection = await db.get(`
        SELECT id, status FROM inspections 
        WHERE id = ? AND technician_id = ? AND status = 'in_progress'
      `, [inspectionId, technicianId]);

      if (!inspection) {
        return { success: false, error: 'Inspection not found or not in progress' };
      }

      // Update inspection as completed
      await db.run(`
        UPDATE inspections SET 
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          summary_notes = ?,
          recommendations = ?,
          completion_photos = ?,
          technician_signature = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [summary_notes, recommendations, JSON.stringify(completion_photos), technician_signature, inspectionId]);

      // Generate PDF report
      const pdfResult = await this.generatePDFReport(inspectionId);

      return {
        success: true,
        pdf_generated: pdfResult.success,
        pdf_path: pdfResult.pdf_path,
        inspection_id: inspectionId,
      };
    } catch (error) {
      console.error('Complete inspection error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTemplate(templateId) {
    try {
      // Check if it's a default template
      if (this.defaultTemplates[templateId]) {
        return {
          success: true,
          template: {
            id: templateId,
            ...this.defaultTemplates[templateId],
          },
        };
      }

      // Check for custom template in database
      const template = await db.get(`
        SELECT * FROM inspection_templates WHERE id = ?
      `, [templateId]);

      if (!template) {
        return { success: false, error: 'Template not found' };
      }

      return {
        success: true,
        template: {
          ...template,
          sections: JSON.parse(template.sections),
          callouts: JSON.parse(template.callouts || '[]'),
        },
      };
    } catch (error) {
      console.error('Get template error:', error);
      return { success: false, error: error.message };
    }
  }

  async createCustomTemplate(companyId, templateData) {
    try {
      const {
        name,
        description,
        sections,
        callouts = [],
        is_active = true,
      } = templateData;

      const result = await db.run(`
        INSERT INTO inspection_templates (
          company_id, name, description, sections, callouts,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [companyId, name, description, JSON.stringify(sections), JSON.stringify(callouts), is_active]);

      return {
        success: true,
        template_id: result.id,
      };
    } catch (error) {
      console.error('Create custom template error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCompanyTemplates(companyId) {
    try {
      // Get custom templates
      const customTemplates = await db.query(`
        SELECT id, name, description, created_at
        FROM inspection_templates
        WHERE company_id = ? AND is_active = 1
        ORDER BY name
      `, [companyId]);

      // Add default templates
      const defaultTemplates = Object.entries(this.defaultTemplates).map(([id, template]) => ({
        id,
        name: template.name,
        description: template.description,
        is_default: true,
      }));

      return {
        success: true,
        templates: [...defaultTemplates, ...customTemplates],
      };
    } catch (error) {
      console.error('Get company templates error:', error);
      return { success: false, error: error.message };
    }
  }

  async generatePDFReport(inspectionId) {
    try {
      const pdfReportService = require('./pdfReportService');
      const result = await pdfReportService.generateInspectionReport(inspectionId);

      if (result.success) {
        // Save report record to database
        await db.run(`
          INSERT INTO inspection_reports (
            inspection_id, filename, file_path, created_at
          ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `, [inspectionId, result.filename, result.file_path]);
      }

      return result;
    } catch (error) {
      console.error('Generate PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  async getInspectionDetails(inspectionId, companyId) {
    try {
      const inspection = await db.get(`
        SELECT i.*, s.address, s.lat, s.lng, s.client_id,
               c.name as client_name, c.email as client_email,
               u.name as technician_name
        FROM inspections i
        JOIN sites s ON i.site_id = s.id
        JOIN clients c ON s.client_id = c.id
        JOIN users u ON i.technician_id = u.id
        WHERE i.id = ? AND i.company_id = ?
      `, [inspectionId, companyId]);

      if (!inspection) {
        return { success: false, error: 'Inspection not found' };
      }

      // Get inspection data
      const inspectionData = await db.query(`
        SELECT section_id, field_data FROM inspection_data
        WHERE inspection_id = ?
      `, [inspectionId]);

      // Get callouts
      const callouts = await db.query(`
        SELECT * FROM inspection_callouts
        WHERE inspection_id = ?
        ORDER BY created_at
      `, [inspectionId]);

      // Get photos
      const photos = await db.query(`
        SELECT * FROM inspection_photos
        WHERE inspection_id = ?
        ORDER BY created_at
      `, [inspectionId]);

      return {
        success: true,
        inspection: {
          ...inspection,
          data: inspectionData.reduce((acc, item) => {
            acc[item.section_id] = JSON.parse(item.field_data);
            return acc;
          }, {}),
          callouts: callouts.map((callout) => ({
            ...callout,
            photos: JSON.parse(callout.photos || '[]'),
          })),
          photos,
        },
      };
    } catch (error) {
      console.error('Get inspection details error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new InspectionService();
