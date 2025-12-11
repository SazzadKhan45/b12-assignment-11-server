const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 3000;

// Firebase Admin Sdk
const serviceAccount = require("./appsauth-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(express.json());
app.use(cors());

// Firebase Admin verify by accessToken
const verifyFirebaseToken = async (req, res, next) => {
  //
  const userAccessToken = req.headers.authorization;
  //
  if (!userAccessToken) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  //
  try {
    const token = userAccessToken.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded_email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

// Mongo_db info
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//
async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const db = client.db("G-Flow");
    const garmentCollection = db.collection("All_Products");
    const userCollection = db.collection("user");
    // const buyerCollection = db.collection("Sale-products");

    // ##### Verify Admin ###################
    const verifyAdmin = async (req, res, next) => {
      try {
        const email = req.user?.email;

        if (!email) {
          return res
            .status(401)
            .send({ message: "Unauthorized: Missing user email" });
        }

        const user = await userCollection.findOne({ email });

        if (!user || user.role !== "Admin") {
          return res.status(403).send({ message: "Forbidden: Admin only" });
        }

        next();
      } catch (err) {
        res.status(500).send({ message: "Server Error", err });
      }
    };

    // ############ garmentCollection Api List ################

    // Product add to post Api
    app.post("/single-product", async (req, res) => {
      try {
        const product = req.body;
        const result = await garmentCollection.insertOne(product);

        //
        res.status(201).send({
          success: true,
          message: "Product added successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error inserting product:", error);

        //
        res.status(500).send({
          success: false,
          message: "Failed to add product",
          error: error.message,
        });
      }
    });

    // Get Product show Homepage  Api
    app.get("/products-home", async (req, res) => {
      try {
        const result = await garmentCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();

        res.status(200).send({
          success: true,
          message: "Latest 6 products fetched successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error fetching latest products:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch latest products",
          error: error.message,
        });
      }
    });

    // All Products Page Api
    app.get("/all-product", async (req, res) => {
      try {
        const result = await garmentCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).send({
          success: true,
          message: "Latest 6 products fetched successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error fetching latest products:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch latest products",
          error: error.message,
        });
      }
    });

    // Get product bt id Api
    app.get("/product/:id", async (req, res) => {
      try {
        const id = req.params;
        const query = { _id: new ObjectId(id) };

        const result = await garmentCollection.findOne(query);
        res.status(200).send({
          success: true,
          message: "Successfully fetched product by id",
          data: result,
        });
      } catch (error) {
        console.error("Error fetching latest products:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch products data",
          error: error.message,
        });
      }
    });

    // ############ User Collection Api List ###############
    // User Collection save to post Api
    app.post("/userList", async (req, res) => {
      try {
        const userData = req.body;

        // Validate required fields
        if (!userData?.email || !userData?.name || !userData?.role) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        // Check if user already exists
        const existingUser = await userCollection.findOne({
          email: userData.email,
        });

        if (existingUser) {
          return res.status(409).send({ message: "User already exists" });
        }

        // Add default status before saving
        const newUser = {
          ...userData,
          status: "pending",
          createdAt: new Date(),
        };

        // Insert new user
        const result = await userCollection.insertOne(newUser);

        res.send({
          message: "User saved successfully",
          inserted: true,
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          error: "Failed to save user",
          details: error.message,
        });
      }
    });

    //  User collection get Api
    app.get("/all-users", async (req, res) => {
      try {
        //
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // User status update Api
    app.patch("/user-update/:id", async (req, res) => {
      try {
        const id = req.params;
        const query = { _id: new ObjectId(id) };

        // update info
        const updateStatus = {
          $set: { status: "approved" },
        };

        const result = await userCollection.updateOne(query, updateStatus);

        //
        res
          .status(200)
          .send({ message: "Update Status Successfully", data: result });

        //
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // User delete Api
    app.delete("/user/:id", async (req, res) => {
      try {
        const id = req.params;

        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);

        //Check user is null
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Product not found" });
        }

        //
        res.send({
          message: "Product deleted successfully",
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // ###### Admin Related all Api ##################

    // All product table api
    app.get("/all-product-data", async (req, res) => {
      try {
        const { email } = req.query;

        // Find user from userCollection
        const user = await userCollection.findOne({ email });

        // If No user fund
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        // Check verify admin user
        if (user.role !== "Admin") {
          return res
            .status(403)
            .send({ message: "Access denied: Not an Admin" });
        }

        // If user role Admin
        const result = await garmentCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();

        res.send({
          message: "Admin access granted",
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // DashBoard product delete Api
    app.delete("/product/:id", async (req, res) => {
      try {
        const id = req.params;

        const query = { _id: new ObjectId(id) };

        const result = await garmentCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send({
          message: "Product deleted successfully",
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    //  ##### Manager role Api
    app.get("/manager-product", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        //
        const query = { supplierEmail: email };
        const result = await garmentCollection.find(query).toArray();

        //
        res
          .status(200)
          .send({ message: "Manager product get successfully", data: result });
        //
      } catch (error) {
        console.log("ERR:", error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    //
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
