const axios = require('axios');
const db = require('../database/sqlite');

class RouteOptimizationService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.maxWaypoints = 23; // Google Maps API limit for optimization
    this.defaultBufferMinutes = 15; // Buffer time between jobs
  }

  /**
   * Optimize routes for a technician's daily schedule
   * Uses Google Maps Distance Matrix and Directions API
   */
  async optimizeRouteForTechnician(technicianId, date, options = {}) {
    try {
      // Get scheduled jobs for the technician on the date
      const jobs = await this.getTechnicianJobsForDate(technicianId, date);

      if (jobs.length <= 1) {
        return {
          success: true,
          message: 'No optimization needed for single or zero jobs',
          optimizedRoute: jobs,
          totalDistance: 0,
          totalTime: 0,
          savings: null,
        };
      }

      // Get technician's starting location (home base or last known location)
      const startLocation = await this.getTechnicianStartLocation(technicianId);

      // Create waypoints from job locations
      const waypoints = await this.createWaypointsFromJobs(jobs);

      // Get optimized route from Google Maps
      const optimizedRoute = await this.getOptimizedRoute(startLocation, waypoints, options);

      // Apply the optimized order to jobs
      const reorderedJobs = this.reorderJobsByOptimizedRoute(jobs, optimizedRoute);

      // Calculate time estimates and update job schedule
      const scheduledJobs = await this.calculateJobSchedule(reorderedJobs, startLocation, options);

      // Save the optimization results
      await this.saveRouteOptimization(technicianId, date, scheduledJobs, optimizedRoute);

      // Compare with original route for savings calculation
      const originalRoute = await this.calculateOriginalRouteTotals(jobs, startLocation);
      const savings = {
        distanceSaved: originalRoute.totalDistance - optimizedRoute.totalDistance,
        timeSaved: originalRoute.totalTime - optimizedRoute.totalTime,
        percentageSaved: ((originalRoute.totalTime - optimizedRoute.totalTime) / originalRoute.totalTime) * 100,
      };

      return {
        success: true,
        optimizedRoute: scheduledJobs,
        totalDistance: optimizedRoute.totalDistance,
        totalTime: optimizedRoute.totalTime,
        savings,
        waypoints: waypoints.length,
      };
    } catch (error) {
      console.error('Route optimization error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get technician's jobs for a specific date
   */
  async getTechnicianJobsForDate(technicianId, date) {
    const dateStr = new Date(date).toISOString().split('T')[0];

    const query = `
      SELECT 
        wo.id,
        'work_order' as job_type,
        wo.scheduled_start,
        wo.scheduled_end,
        wo.estimated_duration,
        wo.priority,
        wo.instructions,
        s.address_json,
        s.latitude,
        s.longitude,
        s.nickname as site_name,
        c.name as client_name
      FROM work_orders wo
      JOIN sites s ON wo.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE wo.assigned_tech_id = ?
        AND DATE(wo.scheduled_start) = ?
        AND wo.status IN ('scheduled', 'in_progress')
      
      UNION ALL
      
      SELECT 
        i.id,
        'inspection' as job_type,
        i.scheduled_at as scheduled_start,
        NULL as scheduled_end,
        60 as estimated_duration, -- Default 1 hour for inspections
        1 as priority,
        i.notes as instructions,
        s.address_json,
        s.latitude,
        s.longitude,
        s.nickname as site_name,
        c.name as client_name
      FROM inspections i
      JOIN sites s ON i.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE i.tech_id = ?
        AND DATE(i.scheduled_at) = ?
        AND i.submitted_at IS NULL
      
      ORDER BY priority DESC, scheduled_start ASC
    `;

    return db.all(query, [technicianId, dateStr, technicianId, dateStr]);
  }

  /**
   * Get technician's starting location (home base or depot)
   */
  async getTechnicianStartLocation(technicianId) {
    // Try to get home base from user profile
    let startLocation = await db.get(`
      SELECT home_latitude as latitude, home_longitude as longitude, home_address as address
      FROM users 
      WHERE id = ?
    `, [technicianId]);

    // Fallback to company address
    if (!startLocation || !startLocation.latitude) {
      startLocation = await db.get(`
        SELECT c.address_json
        FROM users u
        JOIN companies c ON u.company_id = c.id
        WHERE u.id = ?
      `, [technicianId]);

      if (startLocation?.address_json) {
        const address = JSON.parse(startLocation.address_json);
        startLocation = {
          latitude: address.latitude,
          longitude: address.longitude,
          address: address.formatted_address,
        };
      }
    }

    // Ultimate fallback to last known location
    if (!startLocation || !startLocation.latitude) {
      startLocation = await db.get(`
        SELECT latitude, longitude, 'Last Known Location' as address
        FROM technician_locations
        WHERE user_id = ? AND is_active = 1
        ORDER BY recorded_at DESC
        LIMIT 1
      `, [technicianId]);
    }

    return startLocation || {
      latitude: 39.8283, // Default to Denver, CO
      longitude: -98.5795,
      address: 'Default Location',
    };
  }

  /**
   * Create waypoints array for Google Maps API
   */
  async createWaypointsFromJobs(jobs) {
    return jobs.map((job) => ({
      location: {
        lat: parseFloat(job.latitude),
        lng: parseFloat(job.longitude),
      },
      jobId: job.id,
      jobType: job.job_type,
      address: job.address_json ? JSON.parse(job.address_json).formatted_address : 'Unknown Address',
      priority: job.priority || 1,
      estimatedDuration: job.estimated_duration || 60,
    }));
  }

  /**
   * Get optimized route from Google Maps Directions API
   */
  async getOptimizedRoute(startLocation, waypoints, options = {}) {
    if (!this.googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const origin = `${startLocation.latitude},${startLocation.longitude}`;
    const destination = options.returnToStart ? origin : waypoints[waypoints.length - 1].location;

    // Prepare waypoints for Google Maps API
    const waypointStrings = waypoints.slice(0, -1).map((wp) => `${wp.location.lat},${wp.location.lng}`).join('|');

    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = {
      origin,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: `optimize:true|${waypointStrings}`,
      key: this.googleMapsApiKey,
      units: 'imperial',
      mode: 'driving',
      departure_time: 'now',
      traffic_model: 'best_guess',
    };

    const response = await axios.get(url, { params });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const optimizedOrder = route.waypoint_order;

    // Reorder waypoints according to optimization
    const optimizedWaypoints = optimizedOrder.map((index) => waypoints[index]);

    return {
      optimizedWaypoints,
      totalDistance: this.parseDistance(route.legs.reduce((sum, leg) => sum + leg.distance.value, 0)),
      totalTime: this.parseTime(route.legs.reduce((sum, leg) => sum + leg.duration.value, 0)),
      polyline: route.overview_polyline.points,
      legs: route.legs,
    };
  }

  /**
   * Reorder jobs based on optimized route
   */
  reorderJobsByOptimizedRoute(originalJobs, optimizedRoute) {
    const jobMap = new Map(originalJobs.map((job) => [`${job.id}-${job.job_type}`, job]));

    return optimizedRoute.optimizedWaypoints.map((waypoint) => {
      const jobKey = `${waypoint.jobId}-${waypoint.jobType}`;
      return jobMap.get(jobKey);
    }).filter(Boolean);
  }

  /**
   * Calculate job schedule with travel times and buffer periods
   */
  async calculateJobSchedule(jobs, startLocation, options = {}) {
    const bufferMinutes = options.bufferMinutes || this.defaultBufferMinutes;
    const startTime = new Date();
    startTime.setHours(8, 0, 0, 0); // Default 8 AM start

    let currentTime = new Date(startTime);
    let currentLocation = startLocation;

    const scheduledJobs = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const jobLocation = {
        latitude: job.latitude,
        longitude: job.longitude,
      };

      // Calculate travel time to this job
      const travelTime = await this.calculateTravelTime(currentLocation, jobLocation);

      // Add travel time to current time
      currentTime.setMinutes(currentTime.getMinutes() + travelTime);

      // Set job start time
      const jobStartTime = new Date(currentTime);
      const jobEndTime = new Date(currentTime);
      jobEndTime.setMinutes(jobEndTime.getMinutes() + (job.estimated_duration || 60));

      scheduledJobs.push({
        ...job,
        optimized_start_time: jobStartTime,
        optimized_end_time: jobEndTime,
        travel_time_minutes: travelTime,
        sequence_order: i + 1,
      });

      // Update current time and location
      currentTime = new Date(jobEndTime);
      currentTime.setMinutes(currentTime.getMinutes() + bufferMinutes); // Add buffer
      currentLocation = jobLocation;
    }

    return scheduledJobs;
  }

  /**
   * Calculate travel time between two locations
   */
  async calculateTravelTime(fromLocation, toLocation) {
    if (!this.googleMapsApiKey) {
      // Fallback to straight-line distance calculation
      const distance = this.calculateDistance(
        fromLocation.latitude,
        fromLocation.longitude,
        toLocation.latitude,
        toLocation.longitude,
      );
      return Math.ceil(distance / 30 * 60); // Assume 30 MPH average
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: `${fromLocation.latitude},${fromLocation.longitude}`,
          destinations: `${toLocation.latitude},${toLocation.longitude}`,
          key: this.googleMapsApiKey,
          units: 'imperial',
          mode: 'driving',
          departure_time: 'now',
          traffic_model: 'best_guess',
        },
      });

      if (response.data.status === 'OK'
          && response.data.rows[0].elements[0].status === 'OK') {
        return Math.ceil(response.data.rows[0].elements[0].duration.value / 60);
      }
    } catch (error) {
      console.error('Error calculating travel time:', error);
    }

    // Fallback calculation
    const distance = this.calculateDistance(
      fromLocation.latitude,
      fromLocation.longitude,
      toLocation.latitude,
      toLocation.longitude,
    );
    return Math.ceil(distance / 30 * 60);
  }

  /**
   * Calculate straight-line distance using Haversine formula
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
   * Save route optimization results to database
   */
  async saveRouteOptimization(technicianId, date, scheduledJobs, routeData) {
    const optimization = {
      technician_id: technicianId,
      date: new Date(date).toISOString().split('T')[0],
      waypoints: JSON.stringify(routeData.optimizedWaypoints),
      total_distance_miles: routeData.totalDistance,
      total_time_minutes: routeData.totalTime,
      polyline: routeData.polyline,
      job_sequence: JSON.stringify(scheduledJobs.map((job) => ({
        id: job.id,
        type: job.job_type,
        start_time: job.optimized_start_time,
        end_time: job.optimized_end_time,
        travel_time: job.travel_time_minutes,
      }))),
    };

    await db.run(`
      INSERT OR REPLACE INTO route_optimizations (
        id, technician_id, date, waypoints, total_distance_miles, 
        total_time_minutes, polyline, job_sequence, created_at
      ) VALUES (
        (SELECT id FROM route_optimizations WHERE technician_id = ? AND date = ?),
        ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `, [
      technicianId, optimization.date,
      optimization.technician_id,
      optimization.date,
      optimization.waypoints,
      optimization.total_distance_miles,
      optimization.total_time_minutes,
      optimization.polyline,
      optimization.job_sequence,
    ]);

    // Update individual jobs with optimized schedule
    for (const job of scheduledJobs) {
      const table = job.job_type === 'work_order' ? 'work_orders' : 'inspections';
      const timeField = job.job_type === 'work_order' ? 'scheduled_start' : 'scheduled_at';

      await db.run(`
        UPDATE ${table} 
        SET ${timeField} = ?, 
            travel_time_minutes = ?,
            sequence_order = ?
        WHERE id = ?
      `, [
        job.optimized_start_time.toISOString(),
        job.travel_time_minutes,
        job.sequence_order,
        job.id,
      ]);
    }
  }

  /**
   * Calculate original route totals for comparison
   */
  async calculateOriginalRouteTotals(jobs, startLocation) {
    let totalDistance = 0;
    let totalTime = 0;
    let currentLocation = startLocation;

    for (const job of jobs) {
      const jobLocation = {
        latitude: job.latitude,
        longitude: job.longitude,
      };

      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        jobLocation.latitude,
        jobLocation.longitude,
      );

      totalDistance += distance;
      totalTime += Math.ceil(distance / 30 * 60); // Travel time
      totalTime += job.estimated_duration || 60; // Job time

      currentLocation = jobLocation;
    }

    return { totalDistance, totalTime };
  }

  /**
   * Optimize routes for multiple technicians
   */
  async optimizeMultipleTechnicianRoutes(companyId, date, options = {}) {
    try {
      // Get all technicians with jobs on the date
      const techniciansWithJobs = await db.all(`
        SELECT DISTINCT wo.assigned_tech_id as technician_id, u.full_name
        FROM work_orders wo
        JOIN users u ON wo.assigned_tech_id = u.id
        WHERE wo.company_id = ? 
          AND DATE(wo.scheduled_start) = ?
          AND wo.status IN ('scheduled', 'in_progress')
          AND wo.assigned_tech_id IS NOT NULL
        
        UNION
        
        SELECT DISTINCT i.tech_id as technician_id, u.full_name
        FROM inspections i
        JOIN users u ON i.tech_id = u.id
        WHERE i.company_id = ?
          AND DATE(i.scheduled_at) = ?
          AND i.submitted_at IS NULL
          AND i.tech_id IS NOT NULL
      `, [companyId, date, companyId, date]);

      const optimizations = [];

      for (const tech of techniciansWithJobs) {
        const optimization = await this.optimizeRouteForTechnician(
          tech.technician_id,
          date,
          options,
        );

        optimizations.push({
          technicianId: tech.technician_id,
          technicianName: tech.full_name,
          optimization,
        });
      }

      return {
        success: true,
        date,
        optimizations,
        totalTechnicians: techniciansWithJobs.length,
        successfulOptimizations: optimizations.filter((opt) => opt.optimization.success).length,
      };
    } catch (error) {
      console.error('Multi-technician optimization error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Helper functions for parsing Google Maps response
   */
  parseDistance(meters) {
    return Math.round(meters * 0.000621371 * 100) / 100; // Convert to miles
  }

  parseTime(seconds) {
    return Math.ceil(seconds / 60); // Convert to minutes
  }

  /**
   * Get optimized route for display
   */
  async getOptimizedRoute(technicianId, date) {
    return db.get(`
      SELECT * FROM route_optimizations
      WHERE technician_id = ? AND date = ?
    `, [technicianId, date]);
  }

  /**
   * Emergency re-routing when jobs are added/cancelled
   */
  async reoptimizeAfterChange(technicianId, date, changeType = 'job_added') {
    console.log(`Re-optimizing route for technician ${technicianId} due to ${changeType}`);

    // Re-run optimization
    return this.optimizeRouteForTechnician(technicianId, date, {
      priority: 'high',
      reason: changeType,
    });
  }
}

module.exports = new RouteOptimizationService();
