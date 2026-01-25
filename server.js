const  express = require("express");


const app =express();

app.get("/" ,(req,res) => {
    res.send("API is Running  Successfully");

});





app.listen(5000,console.log("Server Started on Port 5000"));
