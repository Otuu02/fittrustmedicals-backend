import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail,
} from '../controllers/userController';

const router = Router();

// GET /api/users - Get all users
router.get('/users', getAllUsers);

// GET /api/users/email?email=xxx - Get user by email
router.get('/users/email', getUserByEmail);

// POST /api/users - Create new user
router.post('/users', createUser);

// PUT /api/users - Update user
router.put('/users', updateUser);

// DELETE /api/users/:id - Delete user
router.delete('/users/:id', deleteUser);

export default router;