const express = require('express');
const {
    check,
    body
} = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);
router.post('/login', [
    body('email')
    .isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('password', 'Password has to be valid.')
    .isLength({
        min: 6,
        max: 20
    }).trim()
], authController.postLogin);
router.get('/logout', authController.postLogout);
router.get('/signup', authController.getSignup);
router.post('/signup', [
    check('email')
    .isEmail().withMessage('Please enter valid email.')
    .custom((value, {
        req
    }) => {
        return User.findOne({
                email: value
            })
            .then(existingUser => {
                if (existingUser) {
                    return Promise.reject('This email exists already, please pick a different one.');
                }
            });
    }).normalizeEmail(),
    body('password', 'Please enter a password with only numbers and text and at least 6 characters.')
    .isLength({
        min: 6,
        max: 20
    }).trim(),
    body('confirmPassword')
    .custom((value, {
        req
    }) => {
        if (value !== req.body.password) {
            throw new Error('Password have to match.');
        }
        return true;
    })
], authController.postSignup);
router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);
router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);

module.exports = router;