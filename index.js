const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();

const app = express();
const port = 5000;
const url = process.env.DB;

// Enable CORS for all routes
app.use(
  cors({
    origin: ["http://localhost:3000","https://food-book-ruddy.vercel.app"],
  })
);

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// Middleware to parse JSON
app.use(express.json());

// Endpoint to handle recipe creation
app.post("/create", async (req, res) => {
  try {
    const connection = await MongoClient.connect(url);
    const db = connection.db("cookbook");
    const { image, ...recipe } = req.body;
    await db.collection("recipes").insertOne({
      ...recipe,
      image: image ? image : "",
    });
    await connection.close();
    res.json({ message: "Recipe Posted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Endpoint to get all recipes
app.get("/menu", async (req, res) => {
  try {
    const connection = await MongoClient.connect(url);
    const db = connection.db("cookbook");
    const store = await db.collection("recipes").find().toArray();
    await connection.close();
    res.json(store);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Endpoint to handle file uploads
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    res.status(200).json({
      message: "File uploaded successfully",
      file: req.file,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error uploading file",
      error: error.message,
    });
  }
});

// Endpoint to get the list of uploaded files
app.get("/files", (req, res) => {
  const directoryPath = path.join(__dirname, "uploads");
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).json({
        message: "Unable to scan files",
        error: err.message,
      });
    }
    res.status(200).json({
      message: "Files retrieved successfully",
      files: files.map((file) => ({
        name: file,
        url: `http://localhost:${port}/uploads/${file}`,
      })),
    });
  });
});

//Login Api
// app.post("/login", async (req, res) => {
//   try {
//     const connection = await MongoClient.connect(url);
//     const db = connection.db("cookbook");
//     const user = await db.collection("user").findOne({ email: req.body.email });

//     if (user) {
//       const password = bcrypt.compareSync(req.body.password, user.password);
//       if (password) {
//         res.json({ message: "Login Successfully" });
//       } else {
//         res.json({ message: "Invalid Password" });
//       }
//     } else {
//       res.json({ message: "Invalid Email" });
//     }
//   } catch (error) {
//     console.log(error);
//     res.json({ message: "Login Failed" });
//   }
// });
app.post("/login", async (req, res) => {
  try {
    const connection = await MongoClient.connect(url);
    const db = connection.db("cookbook");
    const loginuser = await db
      .collection("user")
      .findOne({ email: req.body.email });
    // console.log(loginuser);
    if (loginuser) {
      const password = bcrypt.compareSync(
        req.body.password,
        loginuser.password
      );
      if (password) {
        const token = jwt.sign({ id: loginuser._id }, process.env.SECRETKEY);
        res.json({ message: "Login Success", token, loginuser });
      } else {
        res.status(401).json({ message: "Password Incorrect" });
      }
    } else {
      res.status(401).json({ message: "User not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Something went wrong" });
  }
});

//Register Api
app.post("/register", async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);
    req.body.password = hash;
    const connection = await MongoClient.connect(url);
    const db = connection.db("cookbook");
    const user = await db.collection("user").insertOne(req.body);
    await connection.close();
    res.json({ message: "User Registered Scccessfully" });
  } catch (error) {
    console.log(error);
    res.json({ message: "User Not Registered" });
  }
});

// Serve the uploads directory to view uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
