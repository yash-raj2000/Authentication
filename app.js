//jshint esversion:
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs =  require("ejs");
const mongoose = require("mongoose");
// const md5 = require("md5");
// const encrypt = require("mongoose-encryption");
// const bcrypt = require("bcrypt");
// const saltRounds = 5;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');


const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(session({
    secret : "Our little secret.",
    resave: false,
    saveUnininitialized: false
}));

app.use(passport.initialize());     //Initialize passport
app.use(passport.session());        //Read passport documentation configuration section

mongoose.connect("mongodb://127.0.0.1/userDB", {useNewUrlParser:true});
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] }); //Put this before mongoose model, and remember to only encrypt the password field not email

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());            //to create a local login strategy
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser()); //set up passport to serialize and deserialize user, Maintain order of code



app.get("/",function(req,res){
res.render("home");
});

app.get("/login",function(req,res){
res.render("login");
});

app.get("/register",function(req,res){
res.render("register");
});

app.get("/secrets", function(req,res){
    if(req.isAuthenticated()){
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function(req,res){
     //see docs logout part      link: https://www.passportjs.org/concepts/authentication/logout/
        req.logout(function(err) {
          if (err) { return next(err); }
          res.redirect('/');
        });
      });

app.post("/register", async function(req,res){
//     bcrypt.hash(req.body.password, saltRounds, function(err, hash){
//         const newUser = new User({
//         email: req.body.username,
//         password: hash
//     });
//    newUser.save().then(()=>{
//     res.render("secrets");
//    }).catch((err)=>{
//     console.log(err);
//    });
//     });     Useing bcrypt till here

    //Passport
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req,res),function(){
                res.redirect("/secrets");
            }
        }
    })

    });

app.post("/login", async function(req,res){
    // const username =  req.body.username;
    // const password =  req.body.password;
    // const foundUser = await User.findOne({email : username});
    //     if(foundUser){
    //         // if(foundUser.password === password){
    //             bcrypt.compare(password, foundUser.password, function(err, result){
    //                 if(result === true){
    //                     res.render("secrets");
    //                 }
    //             });
    //         }   Using bcrypt till here

    //Passport
    const user = new User({
        username:req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            });
        }
    });
    });

app.listen(3000,function(){
    console.log("Server started on port 3000");
});