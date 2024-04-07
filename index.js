const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { runInNewContext } = require("vm");

app.use(express.json());
app.use(cors());

app.listen(port, (error) => {
  if (!error) {
    console.log("Server runing on " + port);
  } else {
    console.log("ERROR: " + error);
  }
});

app.get("/", (req, res) => {
  res.send("Express is runing");
});

// Database connectivity with mongodb
mongoose.connect(
  "mongodb+srv://prahladsinghmehta:22052002@ecommerce.lzd1a.mongodb.net/"
);

// Image storage

const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });
app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: true,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

//Schema for creating product

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    requried: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  avilable: {
    type: Boolean,
    default: true,
  },
});

app.post("/addproduct", async (req, res) => {
  const products = await Product.find({});
  let id;

  if (products.length > 0) {
    const last_product_array = products.slice(-1);
    const last_product = last_product_array[0];
    
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });

  
  await product.save();
  res.json({
    success: true,
    name: req.body.name,
  });
});

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  res.json({
    success: true,
    name: req.body.name,
  });
});

//creating api for geting all product

app.get("/allproducts", async (req, res) => {
  const products = await Product.find({});
  

  res.send(products);
});

//schema creating for user model

const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      errors: "Existing User Found With Same Email Id",
    });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };  

  const token = jwt.sign(data, "secret_ecom");

  res.json({ success: true, token });
});

//login

app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: { 
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "wrong password" });
    }
  } else {
    res.json({ success: false, errors: "Wrong email id" });
  }
});

//creating new collection endpoint
app.get("/newcollections", async (req, res) => {
  let product = await Product.find({});
  let newCollection = product.slice(1).slice(-8);
  res.send(newCollection);
});

app.get("/popularinwomen", async (req, res) => {
  let product = await Product.find({ category: "women" });
  let populer_in_women = product.slice(0, 4);
  res.send(populer_in_women);
});

//creating middleware to fetch user

const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  console.log(token);

  if (!token) {
    res
      .status(401)
      .send({ error: "Please authenticate by useing valid token" });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      console.log(error);
      res
        .status(401)
        .send({ error: "Please authanticate useing a valid token" });
    }
  }
};
//Add to Cart
app.post("/addtocart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send({ message: "Added" });
}); 

// Remove from Cart

app.post("/removefromcart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send({ message: "Removed" });
});

//get cart data
app.post("/getcart", fetchUser, async (req, res) => {
  const userData = await Users.findOne({ _id: req.user.id });

  res.json(userData.cartData);
});
