import { Router } from 'express';
import {
  getStaffPerformance,
  getTopPerformingStaff,
  getStaffPerformanceById,
} from '../controllers/staffController';

const router = Router();

// Staff performance routes
router.get('/staff/performance', getStaffPerformance);
router.get('/staff/top-performers', getTopPerformingStaff);
router.get('/staff/:staffId/performance', getStaffPerformanceById);

export default router;