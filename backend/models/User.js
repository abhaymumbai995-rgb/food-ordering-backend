const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },
    mobile: {
  type: String,
  default: ""
},

address: {
  type: String,
  default: ""
},

city: {
  type: String,
  default: ""
},

pincode: {
  type: String,
  default: ""
},

    role: {
  type: String,
  enum: ["user", "admin", "deliveryPartner"],
  default: "user"
}
    
  },
  
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
