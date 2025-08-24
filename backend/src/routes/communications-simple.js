const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all communications (placeholder)
router.get('/', asyncHandler(async (req, res) => {
  // Placeholder implementation - return mock data
  const mockCommunications = [
    {
      id: '1',
      client_id: '1',
      client_name: 'Sample Client',
      communication_type: 'email',
      subject: 'Follow-up on inspection',
      content: 'Thank you for choosing our inspection services...',
      direction: 'outbound',
      status: 'completed',
      completed_date: new Date().toISOString(),
      follow_up_date: null,
      tags: ['follow-up', 'inspection'],
      created_at: new Date().toISOString(),
      user_name: 'John Technician',
    },
  ];
  res.json(mockCommunications);
}));

// Get communication templates (placeholder)
router.get('/templates', asyncHandler(async (req, res) => {
  // Placeholder implementation - return mock templates
  const mockTemplates = [
    {
      id: '1',
      name: 'Inspection Follow-up',
      template_type: 'email',
      subject: 'Thank you for your inspection',
      content: 'Dear {{client_name}}, thank you for choosing our inspection services...',
      variables: ['client_name', 'inspection_date'],
      is_active: true,
    },
  ];
  res.json(mockTemplates);
}));

// Create new communication (placeholder)
router.post('/', asyncHandler(async (req, res) => {
  // Placeholder implementation
  res.status(201).json({
    id: `new-comm-${Date.now()}`,
    message: 'Communication created successfully',
    ...req.body,
  });
}));

module.exports = router;
