const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt=require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express();
const port=process.env.PORT || 5000;

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

     const articlesCollection=client.db('AbcNews').collection('articles');
     const publishersCollection=client.db('AbcNews').collection('publishers');
     const reviewsCollection=client.db('AbcNews').collection('reviews');
     const usersCollection=client.db('AbcNews').collection('users');
    // jwt related api
    
    app.post('/jwt',async(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user,process.env.ACCESS_TOKEN,{expiresIn:'1h'});
      res.send({token});
     })
    
    
    // middlewire
    const verifyToken=(req,res,next)=>{
      // console.log('inside verify token :',req.headers?.authorization); 
    if(!req.headers?.authorization){
      return res.status(401).send({message:'Forbidden access'});
    }
    const token=req.headers?.authorization.split(' ')[1];
    // console.log('token',token);
    jwt.verify(token , process.env.ACCESS_TOKEN , (err,decoded)=>{
      if(err){
        return res.status(401).send({message:'Unathorized access'});
      }
      req.decoded=decoded;
      // console.log('from verify token',decoded);
      next();
    })            
  }

  // use verify admin after verifytoken
  const verifyAdmin=async(req,res,next)=>{
    const email=req.decoded.email;
    const query={email:email};      
    const user=await usersCollection.findOne(query);
    // console.log('decoded',email,'user email',user.email);
    const isAdmin=user?.role ==='admin';
    // console.log('isAdmin',isAdmin);
    if(!isAdmin){
      return res.status(403).send({message:'Forbidden Access'});
    }
    next();

  }    
    
    // user releted api
     app.post('/users',async(req,res)=>{
      const user=req.body;
      const query={email:user.email};
      const existingUser=await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message:'User already exist',insertedId:null});
      }
      const result=await usersCollection.insertOne(user);
      res.send(result);
     })

     app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
      console.log(req.headers)
      const result=await usersCollection.find().toArray();
      res.send(result);
     })
     app.get('/users/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await usersCollection.findOne(query);
      res.send(result);
     })

     app.get('/users/admin/:email',verifyToken, async(req,res)=>{
      const email=req.params.email;
      // console.log(email);
      // console.log('user email:',email,'decoded : ',req.decoded.email);
      if(email !==req.decoded.email){
        return res.status(403).send({message:'Forbidden Access'});
      }
      const query={email:email};
      const user=await usersCollection.findOne(query);
      // console.log(user);
      let admin=false;
      if(user){
      admin=user?.role==='admin'
      }
      res.send({admin});
    })


     app.patch('/users/admin/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const filter={_id:new ObjectId(id)};
      const updateDoc={
        $set:{
          role:'admin',
        }
      }
      const result =await usersCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

    app.delete('/users/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await usersCollection.deleteOne(query);
      res.send(result);
    })

    // review related api

     app.get('/reviews',async(req,res)=>{
      const result=await reviewsCollection.find().toArray();
      res.send(result);
     })

    // publishers related api

     app.post('/publishers',async(req,res)=>{
      const publisher=req.body;
      const result=await publishersCollection.insertOne(publisher);
      res.send(result);
     })
     app.get('/publishers',async(req,res)=>{
      const result=await publishersCollection.find().toArray();
      res.send(result);
     })
     app.get('/publishers/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await publishersCollection.findOne(query);
      res.send(result);
     })
     app.delete('/publishers/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await publishersCollection.deleteOne(query);
      res.send(result);
     })
     app.patch('/publishers/:id',async(req,res)=>{
      const id=req.params.id;
      const updatePublisher=req.body;
      const query={_id:new ObjectId(id)};
      const updateDoc={
        $set:{
            name:updatePublisher.name,
            email:updatePublisher.email,
            image:updatePublisher.image
        }
      }
      const result=await publishersCollection.updateOne(query,updateDoc);
      res.send(result);
     })


    // articles related api

     app.post('/articles',async(req,res)=>{
      const article=req.body;
      const result=await articlesCollection.insertOne(article);
      res.send(result);
     })
     app.get('/articles',async(req,res)=>{
      const result=await articlesCollection.find().toArray();
      res.send(result);
     })
     app.get('/articles/user/:email',async(req,res)=>{
      const email=req.params.email;
      const query={userEmail:email};
      const result=await articlesCollection.find(query).toArray();
      res.send(result);
     })
     app.get('/articles/premium',async(req,res)=>{      
      const query={type:'premium'};
      const result=await articlesCollection.find(query).toArray();
      res.send(result);
     })
     app.get('/articles/:id',async(req,res)=>{      
      const id=req.params.id;
      // console.log(id);
      const query={_id:new ObjectId(id)};
      const result=await articlesCollection.findOne(query);
      res.send(result);
     })
     app.patch('/articles/:id',verifyToken,async(req,res)=>{
      const id=req.params.id;
      const updateArticle=req.body;
      // console.log(updateArticle,id);
      const filter={_id:new ObjectId(id)};
      const updateDoc={
        $set:{
          title:updateArticle.title,
          publisher:updateArticle.publisher,
          userName:updateArticle.userName,
          userEmail:updateArticle.userEmail,
          publisherEmail:updateArticle.publisherEmail,
          description:updateArticle.description,               
          image:updateArticle.image,
          tags:updateArticle.tags,
        }
      }
      const result =await articlesCollection.updateOne(filter,updateDoc);
      res.send(result);
    })

     app.delete('/articles/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await articlesCollection.deleteOne(query);
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


app.get('/',(req,res)=>{
    res.send('ABC NEWS is running....');
})
app.listen(port,()=>{
    console.log(`AbC NEWS server is running on port ${port}`);
})
