const { db, admin } = require('../utilities/admin');
const firebase = require('firebase');

const config = require('../utilities/config');
const { validateSignupData, validateLoginData, reduceUserDetails } = require('../utilities/validation');

firebase.initializeApp(config);

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    const { valid, errors } = validateSignupData(newUser);
    if(valid) return res.status(400).json(errors);

    const noImage = 'blank.png';

    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if(doc.exists){
                return res.status(500).json({ handle: 'this handle already exists'})
            } else {
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken()
        })
        .then(idToken => {
            token = idToken
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImage}?alt=media`,
                userId
            }

            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
            //Set creates the documents
        })
        .then(() => {
            return res.status(201).json({ token })
            //statuse doesnt need to be 201 can be 200
        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/email-already-in-use'){
                return res.status(400).json({ email: 'email is already in use'})
            } else {
                return res.status(500).json({ general: "Something went wrong, please try again", error: err })
            }
        })
}

exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`)
        .update(userDetails)
        .then(() => {
            res.json({ message: 'Details have been successfully updated'})
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({ error: err.code })
        })
}

exports.getAuthenticatedUser = (req, res) => {
    let userData = {};

    db.doc(`/users/${req.user.handle}`)
        .get()
        .then(doc => {
            if(doc.exists){
                userData.credentials = doc.data();
                //checks to see likes for user
                return db.collection('likes').where('userHandle', '==', req.user.handle).get();
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            })

            return db.collection('notifications').where('recipient', '==', req.user.handle)
                .orderBy('createdAt', 'asc')
                .get()
        })
        .then(data => {
            userData.notifications = [];
            data.forEach(doc => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    createdAt: doc.data().createdAt,
                    type: doc.data().type,
                    postId: doc.data().postId,
                    read: doc.data().read,
                    notificationId: doc.id,
                    userImage: doc.data().userImage
                })
            })
            return res.json(userData);
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({ error: err.code })
        })
}

exports.getUserDetails = (req, res) =>{
    let userData = {};
    db.doc(`/users/${req.params.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.user = doc.data();
                return db.collection('posts').where('userHandle', '==', req.params.handle)
                    .orderBy('createdAt', 'desc')
                    .get()
            } else return res.status(404).json({ error: 'User does not exist' })
        })
        .then(data => {
            userData.posts = [];
            data.forEach(doc => {
                userData.posts.push({
                    body: doc.data().body,
                    userHandle: doc.data().handle,
                    userImage: doc.data().imageUrl,
                    createdAt: doc.data().createdAt,
                    tag: doc.data().tag,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    postId: doc.id
                })
            })
            return res.json(userData);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code })
        })
}

exports.login = (req, res) => {
    const user ={
        email: req.body.email,
        password: req.body.password
    }

    const { valid, errors } = validateLoginData(user);
    if(valid) return res.status(400).json(errors);

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken()
        })
        .then(token => {
            return res.json({ token })
        })
        .catch(err => {
            console.error(err)
            if(err.code === 'auth/wrong-password'){
                return res.status(403).json({ general: 'Incorrect user information' })
            } else if(err.code === 'auth/user-not-found'){
                return res.status(403).json({ general: 'User does not exist' })
            } else return res.status(500).json({error: err.code})
        })
}

let imageFileName;
let imageToBeUploaded = {};

exports.uploadImage = (req, res) =>{
    const Busboy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new Busboy({ headers: req.headers });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
            return res.status(400).json({ error: 'Incorrect filetype submitted'})
        }
        
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        //sequinsial number for filename followed by extension for online labeling
        // imageFileName = `${Math.round(Math.random()*10000000000)}.${imageExtension}`;
        imageFileName = `${req.user.handle}.${imageExtension}`;
        const filePath =  path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filePath, mimetype };
        file.pipe(fs.createWriteStream(filePath));
    });
    busboy.on('finish', () =>{
        admin.storage().bucket().upload(imageToBeUploaded.filePath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            //update user document with the url for the image uploaded
            //because its protected using the fbauth we have acces to the user logged in
            //so we can use req.user for the user making the upload request
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl })
        })
        .then(() => {
            res.json({ message: 'Image has been uploaded successfully'})
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({ error: err.code })
        })
    })
    busboy.end(req.rawBody);
}

exports.markNotificationsRead = (req, res) =>{
    let batch = db.batch();
    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, { read: true });
    });
    batch.commit()
        .then(() => {
            return res.json({ message: 'Notifications marked read'})
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err })
        })
}