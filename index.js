import express from 'express'
import cors from 'cors'
import 'dotenv/config'
const app = express()
const port = process.env.PORT || 5000
import { MongoClient, ObjectId } from 'mongodb';
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

app.use(express.json())
app.use(cors())

const client = new MongoClient(`mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.rccch29.mongodb.net/`);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectedClient = await connectToMongoDB()
const db = connectedClient.db('hireloop_user')
const users = db.collection("user")
const jobs = db.collection("jobs")
const applications = db.collection("applications")
const payments = db.collection("payments")

app.get('/', (req, res) => {
  res.send("server is running")
})

app.get('/users', async (req, res) => {
  const cursor = users.find({})
  const result = await cursor.toArray()
  res.send(result)
})

app.patch('/users/:id/role', async (req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const updatedDoc = {
    $set:{
      role: req.body.role
    }
  }
  const result = await users.updateOne(query, updatedDoc)
  res.send(result)
})

app.get('/user/:id/premium', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await users.findOne(query, { projection: { premium: 1 } })
  res.send(result);
})

app.post('/jobs', async (req, res) => {
  const job = req.body;
  const result = await jobs.insertOne(job)
  res.send(result)
})

app.get('/jobs', async (req, res) => {
  const { category, jobType } = req.query;
  const query = {};

  if (req.query) {
    if (req.query.category) {
      query.category = req.query.category
    }
    if (req.query.jobType) {
      query.jobType = req.query.jobType
    }
    if (req.query.search) {
      query.$or = [
        { jobTitle: { $regex: req.query.search, $options: "i" } },
        { companyName: { $regex: req.query.search, $options: "i" } },
        { qualifications: { $regex: req.query.search, $options: "i" } },
        { jobTitle: { $regex: req.query.search, $options: "i" } }
      ];
    }

  } console.log(query)
  const cursor = jobs.find(query)
  const result = await cursor.toArray();
  res.send(result)
})


app.get('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await jobs.findOne(query)
  res.send(result)
})

app.delete('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobs.deleteOne(query)
  res.send(result)
})

app.post('/application', async (req, res) => {
  const application = req.body;
  const result = await applications.insertOne(application)
  res.send(result)
})


app.get('/application', async (req, res) => {
  const query = {};
  if (req.query.applicantId) {
    query.userId = req.query.applicantId
  }
  if(req.query.jobId){
    query.jobId = req.query.jobId
  }
  const cursor = applications.find(query)
  const result = await cursor.toArray()
  res.send(result)
})
app.get('/application/count', async (req, res) => {
  const query = {};
  if (req.query.applicantId) {
    query.userId = req.query.applicantId
  }
  const result = await applications.countDocuments(query)
  res.send({ count: result })
})

// Recruiter: update the status of a candidate's application
app.patch('/application/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid application id" });
    }
    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const result = await applications.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.send(result);
  } catch (error) {
    console.error("Application status update error:", error);
    res.status(500).json({ success: false, message: "Failed to update application status" });
  }
})

app.post('/payment/checkout/verify', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const {
      id,
      status,
      payment_status,
      customer_email,
      metadata,
      payment_intent,
    } = session;

    if (status !== "complete" || payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment is not completed",
      });
    }

    // Check user ID
    if (!metadata?.userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is missing from Stripe metadata",
      });
    }

    // Update premium status FIRST
    const updatedResult = await users.updateOne(
      { _id: new ObjectId(metadata.userId) },
      {
        $set: { premium: true },
      }
    );

    if (updatedResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found in MongoDB",
      });
    }

    // Check duplicate payment
    const existingPayment = await payments.findOne({
      sessionId: id,
    });

    if (existingPayment) {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        updatedResult,
      });
    }

    // Save payment
    const payment = {
      sessionId: id,
      status,
      payment_status,
      metadata,
      customer_email,
      userId: metadata.userId,
      payment_date: new Date(),
      payment_intent,
    };

    const result = await payments.insertOne(payment);

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      result,
      updatedResult,
    });

  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
});




app.listen(port, () => {
  console.log("hireloop server is running")

})

export async function disconnectFromMongoDB() {
  await client.close();
}