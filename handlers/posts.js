const { db } = require('../utilities/admin');

exports.getAllPosts = (req, res) => {
    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let posts = [];
            data.forEach(doc => {
                posts.push({
                    postId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    tag: doc.data().tag
                });
            });
            return res.json(posts)
        })
        .catch(err => console.error(err));
}

exports.createNewPost = (req, res) => {
    if(req.body.body.trim() === ''){
        return res.status(400).json({ body: 'Body must not be empty'})
    }

    const newPost = {
        body: req.body.body,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
        tag: [req.body.tag]
    }

    db.collection('posts')
        .add(newPost)
        .then(doc => {
            res.json({ message: `Document ${doc.id} has been created successfully` })
        })
        .catch(err => {
            res.status(500).json({ error: 'something went wrong'})
            console.error(err)
        })
}

exports.postNewComment = (req, res) =>{
    if(req.body.body.trim() === '') return res.status(400).json({ error: 'Must not be empty'});

    const newComment ={
        body: req.body.body,
        createdAt: new Date().toISOString(),
        postId: req.params.postId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    }

    db.doc(`/posts/${req.params.postId}`).get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({ error: "Post does not exist"})
            }
            return db.collection('comments').add(newComment)
        })
        .then(() => {
            return res.json(newComment)
        })
        .catch(err => {
            return res.status(500).json({ error: err.code})
        })
}

exports.getPost = (req, res) =>{
    let postData = {};
    db.doc(`/posts/${req.params.postId}`)
        .get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({ error: 'Post not found'})
            }
            postData = doc.data();
            postData.postId = doc.id;
            return db.collection('comments').orderBy('createdAt', 'asc').where('postId', '==', req.params.postId).get();
        })
        .then(data => {
            postData.comments = [];
            data.forEach((doc) => {
                postData.comments.push(doc.data());
            })
            return res.json(postData)
        })
        .catch(err => {
            return res.status(500).json({ error: err.code })
        })
}