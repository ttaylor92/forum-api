const isEmpty = string =>{
    if(string.trim() === '') return true;
    else return false;
}

const isEmail = email =>{
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(emailRegEx)) return true;
    else return false;
}

exports.validateSignupData = data =>{
    let errors = {};

    //form validation
    if(isEmpty(data.email)){
        errors.email = 'Must not be empty'
    } else if(!isEmail(data.email)){
        errors.email = 'Must be a valid email address'
    }

    if(isEmpty(data.password)) errors.password = 'Must not be empty'
    if(isEmpty(data.firstName)) errors.firstName = 'Must not be empty'
    if(isEmpty(data.lastName)) errors.lastName = 'Must not be empty'
    if(data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords must match'
    if(isEmpty(data.handle)) errors.handle = 'Must not be empty'

    return {
        errors,
        valid: (Object.keys(errors).length > 0) ? true : false
    }
}

exports.validateLoginData = user =>{
    let errors = {};

    if(isEmpty(user.email)) errors.email = 'Must not be empty';
    if(isEmpty(user.password)) errors.password = 'Must not be empty';

    return {
        errors,
        valid: (Object.keys(errors).length > 0) ? true : false
    }
}

exports.reduceUserDetails = data =>{
    let userInfo = {};

    if(!isEmpty(data.bio.trim())) userInfo.bio = data.bio;
    if(!isEmpty(data.website.trim())){
        data.website.trim().substring(0, 4) !== 'http' ? userInfo.website = `http://${data.website.trim()}` : userInfo.website = data.website;
    }
    if(!isEmpty(data.location.trim())) userInfo.location = data.location;

    return userInfo;
}
