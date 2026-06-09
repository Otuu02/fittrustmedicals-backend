import { Router } from 'express';
import {
  getAllStaff,
  getStaffPerformance,
  getTopPerformingStaff,
  getStaffById,
  getStaffPerformanceById,
  createStaff,
  updateStaffStatus,
  deleteStaff,
} from '../controllers/staffController';

const router = Router();

// ============================================
// STAFF MANAGEMENT ROUTES
// ============================================

// Get all staff members
router.get('/staff', getAllStaff);

// Create new staff
router.post('/staff', createStaff);

// Get staff by ID
router.get('/staff/:id', getStaffById);

// Update staff status (active/inactive)
router.patch('/staff/:id/status', updateStaffStatus);

// Delete staff
router.delete('/staff/:id', deleteStaff);

// ============================================
// STAFF PERFORMANCE ROUTES
// ============================================

// Get all staff performance metrics
router.get('/staff/performance', getStaffPerformance);

// Get top performing staff
router.get('/staff/top-performing', getTopPerformingStaff);

// Get performance for specific staff member
router.get('/staff/:staffId/performance', getStaffPerformanceById);

export default router;