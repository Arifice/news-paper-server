const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIP_SECRET);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middlewire
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.meaty0s.mongodb.net/?retryWrites=true&w=majority`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
    client.connect();

    const articlesCollection = client.db('AbcNews').collection('articles');
    const publishersCollection = client.db('AbcNews').collection('publishers');
    const reviewsCollection = client.db('AbcNews').collection('reviews');
    const usersCollection = client.db('AbcNews').collection('users');
    const cartCollection = client.db('AbcNews').collection('cart');
    const paymentsCollection = client.db('AbcNews').collection('payments');
    // jwt related api

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token });
    })


    // middlewire
    const logger=async(req,res,next)=>{
      console.log('called:',req.host, req.method, req.url,);
      next();
    }
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token :',req.headers?.authorization); 
      if (!req.headers?.authorization) {
        return res.status(401).send({ message: 'Forbidden access' });
      }
      const token = req.headers?.authorization.split(' ')[1];
      // console.log('token',token);
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unathorized access' });
        }
        req.decoded = decoded;
        // console.log('from verify token',decoded);
        next();
      })
    }

    // use verify admin after verifytoken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // console.log('decoded',email,'user email',user.email);
      const isAdmin = user?.role === 'admin';
      // console.log('isAdmin',isAdmin);
      if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
      next();

    }

    // user releted api
    app.post('/users', logger, async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exist', insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.get('/users', logger,async (req, res) => {
      console.log(req.headers)
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
    app.get('/users/:email',logger ,async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    })
    app.patch('/users/:email',logger,verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const updateinfo = req.body;
      const updateDoc = {
        $set: {
          subscription: updateinfo.subscription,
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    })
    app.get('/users/:id',logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.findOne(query);
      res.send(result);
    })

    app.get('/users/admin/:email',logger, verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      // console.log('user email:',email,'decoded : ',req.decoded.email);
      if (email !== req.decoded?.email) {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // console.log(user);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin });
    })


    app.patch('/users/admin/:id', logger, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin',
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/users/:id',logger, verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })

    // review related api

    app.get('/reviews', logger,async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })

    // publishers related api

    app.post('/publishers',logger, async (req, res) => {
      const publisher = req.body;
      const result = await publishersCollection.insertOne(publisher);
      res.send(result);
    })
    app.get('/publishers', async (req, res) => {
      const result = await publishersCollection.find().toArray();
      res.send(result);
    })
    app.get('/publishers/:id',logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await publishersCollection.findOne(query);
      res.send(result);
    })
    app.delete('/publishers/:id',logger,verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await publishersCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/publishers/:id', logger,async (req, res) => {
      const id = req.params.id;
      const updatePublisher = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: updatePublisher.name,
          email: updatePublisher.email,
          image: updatePublisher.image
        }
      }
      const result = await publishersCollection.updateOne(query, updateDoc);
      res.send(result);
    })


    // articles related api

    app.post('/articles',logger,verifyToken, async (req, res) => {
      const article = req.body;
      const result = await articlesCollection.insertOne(article);
      res.send(result);
    })
    app.get('/articles',logger, async (req, res) => {
      const result = await articlesCollection.find().toArray();
      res.send(result);
    })
    app.get('/articles/user/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await articlesCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/articles/admin',logger,verifyToken, async (req, res) => {
      const search = req.query.search;
      console.log(search)
      const query = { status: search };
      const result = await articlesCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/articles/admin/:id',logger,verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.findOne(query);
      res.send(result);
    })
    app.delete('/articles/admin/:id',logger,verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/articles/admin/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updateInfo.status,
        }
      }
      const result = await articlesCollection.updateOne(query, updateDoc);
      res.send(result);
    })
    app.get('/articles/premium',logger, async (req, res) => {
      const query = { type: 'premium' };
      const result = await articlesCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/articles/:id',logger, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.findOne(query);
      res.send(result);
    })
    app.patch('/articles/:id',logger, verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateArticle = req.body;
      // console.log(updateArticle,id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: updateArticle.title,
          publisher: updateArticle.publisher,
          userName: updateArticle.userName,
          userEmail: updateArticle.userEmail,
          publisherEmail: updateArticle.publisherEmail,
          description: updateArticle.description,
          image: updateArticle.image,
          tags: updateArticle.tags,
          status: updateDoc.status
        }
      }
      const result = await articlesCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/articles/:id',logger, verifyToken,  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.deleteOne(query);
      res.send(result);
    })

    //  cart related api

    app.post('/cart', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    })
    app.get('/cart',logger,verifyToken, async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    })
    app.get('/cart/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/cart/user/:id',logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.findOne(query);
      res.send(result);
    })
    app.delete('/cart/:id',logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/cart/:id', logger,async (req, res) => {
      const id = req.params.id;
      const updateinfo = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updateinfo.status,
        }
      }
      const result = await cartCollection.updateOne(query, updateDoc);
      res.send(result);
    })


    //  payment related api 

    app.post('/create-payment-intent',logger,async (req, res) => {
      const { price } = req.body;
      console.log({ price });
      const amount = parseInt(price * 100);
      console.log({ amount });
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card'],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });

    });

    app.post('/payments',logger, async (req, res) => {
      const payment = req.body;
      // console.log({payment});
      // const query={_id:{
      //  $in: payment.cartIds.map(id=>new ObjectId(id)),
      // }}
      // const deleteResult=await cartCollection.deleteMany(query);
      const paymentResult = await paymentsCollection.insertOne(payment);
      res.send({ paymentResult });
    })
    app.get('/payments',logger, async (req, res) => {
      const result = await paymentsCollection.find().toArray();
      res.send(result);
    })
    app.get('/payments/:id',logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentsCollection.findOne(query);
      res.send(result);
    })
    app.delete('/payments/:id',logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentsCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/stat',logger, async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const articles = await articlesCollection.estimatedDocumentCount();
      const publishers = await publishersCollection.estimatedDocumentCount();
      const orders = await paymentsCollection.estimatedDocumentCount();
      const payments = await paymentsCollection.find().toArray();
      const revenue = payments.reduce((total, item) => total + parseFloat(item.price), 0)
      
      res.send({
        users,
        articles,
        revenue,
        publishers,
      })
    })
    app.get('/articles-stat',logger,verifyToken, async (req, res) => {
      const result = await articlesCollection.aggregate([
        {
          $group: {
            _id: "$tags",
            count: {
              $sum: 1
            }
          }          
        },
        {
          $project:{
            _id:0,
            name:'$_id',
            value:'$count'

          }
        }
        
      ]).toArray();
      res.send(result);

    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('ABC NEWS is running....');
})
app.listen(port, () => {
  console.log(`AbC NEWS server is running on port ${port}`);
})
