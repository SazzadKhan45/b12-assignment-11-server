const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const admin = require("firebase-admin");
const { customAlphabet } = require("nanoid");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// Firebase Admin Sdk
// const serviceAccount = require("./appsauth-firebase-adminsdk.json");

// Middleware
app.use(express.json());
app.use(cors());

// Env to Firebase Admin SDK
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Firebase Admin verify by accessToken

const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization;
  // console.log(token);

  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  try {
    const idToken = token.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.decoded_email = decoded.email;
    // console.log(decoded);

    next();
  } catch (error) {
    console.error("Firebase token error:", error.message);
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
    // await client.connect();

    // All Database collection here
    const db = client.db("G-Flow");
    const garmentCollection = db.collection("All_Products");
    const userCollection = db.collection("user");
    const buyerCollection = db.collection("Sale-products");

    //

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

    // Get product by id Api
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

    // Update createAt
    app.patch("/product/:id", async (req, res) => {
      const id = req.params;

      try {
        const query = { _id: new ObjectId(id) };

        // Update field
        const updateTime = {
          $set: { createdAt: new Date() },
        };

        const result = await garmentCollection.updateOne(query, updateTime);

        //
        res
          .status(200)
          .send({ message: "Update Status Successfully", data: result });
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // ###### Admin Related all Api Start Here ###########

    // User collection Api Start here #########

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

    // Get all user Api
    app.get("/all-users", async (req, res) => {
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // User status update Api by admin
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

    // DashBoard All Api start here #########

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

    // All Order Admin api
    app.get("/all-order-admin", async (req, res) => {
      const email = req.query.email;
      console.log(email);

      if (!email) {
        return res.status(400).send({ message: "Email not found" });
      }

      try {
        // FIX #1: Use findOne + await
        const user = await userCollection.findOne({ email: email });

        // FIX #2: Check if user exists
        if (!user) {
          return res.status(400).send({ message: "User not found" });
        }

        // FIX #3: Check role
        if (user.role !== "Admin") {
          return res
            .status(403)
            .send({ message: "Access denied. Admin only." });
        }

        // If admin → return all orders
        const result = await buyerCollection
          .find()
          .sort({ createdAt: -1 }) // NEWEST first
          .toArray();

        res.send({ message: "Successfully", data: result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server Error", error });
      }
    });
    app.get("/admin-info", verifyFirebaseToken, async (req, res) => {
      try {
        const managerEmail = req.query.email;

        if (!managerEmail) {
          return res.status(400).send({ message: "Email is required" });
        }

        const query = { email: managerEmail };
        const result = await userCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "User not found" });
        }

        res.status(200).send({
          message: "Manager info fetched successfully",
          data: result,
        });
      } catch (error) {
        console.log("ERR:", error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // Delete order by admin Api
    app.delete("/order/:id", async (req, res) => {
      try {
        const id = req.params;

        const query = { _id: new ObjectId(id) };

        const result = await buyerCollection.deleteOne(query);

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

    //  ##### Manager role Api ########  Start Here

    //  get manager product api
    app.get("/manager-product", verifyFirebaseToken, async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        // Verify token
        if (email !== req.decoded_email) {
          return res.status(403).send({ message: "Forbidden Access" });
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

    // Manager all order Api
    app.get("/all-order-manager", verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Email not found" });
      }

      // Verify user Token
      if (email !== req.decoded_email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      try {
        // FIX #1: Use findOne + await
        const user = await userCollection.findOne({ email: email });

        // FIX #2: Check if user exists
        if (!user) {
          return res.status(400).send({ message: "User not found" });
        }

        // FIX #3: Check role
        if (user.role !== "manager") {
          return res
            .status(403)
            .send({ message: "Access denied. Manager only." });
        }

        //
        const query = { supplierEmail: email };

        // If admin → return all orders
        const result = await buyerCollection
          .find(query)
          .sort({ createdAt: -1 }) // NEWEST first
          .toArray();

        res.send({ message: "Successfully", data: result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server Error", error });
      }
    });

    // Order Approved api
    app.patch("/order-approve/:id", async (req, res) => {
      const id = req.params;

      try {
        const query = { _id: new ObjectId(id) };

        // Update
        const updateData = {
          $set: {
            orderStatus: "approved",
          },
        };

        const result = await buyerCollection.updateOne(query, updateData);

        //
        res.status(200).send({
          message: "Successfully Updated",
          success: true,
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.send({ message: "Server Error" });
      }
    });

    // Order rejected api
    app.patch("/order-reject/:id", async (req, res) => {
      const id = req.params;

      try {
        const query = { _id: new ObjectId(id) };

        // Update
        const updateData = {
          $set: {
            orderStatus: "rejected",
          },
        };

        const result = await buyerCollection.updateOne(query, updateData);

        //
        res.status(200).send({
          message: "Successfully Updated",
          success: true,
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.send({ message: "Server Error" });
      }
    });

    // Manager info Api
    app.get("/manager-info", verifyFirebaseToken, async (req, res) => {
      try {
        const managerEmail = req.query.email;

        if (!managerEmail) {
          return res.status(400).send({ message: "Email is required" });
        }

        const query = { email: managerEmail };
        const result = await userCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "User not found" });
        }

        res.status(200).send({
          message: "Manager info fetched successfully",
          data: result,
        });
      } catch (error) {
        console.log("ERR:", error);
        res.status(500).send({ message: "Server Error" });
      }
    });

    // ####### Buyer role related Api #######################

    // Buyer order post Api
    app.post("/buyer-order", async (req, res) => {
      try {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const generateRandom = customAlphabet(chars, 8);

        let trackingId;

        // Ensure tracking ID is unique inside the database
        do {
          trackingId = "GFW-" + generateRandom();
        } while (await buyerCollection.findOne({ trackingId }));

        const newOrder = {
          ...req.body,
          trackingId,
          createdAt: new Date(),
          orderStatus: "pending",
        };

        // Insert order into DB
        const result = await buyerCollection.insertOne(newOrder);

        // Send success response
        res.status(201).json({
          success: true,
          message: "Order placed successfully",
          trackingId,
          orderId: result.insertedId,
        });
      } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Buyer order Api
    app.get("/all-buyer-order", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Email not found" });
      }

      try {
        // Step-1: User check with correct field
        const user = await userCollection.findOne({ email: email });

        // Step-2: User exists?
        if (!user) {
          return res.status(400).send({ message: "User not found" });
        }

        // Step-3: Role check
        if (user.role !== "buyer") {
          return res.status(403).send({
            message: "Access denied. Buyer only.",
          });
        }

        // Step-4: Fetch buyer orders
        const result = await buyerCollection
          .find({ buyerEmail: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.send({ message: "Successfully", data: result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server Error", error });
      }
    });

    // Order cancel by buyer Api
    app.patch("/order-cancel/:id", async (req, res) => {
      const id = req.params;

      try {
        const query = { _id: new ObjectId(id) };

        // Update
        const updateData = {
          $set: {
            orderStatus: "cancel",
          },
        };

        const result = await buyerCollection.updateOne(query, updateData);

        //
        res.status(200).send({
          message: "Successfully Updated",
          success: true,
          data: result,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server Error", error });
      }
    });

    app.get("/buyer-info", verifyFirebaseToken, async (req, res) => {
      try {
        const managerEmail = req.query.email;

        if (!managerEmail) {
          return res.status(400).send({ message: "Email is required" });
        }

        const query = { email: managerEmail };
        const result = await userCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "User not found" });
        }

        res.status(200).send({
          message: "Manager info fetched successfully",
          data: result,
        });
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
    console.log("Server working Successfully");
  }
}
run().catch(console.dir);

// My backend project done
