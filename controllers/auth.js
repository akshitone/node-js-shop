const encrypt = require('bcryptjs');
const crypto = require('crypto');
const {
    validationResult
} = require('express-validator');

const User = require("../models/user");

exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        pageTitle: 'Login',
        errorMessage: null,
        successMessage: req.flash('password_change')[0],
        oldInput: {
            email: null,
            password: null
        },
        validationErrors: []
    });
}

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            successMessage: null,
            validationErrors: errors.array()
        });
    }

    User.findOne({
            email: email
        })
        .then(user => {
            if (!user) {
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessage: 'Invalid email address.',
                    oldInput: {
                        email: email,
                        password: password
                    },
                    successMessage: null,
                    validationErrors: []
                });
            }
            encrypt
                .compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect('/');
                        });
                    }
                    return res.status(422).render('auth/login', {
                        path: '/login',
                        pageTitle: 'Login',
                        errorMessage: 'Wrong password.',
                        oldInput: {
                            email: email,
                            password: password
                        },
                        successMessage: null,
                        validationErrors: []
                    });
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login');
                });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });

}

exports.postLogout = (req, res, next) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
}

exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
        pageTitle: 'Sign up',
        errorMessage: null,
        oldInput: {
            email: "",
            password: "",
            confirmPassword: ""
        },
        validationErrors: []
    });
}

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/signup', {
            pageTitle: 'Sign up',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword
            },
            validationErrors: errors.array()
        });
    }
    encrypt.hash(password, 12)
        .then(encryptPassword => {
            const user = new User({
                email: email,
                password: encryptPassword,
                cart: {
                    items: []
                }
            });
            return user.save();
        })
        .then(result => {
            res.redirect('/login');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.getReset = (req, res, next) => {
    res.render('auth/reset', {
        pageTitle: 'Reset Password',
        errorMessage: req.flash('email_not_exist')[0]
    });
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({
                email: req.body.email
            })
            .then(user => {
                if (!user) {
                    req.flash('email_not_exist', 'No account with that email found.');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                return res.redirect('/reset/' + token);
            })
            .catch(err => {
                res.redirect('/500');
            });
    });
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
            resetToken: token,
            resetTokenExpiration: {
                $gt: Date.now()
            }
        })
        .then(user => {
            res.render('auth/new-password', {
                pageTitle: 'New Password',
                errorMessage: req.flash('email_not_exist')[0],
                userId: user._id.toString(),
                passwordToken: token
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.postNewPassword = (req, res, next) => {
    const password = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({
            _id: userId,
            resetToken: passwordToken,
            resetTokenExpiration: {
                $gt: Date.now()
            }
        })
        .then(user => {
            resetUser = user;
            return encrypt.hash(password, 12);
        })
        .then(encryptPassword => {
            resetUser.password = encryptPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save();
        })
        .then(result => {
            req.flash('password_change', 'Your password has been chaged successfully.')
            res.redirect('/login');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}