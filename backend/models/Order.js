const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true
    },

    address: {
      type: String,
      required: true
    },
    
    mobile: {
  type: String
},

city: {
  type: String
},


pincode: {
  type: String
},

    items: [
      {
        name: String,
        price: Number,
        quantity: Number,
        image: String
      }
    ],

    total: {
      type: Number,
      required: true
    },

    paymentMethod: {
  type: String,
  enum: ["COD", "Online"],
  default: "COD"
},

paymentStatus: {
  type: String,
  enum: ["Pending", "Paid"],
  default: "Pending"
},
    
    status: {
  type: String,
  enum: [
    "Placed",
    "Confirmed",
    "Preparing",
    "Out for Delivery",
    "Delivered",
    "Cancelled"
  ],
  default: "Placed"
}
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", orderSchema);
