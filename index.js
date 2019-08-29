const functions = require('firebase-functions');
const app = require('express')();
const { db } = require('./utilities/admin');

//Handlers
const {
    getAllPosts,
    createNewPost,
    postNewComment,
    getPost,
    getPostsByTag,
    likeComments,
    unlikeComments,
    deletePost
} = require('./handlers/posts');

const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead
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
app.get('/posts/tag/:tag', getPostsByTag)
app.get('/posts/:postId/like', FBAuth, likeComments)
app.get('/posts/:postId/unlike', FBAuth, unlikeComments)

//users
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)
app.get('/user/:handle', getUserDetails)
app.post('/notifications', FBAuth, markNotificationsRead)

exports.api = functions.https.onRequest(app);

//notification triggers
exports.createNotificationOnLike = functions.firestore.document('likes/{id}').onCreate(snapshot => {
    return db.doc(`/posts/${snapshot.data().postId}`)
        .get()
        .then(doc => {
            if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    type: 'like',
                    read: false,
                    postid: doc.id
                })
            }
        })
        .catch(err => console.error(err))
});

exports.createNotificationOnUnlike = functions.firestore.document('likes/{id}').onDelete(snapshot => {
    return db.doc(`/notifications/${snapshot.id}`)
        .delete()
        .catch(err => {
            console.error(err)
            return;
        })
});

exports.createNotificationOnComment = functions.firestore.document('comments/{id}').onCreate(snapshot => {
    return db.doc(`/posts/${snapshot.data().postId}`)
        .get()
        .then(doc => {
            if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
                return db.doc(`/notifications/${snapshot.id}`).set({
                    createdAt: new Date().toISOString(),
                    recipient: doc.data().userHandle,
                    sender: snapshot.data().userHandle,
                    type: 'comment',
                    read: false,
                    postid: doc.id
                })
            }
        })
        .catch(err => {
            console.error(err)
            return;
        })
});

exports.onPostDelete = functions.firestore.document('posts/{postId}').onDelete((snapshot, context) => {
    const postId = context.params.postId;
    const batch = db.batch();
    return db.collection('comments').where('postId', '==', postId).get()
        .then(data => {
            data.forEach(doc => {
                batch.delete(db.doc(`/comments/${doc.id}`))
            })
            return db.collection('likes').where('postId', '==', postId).get()
        })
        .then(data => {
            data.forEach(doc => {
                batch.delete(db.doc(`/likes/${doc.id}`))
            })
            return db.collection('notifications').where('postId', '==', postId).get()
        })
        .then(data => {
            data.forEach(doc => {
                batch.delete(db.doc(`/notifications/${doc.id}`))
            })
            return batch.commit()
        })
        .catch(err => console.error(err))
});
