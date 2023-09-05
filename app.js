const https = require('https');
const express = require('express')
const path = require('path');
const session = require('express-session');
const bodyParser = require("body-parser");
const app = express()
require('dotenv/config');
const passport = require('passport');
app.use(session({ secret: process.env.PASSPORT_SECRET }));
app.use(passport.initialize());
app.use(passport.session());
const port = process.env.PORT || 5000 || 80;
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
require('./auth');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))

app.set('view engine', 'ejs');
app.use('/css', express.static(__dirname + '/public/stylesheets'));
app.use('/js', express.static(__dirname + '/public/javascripts'));
app.use('/images', express.static(__dirname + '/public/images'));

const userRouter = require('./routes/index')
app.use('/', userRouter)

const student = require('./routes/student')
app.use('/student', student)

const teacher = require('./routes/teacher')
app.use('/teacher', teacher)

const admin = require('./routes/admin')
app.use('/admin', admin)

const s3 = require('./s3')
app.use('/s3', s3)


function errorHandler(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
}
app.use(errorHandler);

function isLoggedIn(req, res, next) {
    req.user ? next() : res.sendStatus(401);
}

function isAdmin(req, res, next) {
    if (req.user[0].user_id != null) {
        if (req.user[0].user_role == 'admin') {
            next();
        } else {
            res.sendStatus(401);
        }
    }
}

function isTeacher(req, res, next) {
    if (req.user[0].user_id != null) {
        if (req.user[0].user_role == 'teacher' || req.user[0].user_role == 'admin') {
            next();
        } else {
            res.sendStatus(401);
        }
    }
}

function isStudent(req, res, next) {
    if (req.user[0].user_id != null) {
        if (req.user[0].user_role == 'student' || req.user[0].user_role == 'admin') {
            next();
        } else {
            res.sendStatus(401);
        }
    }
}

const con = require('./db');
app.get('/auth/google',
    passport.authenticate('google', { scope: ['email', 'profile'] })
)
app.get('/google/callback',
    passport.authenticate('google', {
        successRedirect: '/dummy',
        failureRedirect: '/auth/failure',
    })
);
app.get('/auth/failure', (req, res) => {
    res.send('something went wrong');
});

app.get('/dummy', isLoggedIn, (req, res) => {
    con.query("select role from user1 where user_id = ?;", [req.body.user_id], function(err, user) {
        if (req.user[0].user_role == null) {
            res.redirect('register');
        } else {
            res.redirect(`/${req.user[0].user_role}`);
        }
    });
})

app.get('/home', (req, res) => {
    res.send('home');
})
app.get('/login', (req, res) => {
    res.render('login');
})
app.get('/details', isLoggedIn, (req, res) => {
    res.send(`Hello ${req.user[0].user_name}`);
})
app.get('/register', (req, res) => {
    con.query("select type_value from predefined where type=? AND type_value != 'admin';select type_value from predefined where type=?;select type_value from predefined where type=?;", 
    ["role", "school name", "language"], function(error, results) {
        if (error) throw error;
        else {
            res.render('register', { data1: results[0], data2: results[1], data3: results[2] });
        }
    });
})
app.post('/register', (req, res) => {
    con.query(`UPDATE user1 SET user_role=?,school_name=?,preferred_language=? WHERE user_id=?`,
     [req.body.user_role, req.body.school_name, req.body.preferred_language, req.user[0].user_id], function(error, results) {
        if (error) throw error;
        req.user[0].user_role = req.body.user_role;
        req.user[0].school_name = req.body.school_name;
        req.user[0].preferred_language = req.body.preferred_language;
        res.redirect(`/${req.user[0].user_role}`);
    });
})


app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
module.exports = con;