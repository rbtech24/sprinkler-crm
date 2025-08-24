const { client } = require('../database');

/**
 * Smart Assignment Algorithm for Technician Job Assignment
 * Considers skills, location, availability, workload, and performance
 */
class SmartAssignmentService {
  constructor() {
    this.scoringWeights = {
      skillMatch: 0.30, // 30% - Skills and experience match
      proximity: 0.25, // 25% - Geographic proximity to job
      availability: 0.20, // 20% - Current availability and schedule
      workload: 0.15, // 15% - Current workload balance
      performance: 0.10, // 10% - Historical performance metrics
    };
  }

  /**
   * Find the best technician for a job using smart assignment algorithm
   * @param {Object} job - Job details (inspection, work_order, or estimate)
   * @param {string} jobType - Type of job ('inspection', 'work_order', 'estimate')
   * @param {number} companyId - Company ID
   * @param {Object} options - Additional options and constraints
   * @returns {Promise<Object>} Assignment result with technician and scoring details
   */
  async findBestTechnician(job, jobType, companyId, options = {}) {
    try {
      // Get all available technicians for the company
      const technicians = await this.getAvailableTechnicians(companyId, job.scheduled_date || new Date());

      if (technicians.length === 0) {
        return {
          success: false,
          message: 'No available technicians found',
          technician: null,
          alternatives: [],
        };
      }

      // Get job requirements
      const jobRequirements = await this.getJobRequirements(job.id, jobType);

      // Score each technician
      const scoredTechnicians = await Promise.all(
        technicians.map(async (technician) => {
          const score = await this.calculateTechnicianScore(
            technician,
            job,
            jobRequirements,
            options,
          );

          return {
            ...technician,
            assignmentScore: score.total,
            scoreBreakdown: score.breakdown,
            assignmentReasons: score.reasons,
          };
        }),
      );

      // Sort by score (descending)
      scoredTechnicians.sort((a, b) => b.assignmentScore - a.assignmentScore);

      const bestTechnician = scoredTechnicians[0];
      const alternatives = scoredTechnicians.slice(1, 4); // Top 3 alternatives

      // Log the assignment decision
      await this.logAssignment(job.id, jobType, bestTechnician, alternatives);

      return {
        success: true,
        technician: bestTechnician,
        alternatives,
        confidence: this.calculateConfidence(bestTechnician.assignmentScore, alternatives),
        factors: bestTechnician.scoreBreakdown,
      };
    } catch (error) {
      console.error('Smart assignment error:', error);
      return {
        success: false,
        message: 'Assignment algorithm failed',
        error: error.message,
      };
    }
  }

  /**
   * Get available technicians for a specific date
   */
  async getAvailableTechnicians(companyId, date) {
    const dateStr = new Date(date).toISOString().split('T')[0];

    const query = `
      SELECT DISTINCT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        ta.status as availability_status,
        tl.latitude,
        tl.longitude,
        COUNT(ts.id) as skill_count
      FROM users u
      LEFT JOIN technician_availability ta ON u.id = ta.user_id AND ta.date = ?
      LEFT JOIN technician_locations tl ON u.id = tl.user_id AND tl.is_active = 1
      LEFT JOIN technician_skills ts ON u.id = ts.user_id AND ts.is_active = 1
      WHERE u.company_id = ? 
        AND u.role IN ('tech', 'lead_tech', 'admin')
        AND u.is_active = 1
        AND (ta.status IS NULL OR ta.status = 'available')
      GROUP BY u.id
      ORDER BY skill_count DESC, u.name
    `;

    const result = await client.query(query, [dateStr, companyId]);
    return result.rows;
  }

  /**
   * Get job requirements (skills and equipment needed)
   */
  async getJobRequirements(jobId, jobType) {
    const query = `
      SELECT 
        skill_name,
        skill_level_required,
        equipment_required,
        priority
      FROM job_requirements 
      WHERE ${jobType}_id = ?
      ORDER BY priority DESC
    `;

    const result = await client.query(query, [jobId]);
    return result.rows;
  }

  /**
   * Calculate comprehensive score for a technician
   */
  async calculateTechnicianScore(technician, job, jobRequirements, options) {
    const scores = {
      skillMatch: await this.calculateSkillScore(technician.id, jobRequirements),
      proximity: await this.calculateProximityScore(technician, job),
      availability: await this.calculateAvailabilityScore(technician.id, job.scheduled_date),
      workload: await this.calculateWorkloadScore(technician.id, job.scheduled_date),
      performance: await this.calculatePerformanceScore(technician.id),
    };

    // Apply weights and calculate total score
    const total = Object.keys(scores).reduce((sum, key) => sum + (scores[key] * this.scoringWeights[key]), 0);

    // Generate reasoning for the score
    const reasons = this.generateScoringReasons(scores, jobRequirements);

    return {
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      breakdown: scores,
      reasons,
    };
  }

  /**
   * Calculate skill match score (0-100)
   */
  async calculateSkillScore(technicianId, jobRequirements) {
    if (jobRequirements.length === 0) return 70; // Default score if no specific requirements

    const techSkillsQuery = `
      SELECT skill_name, skill_level
      FROM technician_skills 
      WHERE user_id = ? AND is_active = 1
    `;

    const techSkills = await client.query(techSkillsQuery, [technicianId]);
    const skillMap = new Map(techSkills.rows.map((s) => [s.skill_name.toLowerCase(), s.skill_level]));

    const skillLevels = {
      beginner: 1, intermediate: 2, advanced: 3, expert: 4,
    };
    let totalScore = 0;
    let totalRequirements = 0;

    for (const req of jobRequirements) {
      totalRequirements++;
      const techSkillLevel = skillMap.get(req.skill_name.toLowerCase());

      if (techSkillLevel) {
        const techLevel = skillLevels[techSkillLevel] || 0;
        const reqLevel = skillLevels[req.skill_level_required] || 2;

        if (techLevel >= reqLevel) {
          totalScore += 100; // Perfect match or overqualified
        } else {
          totalScore += Math.max(0, (techLevel / reqLevel) * 80); // Partial match
        }
      } else {
        totalScore += 0; // No skill match
      }
    }

    return totalRequirements > 0 ? totalScore / totalRequirements : 70;
  }

  /**
   * Calculate proximity score based on location (0-100)
   */
  async calculateProximityScore(technician, job) {
    if (!technician.latitude || !technician.longitude) {
      return 50; // Default score if location unknown
    }

    // Get job location from site
    const siteQuery = `
      SELECT latitude, longitude, address
      FROM sites s
      WHERE s.id = ?
    `;

    let jobLat; let
      jobLng;

    if (job.site_id) {
      const siteResult = await client.query(siteQuery, [job.site_id]);
      if (siteResult.rows.length > 0) {
        jobLat = siteResult.rows[0].latitude;
        jobLng = siteResult.rows[0].longitude;
      }
    }

    if (!jobLat || !jobLng) {
      return 60; // Default if job location unknown
    }

    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      technician.latitude,
      technician.longitude,
      jobLat,
      jobLng,
    );

    // Score based on distance (closer = higher score)
    if (distance <= 5) return 100; // Within 5 miles
    if (distance <= 10) return 90; // Within 10 miles
    if (distance <= 20) return 75; // Within 20 miles
    if (distance <= 50) return 50; // Within 50 miles
    return Math.max(0, 100 - distance); // Decreasing score for further distances
  }

  /**
   * Calculate availability score (0-100)
   */
  async calculateAvailabilityScore(technicianId, scheduledDate) {
    const dateStr = new Date(scheduledDate).toISOString().split('T')[0];

    // Check existing schedule conflicts
    const conflictQuery = `
      SELECT COUNT(*) as conflict_count
      FROM work_orders wo
      WHERE wo.assigned_to = ? 
        AND DATE(wo.scheduled_date) = ?
        AND wo.status IN ('scheduled', 'in_progress')
    `;

    const conflicts = await client.query(conflictQuery, [technicianId, dateStr]);
    const conflictCount = conflicts.rows[0]?.conflict_count || 0;

    // Score based on existing workload for the day
    if (conflictCount === 0) return 100;
    if (conflictCount === 1) return 80;
    if (conflictCount === 2) return 60;
    if (conflictCount === 3) return 40;
    return Math.max(0, 100 - (conflictCount * 20));
  }

  /**
   * Calculate workload balance score (0-100)
   */
  async calculateWorkloadScore(technicianId, scheduledDate) {
    const startOfWeek = new Date(scheduledDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const workloadQuery = `
      SELECT COUNT(*) as weekly_jobs
      FROM work_orders wo
      WHERE wo.assigned_to = ?
        AND wo.scheduled_date BETWEEN ? AND ?
        AND wo.status IN ('scheduled', 'in_progress', 'completed')
    `;

    const workload = await client.query(workloadQuery, [
      technicianId,
      startOfWeek.toISOString(),
      endOfWeek.toISOString(),
    ]);

    const weeklyJobs = workload.rows[0]?.weekly_jobs || 0;

    // Optimal workload is around 15-20 jobs per week
    if (weeklyJobs <= 15) return 100;
    if (weeklyJobs <= 20) return 90;
    if (weeklyJobs <= 25) return 70;
    if (weeklyJobs <= 30) return 50;
    return 30; // Overloaded
  }

  /**
   * Calculate performance score (0-100)
   */
  async calculatePerformanceScore(technicianId) {
    const performanceQuery = `
      SELECT 
        AVG(CASE WHEN metric_type = 'completion_rate' THEN metric_value END) as completion_rate,
        AVG(CASE WHEN metric_type = 'quality_score' THEN metric_value END) as quality_score,
        AVG(CASE WHEN metric_type = 'customer_satisfaction' THEN metric_value END) as satisfaction
      FROM technician_performance 
      WHERE user_id = ? 
        AND period_start >= date('now', '-3 months')
    `;

    const performance = await client.query(performanceQuery, [technicianId]);
    const metrics = performance.rows[0];

    if (!metrics || (!metrics.completion_rate && !metrics.quality_score && !metrics.satisfaction)) {
      return 75; // Default score for new technicians
    }

    const scores = [
      metrics.completion_rate || 75,
      metrics.quality_score || 75,
      metrics.satisfaction || 75,
    ];

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
              + Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2))
              * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate human-readable reasons for scoring
   */
  generateScoringReasons(scores, jobRequirements) {
    const reasons = [];

    if (scores.skillMatch >= 90) {
      reasons.push('Excellent skill match for job requirements');
    } else if (scores.skillMatch >= 70) {
      reasons.push('Good skill match with minor gaps');
    } else {
      reasons.push('Limited skill match - may need additional training');
    }

    if (scores.proximity >= 90) {
      reasons.push('Very close to job location');
    } else if (scores.proximity >= 70) {
      reasons.push('Reasonable travel distance');
    } else {
      reasons.push('Significant travel time required');
    }

    if (scores.availability >= 90) {
      reasons.push('Fully available on scheduled date');
    } else if (scores.availability >= 70) {
      reasons.push('Available with light existing schedule');
    } else {
      reasons.push('Limited availability due to existing commitments');
    }

    return reasons;
  }

  /**
   * Calculate confidence level in assignment
   */
  calculateConfidence(bestScore, alternatives) {
    if (alternatives.length === 0) return 'high';

    const secondBestScore = alternatives[0]?.assignmentScore || 0;
    const gap = bestScore - secondBestScore;

    if (gap >= 20) return 'high';
    if (gap >= 10) return 'medium';
    return 'low';
  }

  /**
   * Log assignment decision for analysis
   */
  async logAssignment(jobId, jobType, assignedTechnician, alternatives) {
    const logQuery = `
      INSERT INTO assignment_logs (
        job_id, job_type, assigned_to, algorithm_score, 
        factors_considered, alternative_assignments, assignment_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const factorsConsidered = JSON.stringify(assignedTechnician.scoreBreakdown);
    const alternativeAssignments = JSON.stringify(
      alternatives.map((alt) => ({
        id: alt.id,
        name: alt.name,
        score: alt.assignmentScore,
      })),
    );
    const assignmentReason = assignedTechnician.assignmentReasons.join('; ');

    await client.query(logQuery, [
      jobId,
      jobType,
      assignedTechnician.id,
      assignedTechnician.assignmentScore,
      factorsConsidered,
      alternativeAssignments,
      assignmentReason,
    ]);
  }

  /**
   * Auto-assign jobs based on smart algorithm
   */
  async autoAssignJobs(companyId, options = {}) {
    try {
      // Get unassigned jobs
      const unassignedJobs = await this.getUnassignedJobs(companyId);
      const assignments = [];

      for (const job of unassignedJobs) {
        const assignment = await this.findBestTechnician(
          job,
          job.job_type,
          companyId,
          options,
        );

        if (assignment.success && assignment.technician) {
          // Update the job with assignment
          await this.assignJob(job.id, job.job_type, assignment.technician.id);
          assignments.push({
            job,
            technician: assignment.technician,
            confidence: assignment.confidence,
          });
        }
      }

      return {
        success: true,
        assignments,
        totalProcessed: unassignedJobs.length,
        successfulAssignments: assignments.length,
      };
    } catch (error) {
      console.error('Auto-assignment error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get unassigned jobs that need technician assignment
   */
  async getUnassignedJobs(companyId) {
    const query = `
      SELECT 
        wo.id,
        'work_order' as job_type,
        wo.site_id,
        wo.scheduled_date,
        wo.priority,
        wo.description,
        s.latitude,
        s.longitude
      FROM work_orders wo
      JOIN sites s ON wo.site_id = s.id
      WHERE wo.company_id = ? 
        AND wo.assigned_to IS NULL
        AND wo.status = 'scheduled'
        AND wo.scheduled_date >= date('now')
      
      UNION ALL
      
      SELECT 
        i.id,
        'inspection' as job_type,
        i.site_id,
        i.scheduled_date,
        1 as priority,
        'Inspection' as description,
        s.latitude,
        s.longitude
      FROM inspections i
      JOIN sites s ON i.site_id = s.id
      WHERE i.company_id = ?
        AND i.assigned_to IS NULL
        AND i.scheduled_date IS NOT NULL
        AND i.scheduled_date >= date('now')
      
      ORDER BY scheduled_date ASC, priority DESC
    `;

    const result = await client.query(query, [companyId, companyId]);
    return result.rows;
  }

  /**
   * Assign a job to a technician
   */
  async assignJob(jobId, jobType, technicianId) {
    const table = jobType === 'work_order' ? 'work_orders' : 'inspections';
    const query = `UPDATE ${table} SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    await client.query(query, [technicianId, jobId]);
  }
}

module.exports = new SmartAssignmentService();
