const { db } = require('../utilities/admin');
const firebase = require('firebase');

const config = require('../utilities/config');
const { validateSignupData, validateLoginData } = require('../utilities/validation');

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
                return res.status(500).json({ error: error.code })
            }
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
            } else return res.status(500).json({error: err.code})
        })
}