const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const express = require('express')

const dotenv = require('dotenv')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config()
const uri = process.env.MONGODB_URI;


const app = express()

const PORT = process.env.PORT



const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("doctor");
    const detailsCollection = db.collection("details")

    app.get("/details", async(req, res) => {
      const cursor = detailsCollection.find();
      const result = await cursor.toArray();
      console.log(result);

      res.send(result);
    });

    app.get("/details/:detailsId", async(req, res) => {
      
      const detailsId = req.params.detailsId;

      const query = {_id: new ObjectId(detailsId)};
      console.log(query);

      


      const result = await detailsCollection.findOne(query);
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req,res) => {
    res.send('server is running fine')
})

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})