//jshint esversion:6
require('dotenv').config();
const express =  require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport=require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const app = express();



app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
    //cookie: { secure: true }
  }));


app.use(passport.initialize()) ;
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({

    email: String,
   
    password: String,

    googleId: String,

    secret: String
   
   });

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);   
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
   
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home.ejs");
});

app.get("/auth/google",
    passport.authenticate("google",{scope: ["profile"]})
)

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
    res.render("login.ejs");
});

app.get("/register",function(req,res){
    res.render("register.ejs");
});

app.get("/secrets",function(req,res){
    User.find({"secret": {$ne:null}}).then(function(foundUsers){
        res.render("secrets",{userWithSecrets: foundUsers});
    }).catch(function(err){
        console.log(err);
    })
});

app.get("/logout",function(req,res){
    req.session.destroy(function (err) {
        res.redirect('/'); //Inside a callback… bulletproof!
      });
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",function(req,res){
    const submitSecret= req.body.secret;

    console.log(req.user._id);

    User.findById(req.user._id).then(function(foundUser){
        foundUser.secret=submitSecret;
        foundUser.save().then(function(){
            res.redirect("/secrets");
        });
    }).catch(function(err){
        console.log(err);
    })
})

app.post("/register",function(req,res){

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
    
    
});

app.post("/login",function(req,res){
    const user =new User({
    username : req.body.username,
    password : req.body.password
});
    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });

});
app.listen(3000, function() {
    console.log("Server started on port 3000");
  });