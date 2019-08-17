const { db, admin } = require('../utilities/admin');

module.exports = (req, res, next) =>{
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];
        //split will return an array with bearer being the first part and token being in the second section
    }else{
        console.error('No token found');
        return res.status(403).json({ error: 'Unathorized' })
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken;
            return db.collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then(data => {
            req.user.handle = data.docs[0].data().handle;
            req.user.imageUrl = data.docs[0].data().imageUrl;
            return next();
        })
        .catch(err => {
            console.error('Error when verifying token', err )
            return res.status(403).json(err)
        })
}