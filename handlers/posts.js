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
                    tag: doc.data().tag,
                    imageUrl: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount
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
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        tag: [req.body.tag],
        likeCount: 0,
        commentCount: 0
    }

    db.collection('posts')
        .add(newPost)
        .then(doc => {
            const postData = newPost;
            postData.postId = newPost.id;
            res.json(postData)
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
            return doc.ref.update({ commentCount: doc.data().commentCount + 1})
        })
        .then(() => {
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

exports.likeComments = (req, res) =>{
    const likeDoc = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('postId', '==', req.params.postId)
        .limit(1);
    //limit the query to one as it will return an array od data

    const postDoc = db.doc(`/posts/${req.params.postId}`);
    let postData;

    postDoc.get()
    .then(doc => {
        if(doc.exists){
            postData = doc.data();
            postData.postId = doc.id;
            return likeDoc.get();
        } else return res.status(404).json({ error: 'Post not found'})
    })
    .then(data => {
        if(data.empty){
            return db.collection('likes').add({
                postId: req.params.postId,
                userHandle: req.user.handle
            })
            .then(() => {
                postData.likeCount++
                return postDoc.update({ likeCount: postData.likeCount })
            })
            .then(() => {
                return res.json(postData)
            })
        } else res.status(400).json({ error: 'Post has already been liked' })
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code })
    })
}

exports.unlikeComments = (req, res) =>{
    const likeDoc = db.collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('postId', '==', req.params.postId)
        .limit(1);
    //limit the query to one as it will return an array od data

    const postDoc = db.doc(`/posts/${req.params.postId}`);
    let postData;

    postDoc.get()
    .then(doc => {
        if(doc.exists){
            postData = doc.data();
            postData.postId = doc.id;
            return likeDoc.get();
        } else return res.status(404).json({ error: 'Post not found'})
    })
    .then(data => {
        if(data.empty){
            return res.status(400).json({ error: 'Post has already been liked' })
        } else {
            return db.doc(`/likes/${data.docs[0].id}`).delete()
            .then(() => {
                postData.likeCount--
                return postDoc.update({ likeCount: postData.likeCount })
            })
            .then(() => {
                res.json(postData)
            })
        }
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code })
    })
}

exports.deletePost = (req, res) =>{
    const post = db.doc(`/posts/${req.params.postId}`);

    post.get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({ error: 'Post does not exist' })
            }
            if(doc.data().userHandle !== req.user.handle){
                return res.status(403).json({ error: 'Unauthorized' })
            } else {
                return post.delete()
            }
        })
        .then(() => {
            res.json({ message: 'Post has been deleted successfully' })
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code })
        })
}