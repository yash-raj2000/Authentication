require('dotenv').config();  //Loads environment variables from .env file
const express = require("express");
const bodyParser = require("body-parser");
const ejs =  require("ejs");
const mongoose = require("mongoose");
const session = require('express-session'); //npm i passport, passport-local, passport-local-mongoose, express-session , require these in order just like here
const passport = require('passport');   //Express-compatible authentication middleware, for cookies and session
// The API is simple: you provide Passport a request to authenticate, and Passport provides hooks for controlling what occurs when authentication succeeds or fails.
const passportLocalMongoose = require("passport-local-mongoose");//Passport-Local Mongoose is a Mongoose plugin that simplifies building username and password login with Passport.
const GoogleStrategy = require("passport-google-oauth20").Strategy;  //Passport strategy for authenticating with Google using the OAuth 2.0 API. use it after creating app in GDC
const findOrCreate = require("mongoose-findorcreate");
//A plugin for Mongoose which adds the findOrCreate method to models. The method will either append an existing object or save a new one, depending on wether it finds it or not.
//we dont need to require passport-local becoz it will automatically required by passport-local-mongoose
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

app.use(passport.initialize());     //Initialize passport to start using it
app.use(passport.session());        //Use passport for dealing with the sessions, Read passport documentation configuration section

mongoose.connect("mongodb://127.0.0.1/userDB", {useNewUrlParser:true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String   //for post req in secret page
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());            //to create a local login strategy

passport.serializeUser(function(user, done) {
    process.nextTick(function() {
      return done(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
    
passport.deserializeUser(function(user, done) {
    process.nextTick(function() {
      return done(null, user);
    });
  });
 


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets" , //copy this from google api Authorized redirect URIs
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",  //use same in every project
    scope: ["email", "profile"],
  },
  function(accessToken, refreshToken, profile, cb) { //access token sent by google that allows us to access the user data for a longert time, profile tht contain user,email etc
    console.log(profile);  //log what we get after authentication, like usename...
    User.findOrCreate({googleId: profile.id}, //npm i mongoose findorcreate , search docs mongoose-findorcreate, "googleId"ggen inre or a new user and save his data for futu is to check whether a user is already lo
        function (err, user) {
            return cb(err, user);
          }
    );
    }
));

app.get("/",function(req,res){
res.render("home");
});

app.get("/auth/google", //pasted for oauth20 docs, authenticate section
    passport.authenticate("google", { scope: ["profile"] }) );  //authenticate user


app.get("/auth/google/secrets",  //This is from app  authorizes redirec urls, this is where google will send us after authentication
  passport.authenticate('google', { failureRedirect: "/login" }),  //from  oauth20 docs, authenticate section
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login",function(req,res){
res.render("login");
});

app.get("/register",function(req,res){
res.render("register");
});

app.get("/secrets", async function(req, res){
 
    const usersWithSecrets = await User.find({"secret":{$ne:null}});
    console.log(usersWithSecrets);
    res.render("secrets", {usersWithSecrets: usersWithSecrets})
})

app.get("/secrets", async function(req,res){   //this will work after register 
    if(req.isAuthenticated()){        //This checks if user is authenticated and logged in the it renders secrets page else login page
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.get("/submit", async function(req,res){
    //MongoDB fiels not null  means collection actually has a value
    //This will look through all of our user in users collections, look through secret firlds
    // and pick out the users  where the secret field is not equal to null
    const usersWithSecrets = await User.find({"secret":{$ne:null}});
    console.log(usersWithSecrets);
    res.render("secrets", {usersWithSecrets: usersWithSecrets})
});

app.post("/submit", async function(req,res){
    const submittedSecret = req.body.secret;
    //Find the current user in database to submit the secret
    //passport save the users details in req variable
    console.log(req.user.id);
    const userId = req.user.id;

    try{
        const foundUser = await User.findById(userId);
        if(foundUser){
            // Update the user's secret.
            foundUser.secret = submittedSecret;
            
            // Use await to ensure the save operation is completed.
            await foundUser.save();
 
            // Redirect after the user's secret is updated.
            res.redirect("/secrets");
        }
    }  catch (error) {
        console.log(error);
        // Handle any errors here.
        res.redirect("/"); // You can create an error page for this.
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
    //see passport-local-mongoose package to see how to register user
    User.register({username: req.body.username}, req.body.password, function(err, user){  //user in callback will give us new registered user
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req,res),function(){  //local is the type of authentication
                res.redirect("/secrets");
            }
        }
    });
});

app.post("/login", async function(req,res){
    const user = new User({
        username:req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){   //user is the new user that logged in
        if(err){
            console.log(err);
            res.redirect("home");
        } else {
            passport.authenticate("local")(req,res, function(){  //authenticating user same as in register
                res.redirect("/secrets");
            });
        }
    });
});

app.listen(3000,function(){
    console.log("Server started on port 3000");
});