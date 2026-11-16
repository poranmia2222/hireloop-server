import express from 'express'
import cors from 'cors'
import 'dotenv/config'
const app = express()
const port = process.env.PORT || 5000
import { MongoClient, ObjectId } from 'mongodb';

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

app.get('/', (req, res)=>{
    res.send("server is running")
})

app.get('/users', async (req, res)=>{
    const cursor = users.find({})
    const result = await cursor.toArray()
    res.send(result)
})

app.post('/jobs', async(req, res)=>{
  const job = req.body;
  const result = await jobs.insertOne(job)
  res.send(result)
})

app.get('/jobs', async(req, res)=>{
  const { category, jobType } = req.query;
  const query= {};
  
  if(req.query){
    if(req.query.category){
      query.category=req.query.category
    }
    if(req.query.jobType){
      query.jobType=req.query.jobType
    }
     if (req.query.search) {
    query.$or = [
      { jobTitle: { $regex: req.query.search, $options: "i" } },
      { companyName: { $regex: req.query.search, $options: "i" } },
      { qualifications: { $regex: req.query.search, $options: "i" } },
      { jobTitle: { $regex: req.query.search, $options: "i" } }
    ];
  }
    
  }console.log(query)
  const cursor = jobs.find(query)
  const result = await cursor.toArray();
  res.send(result)
})


app.get('/jobs/:id', async(req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await jobs.findOne(query)
  res.send(result)
})

app.delete('/jobs/:id', async(req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await jobs.deleteOne(query)
  res.send(result)
})

app.post('/application', async(req, res)=>{
  const application = req.body;
  const result = await applications.insertOne(application)
  res.send(result)
})

app.get('/application', async(req, res)=>{
  const query = {};
  if(req.query.applicantId){
    query.userId = req.query.applicantId
  }
  const cursor = applications.find(query)
  const result = await cursor.toArray()
  res.send(result)
})

app.listen(port, ()=>{
    console.log("hireloop server is running")
})

export async function disconnectFromMongoDB() {
  await client.close();
}