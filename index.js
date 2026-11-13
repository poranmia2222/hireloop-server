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
  const cursor = jobs.find()
  const result = await cursor.toArray();
  res.send(result)
})

app.delete('/jobs/:id', async(req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await jobs.deleteOne(query)
  res.send(result)
})

app.listen(port, ()=>{
    console.log("hireloop server is running")
})

export async function disconnectFromMongoDB() {
  await client.close();
}