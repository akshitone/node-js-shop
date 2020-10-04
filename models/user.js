const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        items: [{
            productId: {
                type: Schema.Types.ObjectId,
                required: true,
                ref: 'Product'
            },
            qty: {
                type: Number,
                required: true
            }
        }]
    }
});

userSchema.methods.addToCart = function (product) {
    const cartProductIndex = this.cart.items.findIndex(cp => {
        return cp.productId.toString() === product._id.toString();
    });
    let newQty = 1;
    const updatedCartItems = [...this.cart.items];
    if (cartProductIndex >= 0) {
        newQty = this.cart.items[cartProductIndex].qty + 1;
        updatedCartItems[cartProductIndex].qty = newQty;
    } else {
        updatedCartItems.push({
            productId: product._id,
            qty: newQty
        });
    }
    const updatedCart = {
        items: updatedCartItems
    };
    this.cart = updatedCart;
    return this.save();
}

userSchema.methods.deleteCartItem = function (id) {
    const updatedCartItems = this.cart.items.filter(item => {
        return item.productId.toString() !== id.toString();
    });
    this.cart.items = updatedCartItems;
    return this.save();
}

userSchema.methods.clearCart = function () {
    this.cart = {
        items: []
    };
    return this.save();
}

module.exports = mongoose.model('User', userSchema);