const functions = require('firebase-functions');
const app = require('express')();

//Handlers
const { 
    getAllPosts, 
    createNewPost, 
    postNewComment, 
    getPost, 
    likeComments, 
    unlikeComments, 
    deletePost 
} = require('./handlers/posts'); 

const { 
    signup, 
    login, 
    uploadImage, 
    addUserDetails, 
    getAuthenticatedUser 
} = require('./handlers/users');

//utilities
const FBAuth = require('./utilities/fbauth');

//Posts
app.get('/posts', getAllPosts);
app.post('/posts', FBAuth, createNewPost)
app.delete('/posts/:postId', FBAuth, deletePost)
//the colon tells the route that it needs this parameter
app.post('/posts/:postId/comment', FBAuth, postNewComment)
app.get('/posts/:postId', getPost)
app.get('/posts/:postId/like', FBAuth, likeComments)
app.get('/posts/:postId/unlike', FBAuth, unlikeComments)

//users
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)

exports.api = functions.https.onRequest(app);