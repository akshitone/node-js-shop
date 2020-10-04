const {
    validationResult
} = require('express-validator');
const Product = require('../models/product');
const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
    res.render('admin/add-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        successMessage: req.flash('product_added')[0],
        errorMessage: null,
        validationErrors: []
    }); //, productActive: true 
}

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageurl = req.file;
    const price = req.body.price;
    const description = req.body.description;

    if (!imageurl) {
        return res.render('admin/add-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'Attached file is not an image.',
            successMessage: null,
            validationErrors: []
        });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('admin/add-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                imageurl: imageurl,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            successMessage: null,
            validationErrors: errors.array()
        });
    }

    const imagePath = imageurl.path;
    const product = new Product({
        title: title,
        price: price,
        imageurl: imagePath,
        description: description,
        userId: req.user
    });
    product.save()
        .then(result => {
            req.flash('product_added', 'Your product has been added successfully.');
            res.redirect('/admin/add-product');
        })
        .catch(err => {
            console.log(err);
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }
    const id = req.params.productId;
    Product.findById(id)
        .then(product => {
            if (!product) {
                res.redirect('/');
            }
            res.render('admin/add-product', {
                pageTitle: 'Edit Product',
                path: '/admin/table-product',
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: null,
                successMessage: null,
                validationErrors: []
            }); //, productActive: true 
        });
}

exports.postEditProduct = (req, res, next) => {
    const id = req.body.productid;
    const title = req.body.title;
    const imageurl = req.file;
    const price = req.body.price;
    const description = req.body.description;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('admin/add-product', {
            pageTitle: 'Edit Product',
            path: '/admin/add-product',
            editing: true,
            hasError: true,
            product: {
                _id: id,
                title: title,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            successMessage: null,
            validationErrors: errors.array()
        });
    }
    Product.findById(id)
        .then(product => {
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }
            product.title = title;
            product.price = price;
            if (imageurl) {
                fileHelper.deleteFile(product.imageurl);
                product.imageurl = imageurl.path;
            }
            product.description = description;
            return product.save()
                .then(result => {
                    req.flash('product_edited', 'Your product has been updated successfully.')
                    res.redirect('/admin/table-product');
                });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}

exports.postDeleteProduct = (req, res, next) => {
    const id = req.body.productid;
    Product.findById(id)
        .then(product => {
            if (!product) {
                return next(new Error('Product not found'));
            }
            fileHelper.deleteFile(product.imageurl);
            return Product.deleteOne({
                _id: id,
                userId: req.user._id
            });
        })
        .then(() => {
            console.log('Deleted');
            req.flash('product_deleted', 'Your product has been deleted successfully.');
            res.redirect('/admin/table-product');
        })
        .catch(err => next(err));
}

exports.getTableProduct = (req, res, next) => {
    Product.find({
            userId: req.user._id
        })
        // .select('title price imageurl') - Only this fields are retrive
        // .populate('userId')
        .then(products => {
            res.render('admin/table-product', {
                products: products,
                pageTitle: 'Products',
                path: '/admin/table-product',
                successMessage: req.flash('product_edited')[0],
                deleteMessage: req.flash('product_deleted')[0]
            }); //, hasProducts: products.length > 0, homeActive: true
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(500);
        });
}