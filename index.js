import express from 'express'
import cors from 'cors'
import 'dotenv/config'
const app = express()
const port = process.env.PORT || 5000
import { MongoClient } from 'mongodb';

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

app.get('/', (req, res)=>{
    res.send("server is running")
})

app.get('/users', async (req, res)=>{
    const cursor = users.find({})
    const result = await cursor.toArray()
    res.send(result)
})

app.listen(port, ()=>{
    console.log("hireloop server is running")
})

export async function disconnectFromMongoDB() {
  await client.close();
}