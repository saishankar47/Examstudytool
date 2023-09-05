const express=require('express')
const router= express.Router()
const con = require('../db');



function isLoggedIn(req, res, next){
    req.user ? next() : res.sendStatus(401);
  }
  
  function isAdmin(req, res, next){
    if(req.user[0].user_id!=null)
    {
      if(req.user[0].user_role=='admin')
      {
        next();
      }
      else
      {
        res.sendStatus(401);
      }
    }
  }
  
  function isTeacher(req, res, next){
    if(req.user[0].user_id!=null)
    {
      if(req.user[0].user_role=='teacher' || req.user[0].user_role=='admin')
      {
        next();
      }
      else
      {
        res.sendStatus(401);
      }
    }
  }
  
  function isStudent(req, res, next){
    if(req.user[0].user_id!=null)
    {
      if(req.user[0].user_role=='student' || req.user[0].user_role=='admin')
      {
        next();
      }
      else
      {
        res.sendStatus(401);
      }
    }
  }

/*
app.get("/student",(req,res)=>{
    res.render("index")
})*/

//Index
// router.get("/",(req,res)=>{
//     console.log("Index Page");
//     res.render("index_std")
// })

router.get("/",(req,res)=>{
  try {
    con.query(`SELECT distinct count(type_value) as courses FROM predefined where type='course' and type is not null AND type <> '';
    SELECT distinct count(type_value) as translations FROM predefined where type='language' and type is not null AND type <> '';
    select distinct count(user_email) as students from user1 where user_role='student' and user_email is not null and user_email <> '';
    select distinct count(user_email) as teachers from user1 where user_role='teacher' and approved='1' and user_email is not null and user_email <> '';
    select distinct count(question) as questions from questions where approval ='approved'<> '';`, 
    function (error, results) {
      if (error) {
        res.render("index_std");
        return;
      }
      else {
        res.render('index', {courses: results[0][0].courses, translations: results[1][0].translations, students: results[2][0].students, teachers: results[3][0].teachers, questions: results[4][0].questions});
      }
    });
  } catch (err) {
    res.render("index_std");
  }
})

router.get("/about",(req,res)=>{
  try {
    console.log("About Page");
    res.render("about")
  } catch (err) {
    res.render("index");
  }
})


module.exports=router