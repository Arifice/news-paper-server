const express = require('express');
const cors = require('cors');
const app=express();
const port=process.env.PORT || 5000;

// middlewire
app.use(cors());
app.use(express());
app.get('/',(req,res)=>{
    res.send('ABC NEWS is running....');
})
app.listen(port,()=>{
    console.log(`AbC NEWS server is running on port ${port}`);
})
