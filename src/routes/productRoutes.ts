import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';

const router = Router();

// Product routes
router.get('/catalog/products', getProducts);
router.get('/catalog/products/:id', getProductById);
router.post('/catalog/products', createProduct);
router.put('/catalog/products/:id', updateProduct);
router.delete('/catalog/products/:id', deleteProduct);

export default router;