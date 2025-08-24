const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get unscheduled work orders (placeholder)
router.get('/work-orders', asyncHandler(async (req, res) => {
  // Mock work orders data
  const mockWorkOrders = [
    {
      id: '1',
      title: 'Sprinkler System Repair',
      client_name: 'ABC Corporation',
      site_address: '123 Main St, City, State',
      priority: 'high',
      status: 'pending',
      estimated_hours: 3,
      required_skills: ['sprinkler_systems', 'plumbing'],
    },
  ];
  res.json(mockWorkOrders);
}));

// Get technicians with skills and availability (placeholder)
router.get('/technicians', asyncHandler(async (req, res) => {
  // Mock technicians data
  const mockTechnicians = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john@company.com',
      skills: [
        { skill_type: 'sprinkler_systems', proficiency_level: 'expert', years_experience: 5 },
        { skill_type: 'plumbing', proficiency_level: 'advanced', years_experience: 3 },
      ],
      availability: [
        { day_of_week: 1, start_time: '08:00', end_time: '17:00' },
        { day_of_week: 2, start_time: '08:00', end_time: '17:00' },
      ],
      current_workload: 60,
    },
  ];
  res.json(mockTechnicians);
}));

// Auto-assign suggestions (placeholder)
router.get('/auto-assign/:workOrderId', asyncHandler(async (req, res) => {
  // Mock auto-assign suggestions
  const mockSuggestions = [
    {
      technician_id: '1',
      technician_name: 'John Smith',
      skill_match_score: 0.95,
      availability_score: 0.80,
      workload_score: 0.70,
      overall_score: 0.82,
      reason: 'High skill match with sprinkler systems and good availability',
    },
  ];
  res.json(mockSuggestions);
}));

// Assign work order (placeholder)
router.post('/assign', asyncHandler(async (req, res) => {
  const {
    work_order_id, technician_id, scheduled_date, scheduled_time,
  } = req.body;

  res.json({
    success: true,
    message: 'Work order assigned successfully',
    assignment: {
      work_order_id,
      technician_id,
      scheduled_date,
      scheduled_time,
    },
  });
}));

module.exports = router;
