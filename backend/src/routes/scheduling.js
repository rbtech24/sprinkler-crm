const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/errorHandler').asyncHandler;
const { query } = require('../database');
const smartAssignmentService = require('../services/smartAssignmentService');
const routeOptimizationService = require('../services/routeOptimizationService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get schedule for a specific date range
router.get('/', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { 
    start_date, 
    end_date, 
    technician_id, 
    view = 'calendar' // 'calendar', 'list', 'map'
  } = req.query;

  let whereClause = 'WHERE s.company_id = $1';
  let params = [companyId];
  let paramCount = 1;

  if (start_date) {
    paramCount++;
    whereClause += ` AND s.scheduled_date >= $${paramCount}`;
    params.push(start_date);
  }

  if (end_date) {
    paramCount++;
    whereClause += ` AND s.scheduled_date <= $${paramCount}`;
    params.push(end_date);
  }

  if (technician_id) {
    paramCount++;
    whereClause += ` AND s.technician_id = $${paramCount}`;
    params.push(technician_id);
  }

  const scheduleQuery = `
    SELECT 
      s.*,
      t.name as technician_name,
      t.phone as technician_phone,
      t.skills,
      c.name as client_name,
      c.phone as client_phone,
      c.email as client_email,
      si.name as site_name,
      si.address as site_address,
      si.city as site_city,
      si.state as site_state,
      si.zip_code as site_zip,
      si.coordinates,
      CASE 
        WHEN s.type = 'inspection' THEN i.id
        WHEN s.type = 'work_order' THEN wo.id
        ELSE NULL
      END as related_id,
      CASE 
        WHEN s.type = 'inspection' THEN i.status
        WHEN s.type = 'work_order' THEN wo.status
        ELSE NULL
      END as related_status
    FROM schedule s
    LEFT JOIN users t ON s.technician_id = t.id
    LEFT JOIN clients c ON s.client_id = c.id
    LEFT JOIN sites si ON s.site_id = si.id
    LEFT JOIN inspections i ON s.type = 'inspection' AND s.related_id = i.id
    LEFT JOIN work_orders wo ON s.type = 'work_order' AND s.related_id = wo.id
    ${whereClause}
    ORDER BY s.scheduled_date ASC, s.start_time ASC
  `;

  const result = await query(scheduleQuery, params);
  res.json(result.rows);
}));

// Create new scheduled event
router.post('/', asyncHandler(async (req, res) => {
  const {
    type, // 'inspection', 'work_order', 'estimate', 'follow_up'
    client_id,
    site_id,
    technician_id,
    scheduled_date,
    start_time,
    end_time,
    duration_minutes,
    priority,
    notes,
    related_id,
    recurring_pattern,
    auto_assigned
  } = req.body;

  const companyId = req.user.company_id;
  const userId = req.user.id;

  // Check for scheduling conflicts
  const conflictQuery = `
    SELECT id FROM schedule
    WHERE technician_id = $1 
      AND scheduled_date = $2
      AND (
        (start_time <= $3 AND end_time > $3) OR
        (start_time < $4 AND end_time >= $4) OR
        (start_time >= $3 AND end_time <= $4)
      )
      AND status != 'cancelled'
  `;

  const conflicts = await query(conflictQuery, [
    technician_id, scheduled_date, start_time, end_time
  ]);

  if (conflicts.rows.length > 0) {
    return res.status(409).json({ 
      error: 'Scheduling conflict detected',
      conflicting_appointments: conflicts.rows
    });
  }

  const insertQuery = `
    INSERT INTO schedule (
      company_id, type, client_id, site_id, technician_id, scheduled_by,
      scheduled_date, start_time, end_time, duration_minutes, priority,
      notes, related_id, status, auto_assigned, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'scheduled', $14, NOW())
    RETURNING *
  `;

  const result = await query(insertQuery, [
    companyId, type, client_id, site_id, technician_id, userId,
    scheduled_date, start_time, end_time, duration_minutes, priority,
    notes, related_id, auto_assigned || false
  ]);

  // Handle recurring patterns
  if (recurring_pattern) {
    await createRecurringSchedule(result.rows[0].id, recurring_pattern, companyId);
  }

  res.status(201).json(result.rows[0]);
}));

// Auto-assign technician based on skills and availability
router.post('/auto-assign', asyncHandler(async (req, res) => {
  const {
    type,
    client_id,
    site_id,
    scheduled_date,
    start_time,
    duration_minutes,
    required_skills = [],
    priority = 'medium'
  } = req.body;

  const companyId = req.user.company_id;

  // Calculate end time
  const startDateTime = new Date(`${scheduled_date}T${start_time}`);
  const endDateTime = new Date(startDateTime.getTime() + duration_minutes * 60000);
  const end_time = endDateTime.toTimeString().slice(0, 8);

  // Find available technicians with required skills
  const availableTecsQuery = `
    SELECT 
      u.id,
      u.name,
      u.skills,
      u.certifications,
      u.experience_years,
      -- Calculate skill match score
      CASE 
        WHEN $4::text[] = '{}' THEN 100
        ELSE (
          SELECT COUNT(*) * 100.0 / array_length($4::text[], 1)
          FROM unnest($4::text[]) AS required_skill
          WHERE required_skill = ANY(u.skills::text[])
        )
      END as skill_match_score,
      -- Calculate workload for the day
      COALESCE(daily_workload.appointment_count, 0) as daily_appointments
    FROM users u
    LEFT JOIN (
      SELECT technician_id, COUNT(*) as appointment_count
      FROM schedule
      WHERE scheduled_date = $2 AND status != 'cancelled'
      GROUP BY technician_id
    ) daily_workload ON u.id = daily_workload.technician_id
    WHERE u.company_id = $1
      AND u.role = 'tech'
      AND u.status = 'active'
      -- Check availability for the time slot
      AND NOT EXISTS (
        SELECT 1 FROM schedule s
        WHERE s.technician_id = u.id
          AND s.scheduled_date = $2
          AND (
            (s.start_time <= $3 AND s.end_time > $3) OR
            (s.start_time < $5 AND s.end_time >= $5) OR
            (s.start_time >= $3 AND s.end_time <= $5)
          )
          AND s.status != 'cancelled'
      )
    ORDER BY skill_match_score DESC, daily_appointments ASC, u.experience_years DESC
    LIMIT 5
  `;

  const availableTechs = await query(availableTecsQuery, [
    companyId, scheduled_date, start_time, required_skills, end_time
  ]);

  if (availableTechs.rows.length === 0) {
    return res.status(404).json({ 
      error: 'No available technicians found for the requested time slot',
      suggestions: await getSuggestedTimeSlots(companyId, scheduled_date, duration_minutes, required_skills)
    });
  }

  // Auto-assign to the best match
  const bestTech = availableTechs.rows[0];

  const insertQuery = `
    INSERT INTO schedule (
      company_id, type, client_id, site_id, technician_id, scheduled_by,
      scheduled_date, start_time, end_time, duration_minutes, priority,
      status, auto_assigned, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled', true, NOW())
    RETURNING *
  `;

  const result = await query(insertQuery, [
    companyId, type, client_id, site_id, bestTech.id, req.user.id,
    scheduled_date, start_time, end_time, duration_minutes, priority
  ]);

  res.status(201).json({
    schedule: result.rows[0],
    assigned_technician: bestTech,
    available_alternatives: availableTechs.rows.slice(1)
  });
}));

// Get technician availability
router.get('/availability/:technicianId', asyncHandler(async (req, res) => {
  const technicianId = req.params.technicianId;
  const { date, duration_minutes = 60 } = req.query;
  const companyId = req.user.company_id;

  const availabilityQuery = `
    SELECT 
      generate_series(
        '08:00:00'::time,
        '17:00:00'::time,
        '${duration_minutes} minutes'::interval
      ) as time_slot,
      NOT EXISTS (
        SELECT 1 FROM schedule s
        WHERE s.technician_id = $1
          AND s.scheduled_date = $2
          AND s.status != 'cancelled'
          AND (
            s.start_time <= generate_series AND 
            s.end_time > generate_series
          )
      ) as available
  `;

  const result = await query(availabilityQuery, [technicianId, date]);
  res.json(result.rows);
}));

// Update schedule status
router.put('/:id/status', asyncHandler(async (req, res) => {
  const scheduleId = req.params.id;
  const { status, notes, actual_start_time, actual_end_time } = req.body;
  const companyId = req.user.company_id;

  const updateQuery = `
    UPDATE schedule 
    SET status = $1, notes = $2, actual_start_time = $3, actual_end_time = $4, updated_at = NOW()
    WHERE id = $5 AND company_id = $6
    RETURNING *
  `;

  const result = await query(updateQuery, [
    status, notes, actual_start_time, actual_end_time, scheduleId, companyId
  ]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Schedule entry not found' });
  }

  res.json(result.rows[0]);
}));

// Get schedule analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { start_date, end_date } = req.query;

  const analyticsQuery = `
    SELECT 
      DATE_TRUNC('day', scheduled_date) as date,
      COUNT(*) as total_appointments,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
      AVG(duration_minutes) as avg_duration,
      COUNT(DISTINCT technician_id) as active_technicians
    FROM schedule
    WHERE company_id = $1
      AND scheduled_date >= $2
      AND scheduled_date <= $3
    GROUP BY DATE_TRUNC('day', scheduled_date)
    ORDER BY date
  `;

  const result = await query(analyticsQuery, [
    companyId,
    start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date || new Date().toISOString()
  ]);

  res.json(result.rows);
}));

// Helper function to get suggested time slots
async function getSuggestedTimeSlots(companyId, preferredDate, durationMinutes, requiredSkills) {
  // Implementation for suggesting alternative time slots
  const suggestions = [];
  
  // Check next 7 days for availability
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(preferredDate);
    checkDate.setDate(checkDate.getDate() + i);
    
    // Find available slots for this date
    // This would involve similar logic to the auto-assign query
    // Simplified for brevity
  }
  
  return suggestions;
}

// Smart assignment endpoint using AI algorithm
router.post('/smart-assign', asyncHandler(async (req, res) => {
  const {
    job_id,
    job_type, // 'work_order', 'inspection', 'estimate'
    scheduled_date,
    site_id,
    priority = 'normal',
    required_skills = [],
    preferred_technician_id
  } = req.body;

  const companyId = req.user.company_id;

  try {
    // Prepare job details for smart assignment
    const jobDetails = {
      id: job_id,
      company_id: companyId,
      scheduled_date,
      site_id,
      priority,
      required_skills,
      preferred_technician_id
    };

    // Use smart assignment service
    const assignmentResult = await smartAssignmentService.findBestTechnician(
      jobDetails,
      job_type,
      companyId,
      {
        considerWorkload: true,
        considerSkills: true,
        considerProximity: true,
        considerPerformance: true
      }
    );

    if (assignmentResult.success) {
      // Update the job with the assigned technician
      const updateTable = job_type === 'work_order' ? 'work_orders' : 
                         job_type === 'inspection' ? 'inspections' : 'estimates';
      const assignField = job_type === 'work_order' ? 'assigned_tech_id' :
                         job_type === 'inspection' ? 'tech_id' : 'assigned_to';

      await query(`
        UPDATE ${updateTable} 
        SET ${assignField} = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3
      `, [assignmentResult.technician.id, job_id, companyId]);

      res.json({
        success: true,
        assignment: {
          job_id,
          job_type,
          assigned_technician: assignmentResult.technician,
          confidence: assignmentResult.confidence,
          factors: assignmentResult.factors,
          alternatives: assignmentResult.alternatives
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: assignmentResult.message || 'No suitable technician found',
        suggestions: await getSuggestedTimeSlots(companyId, scheduled_date, 60, required_skills)
      });
    }

  } catch (error) {
    console.error('Smart assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Smart assignment failed',
      error: error.message
    });
  }
}));

// Route optimization for technician's daily schedule
router.post('/optimize-routes', asyncHandler(async (req, res) => {
  const {
    technician_id,
    date,
    options = {}
  } = req.body;

  const companyId = req.user.company_id;

  try {
    const optimization = await routeOptimizationService.optimizeRouteForTechnician(
      technician_id,
      date,
      {
        returnToStart: options.return_to_start || false,
        bufferMinutes: options.buffer_minutes || 15,
        ...options
      }
    );

    res.json(optimization);

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Route optimization failed',
      error: error.message
    });
  }
}));

// Bulk route optimization for all technicians on a date
router.post('/optimize-all-routes', asyncHandler(async (req, res) => {
  const { date, options = {} } = req.body;
  const companyId = req.user.company_id;

  try {
    const optimization = await routeOptimizationService.optimizeMultipleTechnicianRoutes(
      companyId,
      date,
      options
    );

    res.json(optimization);

  } catch (error) {
    console.error('Bulk route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk route optimization failed',
      error: error.message
    });
  }
}));

// Auto-assign unassigned jobs using smart algorithm
router.post('/auto-assign-all', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { options = {} } = req.body;

  try {
    const autoAssignment = await smartAssignmentService.autoAssignJobs(
      companyId,
      options
    );

    res.json(autoAssignment);

  } catch (error) {
    console.error('Auto-assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Auto-assignment failed',
      error: error.message
    });
  }
}));

// Get optimized route for a technician
router.get('/routes/:technicianId/:date', asyncHandler(async (req, res) => {
  const { technicianId, date } = req.params;
  const companyId = req.user.company_id;

  try {
    const route = await routeOptimizationService.getOptimizedRoute(
      technicianId,
      date
    );

    if (route) {
      res.json({
        success: true,
        route,
        waypoints: JSON.parse(route.waypoints || '[]'),
        job_sequence: JSON.parse(route.job_sequence || '[]')
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No optimized route found for this technician and date'
      });
    }

  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Emergency reassignment when technician becomes unavailable
router.post('/reassign-technician', asyncHandler(async (req, res) => {
  const {
    original_technician_id,
    date,
    reason = 'unavailable',
    reassign_to = null // Optional: specific technician to reassign to
  } = req.body;

  const companyId = req.user.company_id;

  try {
    if (reassign_to) {
      // Manual reassignment to specific technician
      await query(`
        UPDATE work_orders 
        SET assigned_tech_id = $1, 
            instructions = COALESCE(instructions, '') || ' [Reassigned: ' || $2 || ']'
        WHERE assigned_tech_id = $3 
          AND DATE(scheduled_start) = $4
          AND company_id = $5
          AND status = 'scheduled'
      `, [reassign_to, reason, original_technician_id, date, companyId]);

      await query(`
        UPDATE inspections 
        SET tech_id = $1,
            notes = COALESCE(notes, '') || ' [Reassigned: ' || $2 || ']'
        WHERE tech_id = $3
          AND DATE(scheduled_at) = $4
          AND company_id = $5
          AND submitted_at IS NULL
      `, [reassign_to, reason, original_technician_id, date, companyId]);

      res.json({
        success: true,
        message: 'Jobs manually reassigned',
        reassigned_to: reassign_to
      });
    } else {
      // Smart reassignment using algorithm
      const reassignments = await smartAssignmentService.reassignJobsForUnavailableTechnician(
        original_technician_id,
        date,
        reason
      );

      res.json({
        success: true,
        reassignments
      });
    }

  } catch (error) {
    console.error('Reassignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Reassignment failed',
      error: error.message
    });
  }
}));

// Get scheduling insights and recommendations
router.get('/insights', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { date } = req.query;

  try {
    const insights = await getSchedulingInsights(companyId, date);
    res.json(insights);

  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Helper function to get suggested time slots
async function getSuggestedTimeSlots(companyId, preferredDate, durationMinutes, requiredSkills) {
  const suggestions = [];
  
  // Check next 7 days for availability
  for (let i = 1; i <= 7; i++) {
    const checkDate = new Date(preferredDate);
    checkDate.setDate(checkDate.getDate() + i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    // Find available technicians with required skills for this date
    const availableQuery = `
      SELECT u.id, u.full_name, COUNT(*) as availability_slots
      FROM users u
      LEFT JOIN schedule s ON u.id = s.technician_id 
        AND s.scheduled_date = $2 
        AND s.status != 'cancelled'
      WHERE u.company_id = $1
        AND u.role = 'tech'
        AND u.is_active = 1
      GROUP BY u.id, u.full_name
      HAVING COUNT(s.id) < 8  -- Max 8 appointments per day
      ORDER BY COUNT(s.id) ASC
      LIMIT 3
    `;
    
    const available = await query(availableQuery, [companyId, dateStr]);
    
    if (available.rows.length > 0) {
      suggestions.push({
        date: dateStr,
        available_technicians: available.rows,
        suggested_time_slots: ['08:00', '10:00', '13:00', '15:00']
      });
    }
    
    if (suggestions.length >= 3) break; // Limit suggestions
  }
  
  return suggestions;
}

// Helper function for recurring schedules
async function createRecurringSchedule(originalScheduleId, pattern, companyId) {
  // Get original schedule details
  const original = await query(`
    SELECT * FROM schedule WHERE id = $1 AND company_id = $2
  `, [originalScheduleId, companyId]);
  
  if (original.rows.length === 0) return;
  
  const originalSchedule = original.rows[0];
  const recurringSchedules = [];
  
  // Parse recurring pattern
  const { frequency, interval, end_date, count } = pattern;
  let currentDate = new Date(originalSchedule.scheduled_date);
  let createdCount = 0;
  
  while (
    (end_date && currentDate <= new Date(end_date)) || 
    (count && createdCount < count)
  ) {
    // Add interval based on frequency
    if (frequency === 'daily') {
      currentDate.setDate(currentDate.getDate() + interval);
    } else if (frequency === 'weekly') {
      currentDate.setDate(currentDate.getDate() + (7 * interval));
    } else if (frequency === 'monthly') {
      currentDate.setMonth(currentDate.getMonth() + interval);
    }
    
    // Create new schedule entry
    const insertQuery = `
      INSERT INTO schedule (
        company_id, type, client_id, site_id, technician_id, scheduled_by,
        scheduled_date, start_time, end_time, duration_minutes, priority,
        notes, related_id, status, recurring_group_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'scheduled', $14, NOW())
      RETURNING id
    `;
    
    const result = await query(insertQuery, [
      companyId,
      originalSchedule.type,
      originalSchedule.client_id,
      originalSchedule.site_id,
      originalSchedule.technician_id,
      originalSchedule.scheduled_by,
      currentDate.toISOString().split('T')[0],
      originalSchedule.start_time,
      originalSchedule.end_time,
      originalSchedule.duration_minutes,
      originalSchedule.priority,
      originalSchedule.notes,
      originalSchedule.related_id,
      originalScheduleId // Use original as recurring group ID
    ]);
    
    recurringSchedules.push(result.rows[0].id);
    createdCount++;
    
    if (createdCount >= 50) break; // Safety limit
  }
  
  return recurringSchedules;
}

// Get scheduling insights and recommendations
async function getSchedulingInsights(companyId, date) {
  const insights = {
    date,
    metrics: {},
    recommendations: [],
    alerts: []
  };

  // Get basic metrics for the date
  const metricsQuery = `
    SELECT 
      COUNT(*) as total_scheduled,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
      COUNT(DISTINCT technician_id) as active_technicians,
      AVG(duration_minutes) as avg_duration
    FROM schedule
    WHERE company_id = $1 AND scheduled_date = $2
  `;
  
  const metricsResult = await query(metricsQuery, [companyId, date]);
  insights.metrics = metricsResult.rows[0];

  // Get technician utilization
  const utilizationQuery = `
    SELECT 
      u.full_name,
      u.id as technician_id,
      COUNT(s.id) as scheduled_jobs,
      SUM(s.duration_minutes) as total_minutes,
      ROUND(SUM(s.duration_minutes) / 480.0 * 100, 1) as utilization_percentage
    FROM users u
    LEFT JOIN schedule s ON u.id = s.technician_id 
      AND s.scheduled_date = $2 
      AND s.status != 'cancelled'
    WHERE u.company_id = $1 AND u.role = 'tech' AND u.is_active = 1
    GROUP BY u.id, u.full_name
    ORDER BY utilization_percentage DESC
  `;
  
  const utilizationResult = await query(utilizationQuery, [companyId, date]);
  insights.technician_utilization = utilizationResult.rows;

  // Generate recommendations
  utilizationResult.rows.forEach(tech => {
    if (tech.utilization_percentage < 50) {
      insights.recommendations.push({
        type: 'underutilization',
        message: `${tech.full_name} is underutilized (${tech.utilization_percentage}%). Consider assigning more jobs.`,
        technician_id: tech.technician_id
      });
    } else if (tech.utilization_percentage > 90) {
      insights.alerts.push({
        type: 'overutilization',
        message: `${tech.full_name} is overloaded (${tech.utilization_percentage}%). Consider redistributing jobs.`,
        technician_id: tech.technician_id
      });
    }
  });

  // Check for unassigned jobs
  const unassignedQuery = `
    SELECT COUNT(*) as unassigned_count
    FROM work_orders wo
    WHERE wo.company_id = $1 
      AND DATE(wo.scheduled_start) = $2
      AND wo.assigned_tech_id IS NULL
      AND wo.status = 'scheduled'
  `;
  
  const unassignedResult = await query(unassignedQuery, [companyId, date]);
  const unassignedCount = unassignedResult.rows[0].unassigned_count;
  
  if (unassignedCount > 0) {
    insights.alerts.push({
      type: 'unassigned_jobs',
      message: `${unassignedCount} jobs are unassigned for ${date}. Use auto-assignment to optimize.`,
      count: unassignedCount
    });
  }

  return insights;
}

module.exports = router;
