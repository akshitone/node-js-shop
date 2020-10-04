const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const stripe = require('stripe')('sk_test_51HXo7MEL67pgdskB9lO2497PBMjor1ZTx9awty04OCVb2ZMrcicfcA3CscKWska94NaedUqk58cZM1Dg62D9Ab2b00wQ8bfCm9');

const Product = require('../models/product');
const Order = require('../models/order');
const {
    get
} = require('http');

const PRODUCTS_PER_PAGE = 6;

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalProducts;

    Product.find().countDocuments()
        .then(numProducts => {
            totalProducts = numProducts;
            return Product.find()
                .skip((page - 1) * PRODUCTS_PER_PAGE)
                .limit(PRODUCTS_PER_PAGE);
        })
        .then(products => {
            res.render('client/index', {
                products: products,
                pageTitle: 'Home',
                path: '/',
                currentPage: page,
                totalProducts: totalProducts,
                hasNextPage: PRODUCTS_PER_PAGE * page < totalProducts,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalProducts / PRODUCTS_PER_PAGE)
            }); //, hasProducts: products.length > 0, homeActive: true
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalProducts;

    Product.find().countDocuments()
        .then(numProducts => {
            totalProducts = numProducts;
            return Product.find()
                .skip((page - 1) * PRODUCTS_PER_PAGE)
                .limit(PRODUCTS_PER_PAGE);
        })
        .then(products => {
            res.render('client/product-list', {
                products: products,
                pageTitle: 'Products',
                path: '/products',
                currentPage: page,
                totalProducts: totalProducts,
                hasNextPage: PRODUCTS_PER_PAGE * page < totalProducts,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalProducts / PRODUCTS_PER_PAGE)
            }); //, hasProducts: products.length > 0, homeActive: true
        }).catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.getProduct = (req, res, next) => {
    const id = req.params.productId;
    Product.findById(id)
        .then(product => {
            res.render('client/product-details', {
                product: product,
                pageTitle: product.title,
                path: '/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items;
            res.render('client/cart', {
                path: '/cart',
                pageTitle: 'Cart',
                products: products,
                successMessage: req.flash('product_added_to_cart')[0],
                errorMessage: req.flash('product_deleted_to_cart')[0]
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.postCart = (req, res, next) => {
    const id = req.body.productid;
    Product.findById(id)
        .then(product => {
            req.flash('product_added_to_cart', 'Your product has been added in cart successfully.');
            return req.user.addToCart(product);
        })
        .then(result => {
            res.redirect('/cart');
        });
}

exports.postCartDeleteProduct = (req, res, next) => {
    const id = req.body.productid;
    req.user.deleteCartItem(id)
        .then(result => {
            req.flash('product_deleted_to_cart', 'Your product has been deleted from cart successfully.');
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.postOrder = (req, res, next) => { //getCheckoutSuccess
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return {
                    qty: i.qty,
                    product: {
                        ...i.productId._doc
                    }
                }
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/order');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.getOrder = (req, res, next) => {
    Order.find({
            "user.userId": req.user
        })
        .then(orders => {
            res.render('client/order', {
                path: '/order',
                pageTitle: 'Orders',
                orders: orders
            });
        });
}

exports.getInvoice = (req, res, next) => {
    const id = req.params.orderId;
    Order.findById(id)
        .then(order => {
            if (!order) {
                return next(new Error('No order found.'));
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                return next(new Error('Unauthorized user.'));
            }
            const invoiceName = 'invoice-' + id + '.pdf';
            const invoicePath = path.join('invoices', invoiceName);
            const pdfDoc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);
            pdfDoc.text('Hello, I am Akshit Mithaiwala.');
            pdfDoc.end();
        })
        .catch(err => next(err));
}

exports.getCheckout = (req, res, next) => {
    let products;
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            products = user.cart.items;

            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map(p => {
                    return {
                        name: p.productId.title,
                        description: p.productId.description,
                        amount: p.productId.price * 100,
                        currency: 'inr',
                        quantity: p.qty
                    };
                }),
                success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
            });
        })
        .then(session => {
            res.render('client/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                sessionId: session.id
            });

        })
        .catch(err => {
            console.log(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}