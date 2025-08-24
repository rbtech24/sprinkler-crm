const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class PDFReportService {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Generate inspection report PDF
  async generateInspectionReport(inspectionData, company, options = {}) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      const html = this.generateInspectionHTML(inspectionData, company);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px', right: '20px', bottom: '20px', left: '20px',
        },
        ...options,
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  // Generate work order PDF
  async generateWorkOrderReport(workOrderData, company, options = {}) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      const html = this.generateWorkOrderHTML(workOrderData, company);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px', right: '20px', bottom: '20px', left: '20px',
        },
        ...options,
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  // Generate estimate PDF
  async generateEstimateReport(estimateData, company, options = {}) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      const html = this.generateEstimateHTML(estimateData, company);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px', right: '20px', bottom: '20px', left: '20px',
        },
        ...options,
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    } finally {
      await page.close();
    }
  }

  // Generate inspection HTML template
  generateInspectionHTML(inspection, company) {
    const currentDate = new Date().toLocaleDateString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Inspection Report - ${inspection.site_name}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #333;
            line-height: 1.6;
          }
          .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
          }
          .company-logo {
            width: 120px;
            height: auto;
            margin-bottom: 15px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .report-title {
            font-size: 20px;
            opacity: 0.9;
          }
          .content {
            padding: 0 30px;
            max-width: 800px;
            margin: 0 auto;
          }
          .section {
            margin-bottom: 35px;
            background: #f8fafc;
            border-radius: 12px;
            padding: 25px;
            border-left: 4px solid #3b82f6;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
          }
          .section-title::before {
            content: '';
            width: 6px;
            height: 6px;
            background: #3b82f6;
            border-radius: 50%;
            margin-right: 12px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-label {
            font-weight: 600;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 16px;
            color: #1e293b;
          }
          .findings-list {
            list-style: none;
            padding: 0;
          }
          .finding-item {
            background: white;
            margin-bottom: 15px;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ef4444;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .finding-item.low { border-left-color: #22c55e; }
          .finding-item.medium { border-left-color: #f59e0b; }
          .finding-item.high { border-left-color: #ef4444; }
          .finding-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .finding-zone {
            font-weight: bold;
            color: #1e40af;
          }
          .severity-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .severity-low { background: #dcfce7; color: #166534; }
          .severity-medium { background: #fef3c7; color: #92400e; }
          .severity-high { background: #fee2e2; color: #991b1b; }
          .finding-description {
            color: #64748b;
            margin-bottom: 15px;
          }
          .photo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 15px;
          }
          .photo-item {
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .photo-item img {
            width: 100%;
            height: 120px;
            object-fit: cover;
          }
          .photo-caption {
            padding: 8px;
            font-size: 12px;
            color: #64748b;
            background: #f8fafc;
          }
          .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-top: 20px;
          }
          .stat-item {
            text-align: center;
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
          }
          .stat-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .footer {
            margin-top: 50px;
            padding: 30px;
            background: #f1f5f9;
            text-align: center;
            color: #64748b;
            border-top: 2px solid #e2e8f0;
          }
          .recommendations {
            background: #eff6ff;
            border: 1px solid #dbeafe;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
          }
          .recommendations h4 {
            color: #1e40af;
            margin-bottom: 15px;
          }
          .recommendations ul {
            margin: 0;
            padding-left: 20px;
          }
          .recommendations li {
            margin-bottom: 8px;
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" class="company-logo">` : ''}
          <div class="company-name">${company.name}</div>
          <div class="report-title">Sprinkler Inspection Report</div>
        </div>

        <div class="content">
          <!-- Site Information -->
          <div class="section">
            <div class="section-title">Site Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Client</div>
                <div class="info-value">${inspection.client_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Site</div>
                <div class="info-value">${inspection.site_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Address</div>
                <div class="info-value">${inspection.site_address}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Inspection Date</div>
                <div class="info-value">${new Date(inspection.started_at).toLocaleDateString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Inspector</div>
                <div class="info-value">${inspection.tech_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Report Generated</div>
                <div class="info-value">${currentDate}</div>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="section">
            <div class="section-title">Inspection Summary</div>
            <div class="summary-stats">
              <div class="stat-item">
                <div class="stat-number">${inspection.items?.length || 0}</div>
                <div class="stat-label">Total Findings</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${inspection.items?.filter((i) => i.severity === 'high').length || 0}</div>
                <div class="stat-label">High Priority</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${inspection.items?.filter((i) => i.severity === 'medium').length || 0}</div>
                <div class="stat-label">Medium Priority</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${inspection.items?.filter((i) => i.severity === 'low').length || 0}</div>
                <div class="stat-label">Low Priority</div>
              </div>
            </div>
          </div>

          <!-- Findings -->
          ${inspection.items && inspection.items.length > 0 ? `
          <div class="section">
            <div class="section-title">Inspection Findings</div>
            <ul class="findings-list">
              ${inspection.items.map((item) => `
                <li class="finding-item ${item.severity}">
                  <div class="finding-header">
                    <span class="finding-zone">Zone ${item.zone_number || 'N/A'}</span>
                    <span class="severity-badge severity-${item.severity}">${item.severity}</span>
                  </div>
                  <div class="finding-description">
                    <strong>${item.callout_code}:</strong> ${item.description || 'No description provided'}
                  </div>
                  ${item.photos && item.photos.length > 0 ? `
                    <div class="photo-grid">
                      ${item.photos.map((photo) => `
                        <div class="photo-item">
                          <img src="${photo.url}" alt="Finding photo">
                          ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}

          <!-- Recommendations -->
          ${inspection.items && inspection.items.length > 0 ? `
          <div class="section">
            <div class="section-title">Recommendations</div>
            <div class="recommendations">
              <h4>Immediate Actions Required:</h4>
              <ul>
                ${inspection.items.filter((i) => i.severity === 'high').map((item) => `<li>Zone ${item.zone_number}: ${item.callout_code} - Requires immediate attention</li>`).join('')}
              </ul>
              
              <h4>Scheduled Maintenance:</h4>
              <ul>
                ${inspection.items.filter((i) => i.severity === 'medium').map((item) => `<li>Zone ${item.zone_number}: ${item.callout_code} - Schedule for next maintenance window</li>`).join('')}
              </ul>
            </div>
          </div>
          ` : `
          <div class="section">
            <div class="section-title">Results</div>
            <div style="text-align: center; padding: 40px;">
              <div style="font-size: 48px; color: #22c55e; margin-bottom: 20px;">✓</div>
              <h3 style="color: #22c55e; margin-bottom: 10px;">System Passed Inspection</h3>
              <p style="color: #64748b;">No issues found during this inspection. System is operating within normal parameters.</p>
            </div>
          </div>
          `}

          <!-- Notes -->
          ${inspection.notes ? `
          <div class="section">
            <div class="section-title">Additional Notes</div>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${inspection.notes.replace(/\n/g, '<br>')}
            </div>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p><strong>${company.name}</strong></p>
          ${company.phone ? `<p>Phone: ${company.phone}</p>` : ''}
          ${company.email ? `<p>Email: ${company.email}</p>` : ''}
          ${company.address ? `<p>${company.address}</p>` : ''}
          <p style="margin-top: 20px; font-size: 12px;">
            This report was generated on ${currentDate}. For questions about this inspection, 
            please contact us at the information provided above.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate work order HTML template
  generateWorkOrderHTML(workOrder, company) {
    const currentDate = new Date().toLocaleDateString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Work Order - ${workOrder.title}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #333;
            line-height: 1.6;
          }
          .header {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .document-title {
            font-size: 20px;
            opacity: 0.9;
          }
          .content {
            padding: 0 30px;
            max-width: 800px;
            margin: 0 auto;
          }
          .section {
            margin-bottom: 35px;
            background: #f8fafc;
            border-radius: 12px;
            padding: 25px;
            border-left: 4px solid #10b981;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #065f46;
            margin-bottom: 20px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
          }
          .info-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-label {
            font-weight: 600;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 16px;
            color: #1e293b;
          }
          .status-badge {
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-scheduled { background: #dbeafe; color: #1d4ed8; }
          .status-in_progress { background: #dcfce7; color: #166534; }
          .status-completed { background: #f3f4f6; color: #374151; }
          .priority-badge {
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .priority-low { background: #f3f4f6; color: #374151; }
          .priority-medium { background: #fef3c7; color: #92400e; }
          .priority-high { background: #fed7d7; color: #c53030; }
          .priority-urgent { background: #fee2e2; color: #991b1b; }
          .footer {
            margin-top: 50px;
            padding: 30px;
            background: #f1f5f9;
            text-align: center;
            color: #64748b;
            border-top: 2px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${company.name}</div>
          <div class="document-title">Work Order #${workOrder.id}</div>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">Work Order Details</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Title</div>
                <div class="info-value">${workOrder.title}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">
                  <span class="status-badge status-${workOrder.status}">${workOrder.status.replace('_', ' ')}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Priority</div>
                <div class="info-value">
                  <span class="priority-badge priority-${workOrder.priority}">${workOrder.priority}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Type</div>
                <div class="info-value">${workOrder.type}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Scheduled</div>
                <div class="info-value">${workOrder.scheduled_start ? new Date(workOrder.scheduled_start).toLocaleString() : 'Not scheduled'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Duration</div>
                <div class="info-value">${workOrder.estimated_duration ? `${workOrder.estimated_duration} hours` : 'Not specified'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Location</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Client</div>
                <div class="info-value">${workOrder.client_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Site</div>
                <div class="info-value">${workOrder.site_name}</div>
              </div>
              <div class="info-item" style="grid-column: 1 / -1;">
                <div class="info-label">Address</div>
                <div class="info-value">${workOrder.site_address}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Assignment</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Assigned Technician</div>
                <div class="info-value">${workOrder.tech_name || 'Not assigned'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Created</div>
                <div class="info-value">${new Date(workOrder.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Description</div>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${workOrder.description.replace(/\n/g, '<br>')}
            </div>
          </div>

          ${workOrder.notes ? `
          <div class="section">
            <div class="section-title">Additional Notes</div>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${workOrder.notes.replace(/\n/g, '<br>')}
            </div>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p><strong>${company.name}</strong></p>
          ${company.phone ? `<p>Phone: ${company.phone}</p>` : ''}
          ${company.email ? `<p>Email: ${company.email}</p>` : ''}
          <p style="margin-top: 20px; font-size: 12px;">
            Work Order generated on ${currentDate}
          </p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate estimate HTML template
  generateEstimateHTML(estimate, company) {
    const currentDate = new Date().toLocaleDateString();
    const subtotal = estimate.items?.reduce((sum, item) => sum + (item.line_total || 0), 0) || 0;
    const tax = subtotal * 0.08; // 8% tax rate - should be configurable
    const total = subtotal + tax;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Estimate - ${estimate.client_name}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #333;
            line-height: 1.6;
          }
          .header {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .document-title {
            font-size: 20px;
            opacity: 0.9;
          }
          .content {
            padding: 0 30px;
            max-width: 800px;
            margin: 0 auto;
          }
          .section {
            margin-bottom: 35px;
            background: #f8fafc;
            border-radius: 12px;
            padding: 25px;
            border-left: 4px solid #a855f7;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #6b21a8;
            margin-bottom: 20px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
          }
          .info-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-label {
            font-weight: 600;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 16px;
            color: #1e293b;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .items-table th,
          .items-table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          .items-table th {
            background: #f8fafc;
            font-weight: 600;
            color: #475569;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .items-table tr:hover {
            background: #f8fafc;
          }
          .total-row {
            background: #f1f5f9;
            font-weight: 600;
          }
          .total-amount {
            font-size: 18px;
            color: #7c3aed;
          }
          .footer {
            margin-top: 50px;
            padding: 30px;
            background: #f1f5f9;
            text-align: center;
            color: #64748b;
            border-top: 2px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${company.name}</div>
          <div class="document-title">Estimate #${estimate.id}</div>
        </div>

        <div class="content">
          <div class="section">
            <div class="section-title">Estimate Details</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Client</div>
                <div class="info-value">${estimate.client_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Site</div>
                <div class="info-value">${estimate.site_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date</div>
                <div class="info-value">${new Date(estimate.created_at).toLocaleDateString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Valid Until</div>
                <div class="info-value">${estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : '30 days'}</div>
              </div>
            </div>
          </div>

          ${estimate.items && estimate.items.length > 0 ? `
          <div class="section">
            <div class="section-title">Line Items</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${estimate.items.map((item) => `
                  <tr>
                    <td>
                      <div style="font-weight: 600;">${item.description}</div>
                      ${item.notes ? `<div style="font-size: 14px; color: #64748b; margin-top: 5px;">${item.notes}</div>` : ''}
                    </td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">$${(item.unit_price / 100).toFixed(2)}</td>
                    <td style="text-align: right;">$${(item.line_total / 100).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align: right; font-weight: 600;">Subtotal:</td>
                  <td style="text-align: right;">$${(subtotal / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="text-align: right; font-weight: 600;">Tax (8%):</td>
                  <td style="text-align: right;">$${(tax / 100).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; font-weight: 700;">Total:</td>
                  <td style="text-align: right;" class="total-amount">$${(total / 100).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          ` : ''}

          ${estimate.notes ? `
          <div class="section">
            <div class="section-title">Notes</div>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${estimate.notes.replace(/\n/g, '<br>')}
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Terms & Conditions</div>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6;">
              <ul style="margin: 0; padding-left: 20px;">
                <li>This estimate is valid for 30 days from the date above.</li>
                <li>Payment is due upon completion of work unless other arrangements have been made.</li>
                <li>Any changes to the scope of work may affect the final price.</li>
                <li>We reserve the right to charge for additional materials not included in this estimate.</li>
                <li>Customer is responsible for ensuring access to work areas and water supply.</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>${company.name}</strong></p>
          ${company.phone ? `<p>Phone: ${company.phone}</p>` : ''}
          ${company.email ? `<p>Email: ${company.email}</p>` : ''}
          <p style="margin-top: 20px; font-size: 12px;">
            Estimate generated on ${currentDate}
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = PDFReportService;
