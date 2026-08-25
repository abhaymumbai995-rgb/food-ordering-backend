require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Food = require("./models/Food");
const User = require("./models/User");
const Order = require("./models/Order");
const app = express();

app.use(cors());
app.use(express.json());
// ==================== USER AUTH ====================

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}


// ==================== ADMIN AUTH ====================

function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required"
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}
// ==================== DELIVERY PARTNER AUTH ====================

function verifyDelivery(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (decoded.role !== "delivery") {
      return res.status(403).json({
        message: "Delivery Partner access required"
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Atlas connected!");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error.message);
  });

app.get("/", (req, res) => {
  res.send("Food Ordering Backend is running!");
});

// ==================== FOOD API ====================

// Add Food
app.post("/api/foods", verifyAdmin, async (req, res) => {
  try {
    const food = new Food(req.body);
    const savedFood = await food.save();

    res.status(201).json(savedFood);
  } catch (error) {
    res.status(500).json({
      message: "Failed to add food",
      error: error.message
    });
  }
});

// ==================== EDIT FOOD ====================

app.put("/api/foods/:id", verifyAdmin, async (req, res) => {
  try {
    const { name, price, category, image } = req.body;

    const food = await Food.findByIdAndUpdate(
      req.params.id,
      {
        name,
        price,
        category,
        image
      },
      { new: true }
    );

    if (!food) {
      return res.status(404).json({
        message: "Food not found"
      });
    }

    res.json({
      message: "Food updated successfully",
      food
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update food",
      error: error.message
    });
  }
});


// ==================== DELETE FOOD ====================

app.delete("/api/foods/:id", verifyAdmin, async (req, res) => {
  try {

    const food = await Food.findByIdAndDelete(req.params.id);

    if (!food) {
      return res.status(404).json({
        message: "Food not found"
      });
    }

    res.json({
      message: "Food deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete food",
      error: error.message
    });
  }
});


// Get Foods
  // Get Foods
app.get("/api/foods", async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get foods",
      error: error.message
    });
  }
});
// ==================== ADMIN DASHBOARD ====================

app.get("/api/admin/dashboard", verifyAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();

    const totalFoods = await Food.countDocuments();

    const placedOrders = await Order.countDocuments({
      status: "Placed"
    });

    const preparingOrders = await Order.countDocuments({
      status: "Preparing"
    });

    const deliveredOrders = await Order.countDocuments({
      status: "Delivered"
    });

    const orders = await Order.find();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    res.json({
      totalOrders,
      totalFoods,
      placedOrders,
      preparingOrders,
      deliveredOrders,
      totalRevenue
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to load dashboard",
      error: error.message
    });
  }
});

// ==================== DELIVERY PARTNER - GET ORDERS ====================

app.get("/api/delivery/orders", verifyDelivery, async (req, res) => {
  try {
      const orders = await Order.find({
  status: {
    $in: ["Preparing", "Out for Delivery"]
  }
}).sort({
      createdAt: -1
    });

    res.json(orders);

  } catch (error) {
    res.status(500).json({
      message: "Failed to get delivery orders",
      error: error.message
    });
  }
});

// ==================== REGISTER ====================

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    // Password hash
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: "Registration successful"
    });

  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message
    });
  }
});
app.post("/api/orders", verifyToken, async (req, res) => {

  try {
      
const {
  customerName,
  email,
  mobile,
  address,
  city,
  pincode,
  paymentMethod,
  items,
  total
} = req.body;
    
    if (
  !customerName ||
  !email ||
  !mobile ||
  !address ||
  !city ||
  !pincode ||
  !paymentMethod ||
  !items ||
  items.length === 0 ||
  total === undefined
)
    {
      return res.status(400).json({
        message: "All order details are required"
      });
    }

    const order = new Order({
  customerName,
  email,
  mobile,
  address,
  city,
  pincode,
  paymentMethod,
  items,
  total
});

    const savedOrder = await order.save();

    res.status(201).json({
      message: "Order placed successfully",
      order: savedOrder
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to place order",
      error: error.message
    });
  }
});


// 👇 इसके ठीक नीचे My Orders API डालो

app.get("/api/orders", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const orders = await Order.find({ email }).sort({
      createdAt: -1
    });

    res.json(orders);

  } catch (error) {
    res.status(500).json({
      message: "Failed to get orders",
      error: error.message
    });
  }
});

// ==================== ADMIN - GET ALL ORDERS ====================
// ==================== ADMIN - GET ALL ORDERS ====================

app.get("/api/admin/orders", verifyAdmin, async (req, res) => {
  try {
        const orders = await Order.find().sort({
      createdAt: -1
    });

    res.json(orders);

  } catch (error) {
    res.status(500).json({
      message: "Failed to get all orders",
      error: error.message
    });
  }
});


// ==================== CANCEL ORDER ====================

app.put("/api/orders/:id/cancel", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    // Only Placed or Confirmed orders can be cancelled
    if (
      order.status !== "Placed" &&
      order.status !== "Confirmed"
    ) {
      return res.status(400).json({
        message: "Order cannot be cancelled now"
      });
    }

    order.status = "Cancelled";

    await order.save();

    res.json({
      message: "Order cancelled successfully",
      order
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to cancel order",
      error: error.message
    });
  }
});
// ==================== DELIVERY PARTNER - UPDATE STATUS ====================

app.put(
  "/api/delivery/orders/:id/status",
  verifyDelivery,
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatuses = [
        "Out for Delivery",
        "Delivered"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid delivery status"
        });
      }

      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          message: "Order not found"
        });
      }

      if (
        status === "Out for Delivery" &&
        order.status !== "Preparing"
      ) {
        return res.status(400).json({
          message: "Order is not ready for delivery"
        });
      }

      if (
        status === "Delivered" &&
        order.status !== "Out for Delivery"
      ) {
        return res.status(400).json({
          message: "Order is not out for delivery"
        });
      }

      order.status = status;

      await order.save();

      res.json({
        message: "Delivery status updated successfully",
        order
      });

    } 
     catch (error) {
  console.log("DELIVERY STATUS ERROR:", error);

  res.status(500).json({
  message: error.message,
  errors: error.errors
});
}
  }
);

// ==================== UPDATE ORDER STATUS ====================

app.put("/api/orders/:id/status", verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Placed",
      "Confirmed",
      "Preparing",
      "Out for Delivery",
      "Delivered",
       "Cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status"
      });
    }

    // Find order first
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    // Cancelled order cannot be changed again
    if (order.status === "Cancelled") {
      return res.status(400).json({
        message: "Cancelled order cannot be updated"
      });
    }

    // Update status
    order.status = status;

    await order.save();

    res.json({
      message: "Order status updated successfully",
      order: order
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message
    });
  }
});

// ==================== LOGIN ====================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }
 const token = jwt.sign(
  {
    id: user._id,
    role: user.role
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d"
  }
);
    res.json({
  message: "Login successful",
  token: token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});
// ==================== GET USER PROFILE ====================

app.get("/api/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      user
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to get profile",
      error: error.message
    });
  }
});
// ==================== UPDATE USER PROFILE ====================

app.put("/api/profile", verifyToken, async (req, res) => {
  try {
    const {
      name,
      password,
      mobile,
      address,
      city,
      pincode
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // Update name
    if (name && name.trim() !== "") {
      user.name = name.trim();
    }

    // Update mobile
    if (mobile !== undefined) {
      user.mobile = mobile.trim();
    }

    // Update address
    if (address !== undefined) {
      user.address = address.trim();
    }

    // Update city
    if (city !== undefined) {
      user.city = city.trim();
    }

    // Update pincode
    if (pincode !== undefined) {
      user.pincode = pincode.trim();
    }

    // Update password
    if (password && password.trim() !== "") {
      user.password = await bcrypt.hash(
        password,
        10
      );
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        address: user.address,
        city: user.city,
        pincode: user.pincode,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update profile",
      error: error.message
    });
  }
});

// ==================== SERVER ====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
