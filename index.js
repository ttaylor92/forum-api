const functions = require('firebase-functions');
const app = require('express')();

//Handlers
const { getAllPosts, createNewPost } = require('./handlers/posts');  
const { signup, login, uploadImage } = require('./handlers/users');

//utilities
const FBAuth = require('./utilities/fbauth');

//Posts
app.get('/posts', getAllPosts);
app.post('/posts', FBAuth, createNewPost)

//users
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)

exports.api = functions.https.onRequest(app);