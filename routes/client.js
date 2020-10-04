const express = require('express');

const clientController = require('../controllers/client');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/', clientController.getIndex);
router.get('/products', clientController.getProducts);
router.get('/products/:productId', clientController.getProduct);
router.get('/cart', isAuth, clientController.getCart);
router.post('/cart', isAuth, clientController.postCart);
router.post('/cart-delete-item', isAuth, clientController.postCartDeleteProduct);
router.get('/order', isAuth, clientController.getOrder);
// router.post('/create-order', isAuth, clientController.postOrder);
router.get('/order/:orderId', isAuth, clientController.getInvoice);
router.get('/checkout', isAuth, clientController.getCheckout);
router.get('/checkout/success', isAuth, clientController.postOrder);
router.get('/checkout/cancel', isAuth, clientController.getCheckout);

module.exports = router;