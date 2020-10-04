const express = require('express');
const {
    check,
    body
} = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// admin/add-product
router.get('/add-product', isAuth, adminController.getAddProduct);
router.post('/add-product', [
    body('title', 'Title must be valid.').isString().isLength({
        min: 3
    }).trim(),
    body('price', 'Price must be number.').isFloat().trim(),
    body('description', 'Description must be minimum 10 and maximum 450 characters.').isLength({
        min: 10,
        max: 450
    }).trim()
], isAuth, adminController.postAddProduct);
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);
router.post('/edit-product', [
    body('title', 'Title must be valid.').isString().isLength({
        min: 3
    }).trim(),
    body('price', 'Price must be number.').isFloat().trim(),
    body('description', 'Description must be minimum 10 and maximum 450 characters.').isLength({
        min: 10,
        max: 450
    }).trim()
], isAuth, adminController.postEditProduct);
router.post('/delete-product', isAuth, adminController.postDeleteProduct);
router.get('/table-product', isAuth, adminController.getTableProduct);

module.exports = router;