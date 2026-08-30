const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);



const express = require('express')
//const cors = require("cors");

const dotenv = require('dotenv')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");

const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());







const uri = process.env.MONGODB_URI;

 const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));




const PORT = process.env.PORT



const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const logger = (req, res, next) => {
  console.log(`${req.method} | ${req.url}`);
  next();
}
 


const verifyToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    const token = authorization?.split(" ")[1];

    console.log("BACKEND JWT:", token);

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { payload } = await jwtVerify(token, JWKS);

    console.log("JWT PAYLOAD:", payload);

    req.user = {
      email: payload.email,
      id: payload.sub,
    };

    next();

  } catch (error) {
    console.error("Token validation failed:", error);

    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};
//async function run() {
  //try {
    // Connect the client to the server	(optional starting in v4.7)
   // await client.connect();

   client.connect(() => {
    console.log('connecting to mongo db')
   }).catch(console.dir)

    const db = client.db("doctor");
    const detailsCollection = db.collection("details");
    const bookingCollection = db.collection("booking");
     const userCollection = db.collection("user");
    

    app.get("/details", async(req, res) => {
      const { search } = req.query;

      let cursor;
      if(search) {
        cursor =  detailsCollection.find({
          $or: [
            {
              name: {
                $regex: search,
                $options: 'i',
              },
            },
            {
              speciality: {
                $regex: search,
                $options: 'i',
              },
            },
          ],
        });
      }
      else{
         cursor = detailsCollection.find();
      }
      
      const result = await cursor.toArray();
      console.log(result);

      res.send(result);
    });


   


    app.get("/details/:detailsId", logger,verifyToken, async(req, res) => {
      
      const detailsId = req.params.detailsId;

      const query = {_id: new ObjectId(detailsId)};
      console.log(query);

      


      const result = await detailsCollection.findOne(query);
      res.send(result);
    })


   app.post("/booking/:detailsId", verifyToken, async (req, res) => {
  const { detailsId } = req.params;
  const bookingData = req.body;

  const doctor = await detailsCollection.findOne({
    _id: new ObjectId(detailsId),
  });

  if (!doctor) {
    return res.status(404).send({ message: "Doctor not found" });
  }

  const result = await bookingCollection.insertOne({
    doctorId: detailsId,
    doctorName: doctor.name,

    patientName: bookingData.patientName,
    phone: bookingData.phone,
    gender: bookingData.gender,
    appointmentDate: bookingData.appointmentDate,
    appointmentTime: bookingData.appointmentTime,
    reason: bookingData.reason,

    patientEmail: req.user.email,
    bookedAt: new Date(),
  });

  res.send(result);
});

app.get("/my-bookings", verifyToken, async (req, res) => {
  const email = req.user.email;
 console.log("LOGGED IN EMAIL:", email);
  const bookings = await bookingCollection
    .find({ patientEmail: email })
    .toArray();
     console.log("FOUND BOOKINGS:", bookings);

  res.send(bookings);
});

app.get("/profile", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    console.log("PROFILE EMAIL:", email);

    const user = await userCollection.findOne({ email });

    console.log("PROFILE USER:", user);

    if (!user) {
      return res.status(404).send({
        message: "User not found",
      });
    }

    res.send({
      name: user.name,
      email: user.email,
      image: user.image || "",
    });

  } catch (error) {
    console.error("PROFILE GET ERROR:", error);

    res.status(500).send({
      message: "Server Error",
    });
  }
});


app.patch("/profile", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    const { name, image } = req.body;

    console.log("PROFILE UPDATE EMAIL:", email);
    console.log("PROFILE UPDATE DATA:", { name, image });

    const result = await userCollection.updateOne(
      { email: email },
      {
        $set: {
          name: name,
          image: image || "",
        },
      }
    );

    console.log("MONGO UPDATE RESULT:", result);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found in database",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      modifiedCount: result.modifiedCount,
    });

  } catch (error) {
    console.error("PROFILE UPDATE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

app.patch("/booking/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  const result = await bookingCollection.updateOne(
    { _id: new ObjectId(id),
      patientEmail: req.user.email
     },
    {
      $set: {
        patientName: updatedData.patientName,
        phone: updatedData.phone,
        appointmentDate: updatedData.appointmentDate,
        appointmentTime: updatedData.appointmentTime,
        reason: updatedData.reason,
      },
    }
  );

  res.send(result);
});



app.delete("/booking/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  const result = await bookingCollection.deleteOne({
    _id: new ObjectId(id),
    patientEmail: req.user.email
  });

  res.send(result);
});

    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
   // console.log("Pinged your deployment. You successfully connected to MongoDB!");
 // } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
 // }
//}
//run().catch(console.dir);

app.get('/', (req,res) => {
    res.send('server is running fine')
})





app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})