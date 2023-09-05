const con = require('../db');
const express=require('express')
const router= express.Router()
const path = require('path');

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
      if((req.user[0].user_role=='teacher' && req.user[0].approved==1 ) || req.user[0].user_role=='admin' )
      {
       next();
      }
      else if(req.user[0].user_role!='student' || (req.user[0].user_role=='teacher' && req.user[0].approved!=1 )  )
      {
        res.redirect('/teacher/approval');
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

router.get('/approval',isLoggedIn,(req,res, next)=>{
 
  res.render('Approval')
})
//Home Page Class
router.get("/",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`SELECT c.class_id,c.class_name, t1.user_name AS primary_teacher,
     GROUP_CONCAT(t2.user_name SEPARATOR ', ') AS co_teachers, concat_ws(', ',t1.user_name,
     GROUP_CONCAT(t2.user_name SEPARATOR ',')) AS teachers FROM class c 
     JOIN class_teachers ct1 ON c.class_id = ct1.class_id JOIN user1 t1 ON ct1.teacher_id = t1.user_id 
     LEFT JOIN class_teachers ct2 ON c.class_id = ct2.class_id AND ct1.class_teachers_id <> ct2.class_teachers_id 
     LEFT JOIN user1 t2 ON ct2.teacher_id = t2.user_id WHERE ct1.teacher_id = ? and c.deleted='0' GROUP BY c.class_id;
     SELECT user1.user_id,user1.user_name,user1.user_email from user1
      where user1.deleted = 0 and user1.user_role = 'teacher' or user1.user_role = 'admin';select class_name from class where deleted=0;`, [req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
        const values = [];
        for (let i = 0; i < results[2].length; i++) {
          values.push([results[2][i].class_name]);
        }
        
        res.render('t_home',{data0:results[0],user:req.user[0],data1:results[1],data2:results[2],values});
      }
      });
  } catch (err) {
    next(err);
  }
})

router.post("/",isLoggedIn,isTeacher,(req,res, next)=>{
  try {

    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    con.query("INSERT INTO class set class_name=? ,teacher_id =?,created_date =?;", [req.body.classname1,req.user[0].user_id,currentDate], function (error, results) {
      if (error) next(error); 
      else
      {
        const class_id = results.insertId;
        const values = [];
        if(req.body.teachername!=undefined)
        {
          for (let i = 0; i < req.body.teachername.length; i++) {
            values.push([class_id, req.body.teachername[i]]);
          }
        }
        values.push([class_id, req.user[0].user_id]);
        con.query("INSERT INTO class_teachers (class_id, teacher_id) VALUES ?", [values], function (error, result) {
          if (error) next(error);
          else {
            res.redirect('/teacher');
          }
        });
      }
      });
  } catch (err) {
    next(err);
  }
})
router.post("/class/delete",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query("Update class c JOIN class_teachers ct1 ON c.class_id = ct1.class_id JOIN user1 t1 ON ct1.teacher_id = t1.user_id LEFT JOIN class_teachers ct2 ON c.class_id = ct2.class_id AND ct1.class_teachers_id <> ct2.class_teachers_id LEFT JOIN user1 t2 ON ct2.teacher_id = t2.user_id set c.deleted='1' WHERE c.class_id=? and ct1.teacher_id = ?", [req.body.class_id,req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
        res.redirect('/teacher');
      }
      });
  } catch (err) {
    next(err);
  }
})
router.post('/',(req,res, next)=>{
 
  try {
    const user_id = req.user[0].user_id;
   
    
  } catch (err) {
    next(err);
  }
})

//preview questions
router.get("/preview",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    res.render("t_previewquestions")
  } catch (err) {
    next(err);
  }
})
// Question Page
router.get("/questions",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query("select question, SUBSTRING(question,1,40) as initialText,question_url, topic, sub_topic, year, month, difficulty, standard,r.course from user1, reference_tags r join questions q on r.reference_tags_id=q.reference_tags_id where user1.user_id=? and q.deleted=0 and q.approval='approved';", [req.user[0].user_id], function (error, results) { 
      if (error) next(error); 
        else
        {
         
          res.render('t_questions',{data0:results,user:req.user[0]});
        }
        });
  } catch (err) {
    next(err);
  }
  // con.query("select question, topic, sub_topic, year, month, difficulty, standard from user1, reference_tags r join questions q on r.reference_tags_id=q.reference_tags_id where user1.user_id= ?;", [req.user[0].user_id], function (error, results) {
})
//Assign task students
router.get("/assignstudent",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`select q.question_id,question,question_url ,SUBSTRING(question,1,40) as initialText, topic, sub_topic, month, year, standard, difficulty,r.course 
    from user1, questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where user1.user_id= ? and q.deleted=0 and q.approval='approved';
    
    select  distinct course from reference_tags rt where rt.course is not null AND rt.course <> ''`, [req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
     
        let class_name=req.query.class_name;
        let student_id=req.query.student_id;
        let class_id=req.query.class_id;
        let user_name=req.query.student_name;
        
        res.render('t_assigntaskstudent',{class_name,data0:results[0],user:req.user[0],student_id,class_id,user_name:user_name,data1:results[1]});
      }
      });
  } catch (err) {
    next(err);
  } 
})
router.post("/assignstudent",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query("INSERT INTO test (test_name, teacher_id, due_date,course,created_date) values (?,?,?,?,now());", [req.body.assignmentName,req.user[0].user_id,req.body.dueDate,req.body.coursevalue,], function (error, results) {
      if (error) next(error); 
      else
      {
        const test_id = results.insertId;
        const values = [];
        if(req.body.questionIds!=undefined)
        {
          for (let i = 0; i < req.body.questionIds.length; i++) {
            values.push([test_id, req.body.questionIds[i]]);
          }
        }
  
        con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function (error, results1) {
          if (error) next(error); 
          else
          {
  
            con.query("INSERT INTO assigned_questions (assigned_questions_id,class_id, test_id,student_id,teacher_id,created_date,due_date,is_timed,time) values (?,?,?,?,?,now(),?,?,?);", [,req.body.class_id,`${test_id}`,req.body.student_id,req.user[0].user_id,req.body.dueDate,req.body.isTimed,req.body.timer], function (error, results1) {
              if (error) next(error); 
              else{
               
                res.json({ nextRoute: '/teacher/viewclass/'+req.body.class_id+'?class_name='+req.body.class_name });
              }
            });
          }
        });
      }
    });
  } catch (err) {
    next(err);
  }    
})
//profile
router.get("/profile",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`select type_value from predefined where type=?;select type_value from predefined where type=?;
    select preferred_language,school_name from user1 where user_id = ?; `,
    ['language', 'school name', req.user[0].user_id, req.user[0].user_id],  function (error, results) {
      if (error) next(error);
      else
      {
        
        res.render('t_profile',{data0:results[0],data1:results[1],data2:results[2],data3: results[3],user:req.user[0]});
      }
      });
  } catch (err) {
    next(err);
  }
})
//update student profile
router.post('/profile', (req, res, next) => {
  try {
    con.query('update user1 set preferred_language = ?,school_name = ? where user_id=?;', [req.body.preferred_language, req.body.school_name, req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else {
    
        res.redirect('/teacher/profile');
      }
    });
  } catch (err) {
    next(err);
  }
});

//create question page
router.get("/status",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query("SELECT questions.question_id,questions.question,questions.question_url,SUBSTRING(question,1,40) as subquestion, questions.approval,DATE_FORMAT(created_date, '%m/%d/%Y %h:%i %p') AS created_date FROM  questions where questions.creator_id=?;", [req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
        
        res.render('t_status',{data0:results,user:req.user[0]});
      }
      });
  } catch (err) {
    next(err);
  }
})
//insights page
router.get("/analytics",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`   SELECT 
    ct.test_id,
    t.test_name,DATE_FORMAT(ct.created_date, '%m/%d/%Y %h:%i %p') AS created_date,DATE_FORMAT(ct.due_date, '%m/%d/%Y %h:%i %p') AS due_date,
    COUNT(DISTINCT str.student_id) AS num_attempted,
    AVG(str.score) as avg_score,
    GROUP_CONCAT(DISTINCT u.user_name SEPARATOR ', ') AS attempted,
    GROUP_CONCAT(DISTINCT u2.user_name SEPARATOR ', ') AS not_attempted,
    COUNT(DISTINCT cm.student_id)  as not_attempted_count,
    count(distinct(tq.question_id)) as total
FROM 
    class_tests ct
JOIN 
    test t ON ct.test_id = t.test_id
LEFT JOIN 
    (
        SELECT 
            test_id, 
            student_id, 
            score,
            class_id,
            is_individual
        FROM 
            student_test_result
        GROUP BY 
            test_id, 
            student_id
    ) str ON ct.test_id = str.test_id AND str.class_id = ct.class_id AND str.is_individual = 'n'
LEFT JOIN 
    class_members cm ON ct.class_id = cm.class_id AND cm.student_id NOT IN (SELECT student_id FROM student_test_result WHERE test_id = ct.test_id)
LEFT JOIN 
    user1 u on u.user_id=str.student_id AND u.user_id IN (SELECT student_id FROM student_test_result WHERE test_id = ct.test_id)
LEFT JOIN 
    user1 u2 on u2.user_id=cm.student_id
    join 
    test_questions tq on tq.test_id= ct.test_id and tq.deleted=0
      
WHERE 
    ct.class_id = ? and ct.deleted=0 
GROUP BY 
    ct.test_id
ORDER BY 
    ct.test_id, num_attempted ASC;

;`, [req.query.class_id], function (error, results) {
      if (error) next(error); 
      else
      {
       
        res.render('t_analytics',{data0:results,class_name:req.query.class_name});
      }
      }); 
    
  } catch (err) {
    next(err);
  }
})
router.get("/class/analytics",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`  SELECT 
    t.test_name, 
    DATE_FORMAT(ct.created_date, '%m/%d/%Y %h:%i %p') AS created_date, 
    DATE_FORMAT(ct.due_date, '%m/%d/%Y %h:%i %p') AS due_date, 
    CASE WHEN str.score IS NULL THEN NULL ELSE str.score END AS score, 
    CASE WHEN str.is_individual IS NULL THEN NULL ELSE str.is_individual END AS is_individual, 
    u.user_name,u.user_id, 
    str.percentage,
    'n' AS assigned_questions_id
FROM 
    class c 
    JOIN class_members cm ON cm.class_id = c.class_id 
    JOIN user1 u ON u.user_id = cm.student_id and u.deleted=0
    JOIN class_tests ct ON ct.class_id = cm.class_id 
    LEFT JOIN student_test_result str ON str.test_id = ct.test_id AND str.class_id = ct.class_id AND str.student_id = cm.student_id and is_submitted=1
    JOIN test t ON t.test_id = ct.test_id 
WHERE 
    c.class_id = ? AND c.deleted = 0 AND ct.deleted = 0 AND ct.test_id = ? and cm.deleted=0 AND (str.is_individual IS NULL OR str.is_individual != 'y')
;`, [req.query.class_id,req.query.test_id], function (error, results) {
      if (error) next(error); 
      else
      {
    
        res.render('t_viewtask_analytics',{data0:results,class_name:req.query.class_name,test_name:req.query.test_name,class_id:req.query.class_id,test_id:req.query.test_id,assigned_questions_id:req.query.assigned_questions_id});
      }
      }); 
    
  } catch (err) {
    next(err);
  }

})
router.get("/student/analytics",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(` SELECT aq.is_timed, 
    test.test_id,
   UPPER(test.test_name) AS test_name, test.course, DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p') AS due_date,
   DATE_FORMAT(test.created_date, '%m/%d/%Y %h:%i %p') AS created_date,
   CASE WHEN str.score IS NULL THEN NULL ELSE str.score END AS score,
   COUNT(DISTINCT test_questions.question_id) AS question_count,

   aq.assigned_questions_id
   FROM test
   JOIN assigned_questions aq ON aq.test_id = test.test_id
   JOIN test_questions ON test_questions.test_id = test.test_id
join questions q on test_questions.question_id = q.question_id
   JOIN class ON aq.class_id = class.class_id
   JOIN class_members ON class.class_id = class_members.class_id
   JOIN class_teachers ON class_teachers.class_id = class.class_id
   JOIN user1 u2 ON class_teachers.teacher_id = u2.user_id
   JOIN user1 ON class_members.student_id = user1.user_id
   and user1.user_id=? AND aq.student_id=? and class.class_id=?
   AND test.deleted=0 and aq.deleted=0 and test_questions.deleted=0
   and class.deleted=0 and class_members.deleted=0 and q.deleted=0 and q.approval='approved'
 left join student_test_result str on str.student_id = class_members.student_id
   and str.test_id = test.test_id and str.class_id = class.class_id  
   GROUP BY test.test_id;
   
;`, [req.query.student_id,req.query.student_id,req.query.class_id], function (error, results) {
      if (error) next(error); 
      else
      {
     
        res.render('t_student_analytics',{data0:results,class_name:req.query.class_name,class_id:req.query.class_id,student_name:req.query.user_name,student_id:req.query.student_id,test_name:req.query.test_name,user:req.user[0]});
      }
      }); 
    
  } catch (err) {
    next(err);
  }
})
//View Tasks
router.get("/viewtask/:class_id",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`select c.class_name,t.test_name, DATE_FORMAT(ct.created_date, '%m/%d/%Y %h:%i %p') AS created_date,c.class_id,DATE_FORMAT(ct.due_date, '%m/%d/%Y %h:%i %p') AS due_date,ct.test_id from class c
    join class_tests ct on ct.class_id=c.class_id
    join test t on t.test_id=ct.test_id
    join class_teachers cts on cts.class_id=ct.class_id
    where c.class_id=? and c.deleted=0 and ct.deleted=0 and t.deleted=0 and cts.teacher_id= ? ;`, [req.params.class_id,req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
    
        let class_name=req.query.class_name;
        let test_name=req.body.value;
        res.render('t_viewtask',{class_name,data0:results,user:req.user[0].user_id,class_id:req.params.class_id,test_name});
      }
      }); 
    
  } catch (err) {
    next(err);
  }
});
router.get('/viewtask/:class_id/:test_id', isLoggedIn, isTeacher, (req, res, next) => {
  try {
    const classId = req.params.class_id;
    const testId = req.params.test_id;
  
  con.query(`SELECT * FROM class c
  JOIN class_tests cts on cts.class_id=c.class_id
  JOIN test t on t.test_id=cts.test_id
  JOIN test_questions tq on tq.test_id=t.test_id
  Join questions q on q.question_id=tq.question_id
  join class_teachers ct on ct.class_id=cts.class_id
  join reference_tags rt on rt.reference_tags_id=q.reference_tags_id
  WHERE c.class_id=? and t.test_id=? and c.deleted=0 and ct.deleted=0 and t.deleted=0 and ct.teacher_id= ? ;`, [req.params.class_id,req.params.test_id,req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
        
        res.json(results);
        // res.render('t_viewtask',{data1:results,user:req.user[0].user_id,class_id:req.params.class_id,test_id:req.params.test_id});
      }
      }); 
  } catch (err) {
    next(err);
  }
});
router.get('/v/questions/:class_id/:test_id', isLoggedIn, isTeacher, (req, res, next) => {
  try {
    con.query(`SELECT q.question_id,SUBSTRING(question,1,40) as initialText,q.question,q.question_url,rt.topic,rt.year,rt.month,rt.standard,rt.difficulty,t.test_id,ct.class_id,DATE_FORMAT(cts.due_date, '%m/%d/%Y %h:%i %p') AS due_date,tq.test_questions_id FROM class c
    JOIN class_tests cts on cts.class_id=c.class_id
    JOIN test t on t.test_id=cts.test_id
    JOIN test_questions tq on tq.test_id=t.test_id
    Join questions q on q.question_id=tq.question_id and q.deleted=0 and q.approval='approved'
    join class_teachers ct on ct.class_id=cts.class_id
    join reference_tags rt on rt.reference_tags_id=q.reference_tags_id
    WHERE c.class_id=? and t.test_id=? and c.deleted=0 and ct.deleted=0 and t.deleted=0 and tq.deleted=0 and ct.teacher_id= ? ;
    select question_id,question,SUBSTRING(question,1,40) as initialText,q.question_url, topic, sub_topic, month, year, standard, difficulty,r.course from user1, questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where user1.user_id= ? and q.approval='approved' and q.deleted=0;`, [req.params.class_id,req.params.test_id,req.user[0].user_id,req.user[0].user_id], function (error, results) {
        if (error) next(error); 
        else
        {
          
                res.render('t_viewtask_questions',{class_name:req.query.class_name,data0:results[0],user:req.user[0].user_id,class_id:req.params.class_id,test_name:req.query.test_name,test_id:req.params.test_id,data1:results[1]});
        }
        }); 
  } catch (err) {
    next(err);
  }
});




router.post('/v', isLoggedIn, isTeacher, (req, res, next) => {
  try {
    let test_id=req.body.test_id;

    const values = [];
    if(req.body.questionIds!=undefined)
    {
      for (let i = 0; i < req.body.questionIds.length; i++) {
        values.push([test_id,req.body.questionIds[i]]);
      }
    }
    
  
    con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function (error, results1) {
      if (error) next(error); 
        else {
           // http://localhost/teacher/v/questions/1/1?class_name=class%20A
          res.json({ nextRoute: '/teacher/v/questions/'+req.body.class_id+'/'+req.body.test_id+'?class_name='+req.body.class_name+'&test_name='+req.body.test_name });
        }
      });
  } catch (err) {
    next(err);
  }
});
router.post('/v/duedate', isLoggedIn, isTeacher, (req, res, next) => {
  try {

    con.query("update class_tests set due_date=? where test_id=?", [req.body.datetimeMySQL,req.body.test_id], function (error, results1) {
      if (error) next(error); 
      // http://localhost/teacher/v/questions/30/73?class_name=Functions&test_name=Functions%202
      res.json({ nextRoute:'/teacher/v/questions/'+req.body.class_id+'/'+req.body.test_id+'?class_name='+req.body.class_name+'&test_name='+req.body.test_name});
      });
  } catch (err) {
    next(err);
  }
});

router.post("/viewtask/delete",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(` UPDATE class_tests ct
    JOIN class c ON ct.class_id = c.class_id
    JOIN test t ON ct.test_id = t.test_id
    JOIN class_teachers cts ON ct.class_id = cts.class_id
  SET ct.deleted = 1
  WHERE c.class_id = ?
  and t.test_id=?
    AND c.deleted = 0 
    AND t.deleted = 0 
    AND cts.teacher_id = ? ;`, [req.body.class_id,req.body.test_id,req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
        res.redirect('/teacher/viewtask/'+req.body.class_id+'?class_name='+req.body.class_name);
      }
      }); 
  } catch (err) {
    next(err);
  }
})
//delete questions in a particular task in a class
router.post("/viewtask/questions/delete",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(` UPDATE test_questions
    SET deleted = 1
    WHERE test_id = ? and test_questions_id=? ;`, [req.body.test_id,req.body.test_questions_id], function (error, results) {
      if (error) next(error); 
      else
      {
        
       
        res.redirect('/teacher/v/questions/'+req.body.class_id+'/'+req.body.test_id+'?class_name='+req.body.class_name+'&test_name='+req.body.test_name);
      }
      }); 
  } catch (err) {
    next(err);
  }
})

router.get("/viewtask1",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(` SELECT c.class_name,t.test_name,DATE_FORMAT(aq.due_date, '%m/%d/%Y %H:%i') AS due_date,DATE_FORMAT(aq.created_date, '%m/%d/%Y %h:%i %p') AS created_date,c.class_id,aq.test_id,aq.student_id FROM class c
    JOIN class_members cm on cm.class_id=c.class_id
    
    JOIN assigned_questions aq on aq.student_id=cm.student_id and aq.class_id=cm.class_id
    JOIN test t on t.test_id=aq.test_id
    
    Where c.class_id=? and cm.student_id=? and cm.deleted=0 and c.deleted=0 and aq.deleted=0 `, [req.query.class_id,req.query.student_id], function (error, results) {
      if (error) next(error); 
      else
      {
 
        let student_id=req.query.student_id;
        let class_id=req.query.class_id;
        // let test_name=req.query.test_name;
        res.render('t_viewtaskstudent',{user_name:req.query.user_name,class_name:req.query.class_name,class_id:class_id,student_id:student_id,data0:results,user:req.user[0]});
       
      }
      }); 
  } catch (err) {
    next(err);
  }

})
router.get("/viewtask1/student/question",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`select t.test_id, t.test_name, q.question_id ,q.question, q.question_url, aq.class_id,rt.topic,rt.sub_topic,rt.month,rt.year,rt.difficulty,rt.standard,DATE_FORMAT(aq.due_date, '%m/%d/%Y %h:%i %p') AS due_date,tq.test_questions_id
    from questions q
    join reference_tags rt on rt.reference_tags_id=q.reference_tags_id
    join test_questions tq on tq.question_id = q.question_id  and q.deleted=0
    join test t on tq.test_id = t.test_id and t.deleted=0
    join assigned_questions aq on t.test_id = aq.test_id
    
    where aq.class_id=? and aq.student_id=? and tq.test_id=?  and tq.deleted=0 and aq.deleted=0;
    select question_id,question,SUBSTRING(question,1,40) as initialText,q.question_url, topic, sub_topic, month, year, standard, difficulty,r.course 
    from user1, questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where user1.user_id= ? and q.approval='approved' and q.deleted=0;`,
     [req.query.class_id,req.query.student_id,req.query.test_id,req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
    
       

        let test_name=req.query.test_name;
        res.render('t_viewtask_student_question',{user_name:req.query.user_name,test_name,class_name:req.query.class_name,class_id:req.query.class_id,student_id:req.query.student_id,test_id:req.query.test_id,user:req.user[0],data0:results[0],data1:results[1]});
   
      }
      });
  } catch (err) {
    next(err);
  }


})
router.post("/viewtask1/student/addquestion",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    let test_id=req.body.test_id;

    const values = [];
    if(req.body.questionIds!=undefined)
    {
      for (let i = 0; i < req.body.questionIds.length; i++) {
        values.push([test_id,req.body.questionIds[i]]);
      }
    }
    
    
    con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function (error, results1) {
      if (error) next(error); 
        else {
          
          // http://localhost/teacher/viewtask1/student/question?class_id=1&test_id=24&student_id=112690867271153442852&class_name=class%20A&user_name=M.%20Sai%20Rochan
          res.json({ nextRoute: '/teacher/viewtask1/student/question?class_id='+req.body.class_id+'&test_id='+req.body.test_id+'&student_id='+req.body.student_id+'&class_name='+req.body.class_name+'&user_name='+req.body.user_name+'&test_name='+req.body.test_name});
        }
      });
  } catch (err) {
    next(err);
  }
 })

 router.post('/viewtask1/duedate', isLoggedIn, isTeacher, (req, res, next) => {
  try {
    con.query("update assigned_questions set due_date=? where test_id=?", [req.body.datetimeMySQL,req.body.test_id], function (error, results) {
      if (error) next(error); 
      // http://localhost/teacher/viewtask1/student/question?class_id=30&test_id=75&student_id=9&class_name=Functions&user_name=M.%20Sai%20Rochan&test_name=Functions%202
      res.json({ nextRoute:'/teacher/viewtask1/student/question?class_id='+req.body.class_id+'&test_id='+req.body.test_id+'&student_id='+req.body.student_id+'&class_name='+req.body.class_name+'&test_name='+req.body.test_name});  });
  } catch (err) {
    next(err);
  }

});

router.post("/viewtask1/student/delete",isLoggedIn,isTeacher,(req,res, next)=>{
  
  try {
    con.query(`UPDATE assigned_questions aq 
    join class c on c.class_id=aq.class_id
    join class_members cm on c.class_id=cm.class_id
    join class_teachers cts on cts.class_id=c.class_id
    join test t on t.test_id=aq.test_id
    join test_questions tq on tq.test_id=t.test_id
     set aq.deleted=1
     where c.class_id=? and cm.student_id=? and aq.test_id=?;
 
 `, [req.body.class_id,req.body.student_id,req.body.test_id], function (error, results) {
   if (error) next(error); 
   else
   {
    // http://localhost/teacher/viewtask1/student/question?class_id=30&test_id=75&student_id=9&class_name=Functions&user_name=M.%20Sai%20Rochan&test_name=Functions%202
     res.redirect('/teacher/viewtask1?class_id='+req.body.class_id+'&student_id='+req.body.student_id+'&class_name='+req.body.class_name+'&user_name='+req.body.user_name+'&test_name='+req.body.test_name);

   }
   });
  } catch (err) {
    next(err);
  }
 })
 router.post("/viewtask1/questions/delete",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`UPDATE test_questions tq 
    set tq.deleted=1
    where tq.test_id=? and tq.test_questions_id=?;		;`, [req.body.test_id,req.body.test_questions_id], function (error, results) {
      if (error) next(error); 
      else
      {
        
        res.redirect('/teacher/viewtask1/student/question?class_id='+req.body.class_id+'&test_id='+req.body.test_id+'&student_id='+req.body.student_id+'&class_name='+req.body.class_name+'&user_name='+req.body.user_name+'&test_name='+req.body.test_name);

      }
      });
  } catch (err) {
    next(err);
  }
 })
//assigntask Page
router.get("/assigntask",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query(`select question_id,question,SUBSTRING(question,1,40) as initialText,question_url, topic, sub_topic, month, year, standard, difficulty,r.course 
    from user1, questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where user1.user_id= ? and q.deleted=0 and q.approval='approved';
    select  distinct course from reference_tags rt where rt.course is not null AND rt.course <> '';`, [req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else
      {
        let class_name = req.query;
        let class_id = req.query.class_id;
        
        res.render('t_assigntask',{class_name:class_name,class_id:class_id,data0:results[0],user:req.user[0],data1:results[1]});
      }
      });
  } catch (err) {
    next(err);
  }

})
router.post("/assigntask",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    con.query("INSERT INTO test (test_name, teacher_id, due_date,course,created_date) values (?,?,?,?,now());", [req.body.assignmentName,req.user[0].user_id,req.body.dueDate,req.body.coursevalue,], function (error, results) {
      if (error) next(error); 
      else
      {
        const test_id = results.insertId;
        const values = [];
        if(req.body.questionIds!=undefined)
        {
          for (let i = 0; i < req.body.questionIds.length; i++) {
            values.push([test_id, req.body.questionIds[i]]);
          }
        }
        con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function (error, results1) {
          if (error) next(error); 
          else
          {
            con.query("INSERT INTO class_tests (class_id, test_id,created_date,due_date,is_timed,time) values (?,?,now(),?,?,?);", [req.body.class_id,`${test_id}`,req.body.dueDate,req.body.isTimed,req.body.timer], function (error, results1) {
              if (error) next(error); 
              res.redirect('/teacher')
            });
          }
        });
      }
    });
  } catch (err) {
    next(err);
  }
 

})

router.post("/assigntask2/preview",isLoggedIn,isTeacher,(req,res, next)=>{
  
  try {
    const values = [];
    if(req.body.questionIds!=undefined)
    {
      for (let i = 0; i < req.body.questionIds.length; i++) {
        values.push([req.body.questionIds[i]]);
      }
    }
   
    con.query("select * from questions where question_id in (?);", [values], function (error, results) {
      if (error) next(error); 
     
      res.send(results);
    
    });
  } catch (err) {
    next(err);
  }
  

})


router.post("/assigntaskstudent/preview",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    const values = [];
    if(req.body.questionIds!=undefined)
    {
      for (let i = 0; i < req.body.questionIds.length; i++) {
        values.push([req.body.questionIds[i]]);
      }
    }
  
    con.query("select * from questions where question_id in (?);", [values], function (error, results) {
      if (error) next(error); 
      res.send(results);
    });
  } catch (err) {
    next(err);
  }
})



router.get("/template",isLoggedIn,isTeacher,(req,res, next)=>{
  try {
    res.render("template")
  } catch (err) {
    next(err);
  }
})

// Assessment Page
router.get('/assessment',isLoggedIn,isTeacher, (req, res, next)=>{
  try {
    res.render(assess,{classes:Object.keys(students)})
  } catch (err) {
    next(err);
  }

})
//Class Insights
router.get('/classinsights',isLoggedIn,isTeacher, (req, res, next)=>{
  try {
    res.render("classinsights")
  } catch (err) {
    next(err);
  }

})

//Add Student
router.get('/viewclass/:class_id',isLoggedIn,isTeacher,(req, res, next)=>{
  try {
    con.query(`SELECT distinct cm.student_id,user1.user_name,user1.user_email,class.class_id FROM class_members cm JOIN class_teachers ct ON ct.class_id = cm.class_id join user1 on cm.student_id = user1.user_id join class on cm.class_id = class.class_id WHERE ct.teacher_id = ? and class.class_id = ? and user1.deleted = '0' and class.deleted='0' and cm.deleted='0' and ct.deleted='0';
    SELECT * FROM user1 where user1.user_role = 'student' and user1.deleted='0' and user1.school_name=? and user1.user_id not in (SELECT distinct cm.student_id FROM class_members cm JOIN class_teachers ct ON ct.class_id = cm.class_id join user1 on cm.student_id = user1.user_id join class on cm.class_id = class.class_id WHERE ct.teacher_id = ? and class.class_id = ? and user1.deleted = '0' and class.deleted='0' and cm.deleted='0' and ct.deleted='0');
    SELECT u.user_email, u.user_name,u.user_role,u.approved, u.user_id
FROM user1 u
JOIN predefined p ON u.user_role = p.type_value
LEFT JOIN class_teachers ct ON u.user_id = ct.teacher_id AND ct.class_id = ?
WHERE p.type_value IN ('teacher', 'admin') AND ct.teacher_id IS NULL

    AND u.deleted = 0 and (u.approved=1 and u.user_role='teacher') or u.user_role='admin'`, [req.user[0].user_id,req.params.class_id,req.user[0].school_name,req.user[0].user_id,req.params.class_id,req.params.class_id], function (error, results) {
      if (error) next(error); 
      else
      {    
        
        let class_name=req.query.class_name;
  
        res.render('t_viewclass',{data0:results[0],user:req.user[0],data1:results[1],data2:results[2],class_id:req.params.class_id,class_name:class_name});
      }
      });
  } catch (err) {
    next(err);
  }


})

router.post('/class/:class_id/students',isLoggedIn,isTeacher,(req, res, next)=>{
  try {
    const values = [];
    for (let i = 0; i < req.body.studentname.length; i++) {
      values.push([req.params.class_id, req.body.studentname[i]]);
    }
    
  con.query(" INSERT INTO class_members (class_id, student_id) VALUES ?;", [values], function (error, results) {
  if (error) next(error); 
  else
  {
    
    res.redirect('/teacher/viewclass/'+req.params.class_id+'?class_name='+req.body.class_name);
  }
  });
  } catch (err) {
    next(err);
  }

})
router.post('/class/:class_id/coteachers',isLoggedIn,isTeacher,(req, res, next)=>{
  try {
    const values = [];
 
    for (let i = 0; i < req.body.coteachername.length; i++) {
      values.push([req.params.class_id, req.body.coteachername[i]]);
    }
    
    con.query("INSERT INTO class_teachers (class_id, teacher_id) VALUES ?", [values], function (error, results) {
      if (error) {
        next(error);
      } else {
        res.send(`
          <script>
            alert('Teachers added successfully!');
            window.location.href = '/teacher/viewclass/${req.params.class_id}?class_name=${req.body.class_name}';
          </script>
        `);
      }
    });
  } catch (err) {
    next(err);
  }

})




router.post('/student/delete',isLoggedIn,isTeacher,(req, res, next)=>{
  try {
    con.query(`Update class_members cm1 
    JOIN class c  ON c.class_id = cm1.class_id 
    JOIN user1 t1 ON cm1.student_id = t1.user_id 
    LEFT JOIN class_members cm2 ON c.class_id = cm2.class_id AND cm1.student_id <> cm2.student_id 
    LEFT JOIN user1 t2 ON cm2.student_id = t2.user_id set cm1.deleted='1' 
    WHERE c.class_id=? and cm1.student_id = ? and c.teacher_id=?;`, [req.body.class_id,req.body.student_id,req.user[0].user_id], function (error, results) {
   
      if (error) next(error); 
      else
      {
       
        res.redirect('/teacher/viewclass/'+req.body.class_id+'?class_name='+req.body.class_name);
      }
      });
  } catch (err) {
    next(err);
  }

})
//Class Details in assessment

router.post('/assesment',isLoggedIn,isTeacher, (req, res, next)=>{
  try {
    let classname=req.body.classname;
   
    students[classname].push(req.body.student)
    res.redirect('/assessment?classname='+classname)

  } catch (err) {
    next(err);
  }

})



  router.get('/pract',isLoggedIn,isTeacher, (req, res, next) => {
    try {
      con.query("select question,SUBSTRING(question,1,40) as initialText, topic, sub_topic, month, year, standard, difficulty from user1, questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where user1.user_id= ?;", [req.user[0].user_id], function (error, results) {
        if (error) next(error); 
        else
        {
          
          let class_name=req.query.class_name;
         
          res.render('t_practice',{class_name,data0:results,user:req.user[0],user_name:req.query.user_name});
        }
        });
    } catch (err) {
      next(err);
    }
  });


  router.get("/studentanalytics/:test_id/:class_id/:assigned_questions_id", isLoggedIn, isTeacher, (req, res, next) => {
    try {
      con.query(`SELECT student_id, class_id, test_id, score, option_selected, is_submitted, submitted_date, deleted FROM student_test_result 
      where student_id=? and class_id=? and test_id=? and deleted='0' AND is_submitted = 1;`, 
      [req.query.user_id, req.params.class_id, req.params.test_id], function (error, results) {
        if (error) next(error); 
      else if (results.length=='0')
      {
        if (req.params.assigned_questions_id=='n')
        {
          con.query(`select distinct class_tests.is_timed, TIME_TO_SEC(class_tests.time) as time, questions.question_id, class.class_id,translations.language,
          translations.translation_id, u1.user_name as teacher_name, test_questions.test_id,test.test_name, questions.question_id,
          questions.question,questions.option_1,questions.option_2, questions.option_3,questions.option_4,questions.answer,questions.solution, 
          questions.question_url, questions.option_1_url, questions.option_2_url, questions.option_3_url, questions.option_4_url,
          questions.solution_url, translations.t_question, translations.t_option_1, translations.t_option_2, translations.t_option_3, translations.t_option_4, 
          translations.t_answer, translations.t_question_url, translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, 
          translations.t_option_4_url,translations.t_solution_url, translations.t_solution 
          from questions
          join test_questions on test_questions.question_id=questions.question_id
          join test on test.test_id = test_questions.test_id 
          join user1 as u1 ON test.teacher_id = u1.user_id 
          JOIN class_tests ON test.test_id = class_tests.test_id 
          JOIN class ON class_tests.class_id = class.class_id 
          JOIN class_members ON class.class_id = class_members.class_id 
          JOIN user1 ON class_members.student_id = user1.user_id and test.test_id=? and class.class_id=? 
          and questions.deleted=0 and questions.approval='approved' and test_questions.deleted=0 and class_tests.deleted=0
          left join translations on translations.question_id=questions.question_id and translations.language=user1.preferred_language 
          where user1.user_id =?;`, 
          [req.params.test_id, req.params.class_id, req.user[0].user_id], function (error, results) {
            if (error) next(error); 
            else {
                console.log("start new - class test");
                console.log('req.params.assigned_questions_id',req.params.assigned_questions_id);
  
                res.render('t_student_analytics1', { data0: results, class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
              }
            });
        }
        else 
        {
          if (req.params.class_id=='n')
          {
            con.query(`SELECT DISTINCT aq.is_timed, TIME_TO_SEC(aq.time) as time, questions.question_id,translations.language, translations.translation_id,
            u1.user_name as teacher_name, test_questions.test_id, test.test_name, questions.question_id,
            questions.question, questions.option_1, questions.option_2, questions.option_3, questions.option_4, questions.answer, questions.solution,
            questions.question_url, questions.option_1_url, questions.option_2_url, questions.option_3_url, questions.option_4_url,
            questions.solution_url, translations.t_question, translations.t_option_1, translations.t_option_2, translations.t_option_3, translations.t_option_4,
            translations.t_answer, translations.t_question_url, translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url,
            translations.t_option_4_url, translations.t_solution_url, translations.t_solution
            FROM questions
            JOIN test_questions ON test_questions.question_id = questions.question_id
            JOIN test ON test.test_id = test_questions.test_id
            JOIN assigned_questions aq ON aq.test_id = test.test_id
            JOIN user1 AS u1 ON aq.teacher_id = u1.user_id
            JOIN user1 AS u2 ON aq.student_id = u2.user_id AND aq.test_id = ? AND aq.class_id IS NULL
            and questions.deleted=0 and questions.approval='approved' and test_questions.deleted=0 and aq.deleted=0
            LEFT JOIN translations ON translations.question_id = questions.question_id AND translations.language = u2.preferred_language
            WHERE u2.user_id = ?;`, 
            [req.params.test_id, req.user[0].user_id], function (error, results) {
              if (error) next(error); 
              else {
                  console.log("start new - unaffiliated individual test");
                  console.log('req.params.assigned_questions_id',req.params.assigned_questions_id);
                  console.log('req.params.class_id',req.params.class_id);

    
                  res.render('t_student_analytics1', { data0: results, class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
                }
              });
          }
          else {
            con.query(`select distinct aq.is_timed, TIME_TO_SEC(aq.time) as time, questions.question_id, class.class_id,translations.language,translations.translation_id, 
            u1.user_name as teacher_name, test_questions.test_id,test.test_name, questions.question_id,
            questions.question,questions.option_1,questions.option_2, questions.option_3,questions.option_4,questions.answer,questions.solution, questions.question_url,
            questions.option_1_url, questions.option_2_url, questions.option_3_url, questions.option_4_url,
            questions.solution_url, translations.t_question, translations.t_option_1, translations.t_option_2, translations.t_option_3, translations.t_option_4, 
            translations.t_answer, translations.t_question_url, translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, 
            translations.t_option_4_url, translations.t_solution_url, translations.t_solution 
            from questions 
            join test_questions on test_questions.question_id=questions.question_id 
            join test on test.test_id = test_questions.test_id 
            join user1 as u1 ON test.teacher_id = u1.user_id 
            join assigned_questions aq on aq.test_id = test.test_id
            JOIN class ON aq.class_id = class.class_id 
            JOIN class_members ON class.class_id = class_members.class_id 
            JOIN user1 ON class_members.student_id = user1.user_id and test.test_id=? and class.class_id=?
            and questions.deleted=0 and questions.approval='approved' and test_questions.deleted=0 and aq.deleted=0 and class_members.deleted=0
            left join translations on translations.question_id=questions.question_id and translations.language=user1.preferred_language where user1.user_id =?;`, 
            [req.params.test_id, req.params.class_id, req.user[0].user_id], function (error, results) {
              if (error) next(error); 
              else {
                  console.log("start new - individual test");
                  console.log('req.params.assigned_questions_id',req.params.assigned_questions_id);
    
                  res.render('t_student_analytics1', { data0: results, class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
                }
              });
          }
        }
      }
      else if(results.length!='0' && req.params.assigned_questions_id=='n')
      {
        con.query(`SELECT distinct str.class_id, q.question_id, test.test_name, t.language,
        t.translation_id,q.question, q.option_1,q.option_2, q.option_3,q.option_4,q.answer,
        q.solution, q.question_url,
        q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
        q.solution_url, t.t_question, t.t_option_1, 
        t.t_option_2, t.t_option_3, t.t_option_4, t.t_answer, t.t_question_url, t.t_option_1_url, t.t_option_2_url, t.t_option_3_url, 
        t.t_option_4_url, t.t_solution_url, t.t_solution,str.student_id, str.test_id, str.score, str.option_selected, str.is_submitted, str.submitted_date, str.deleted
        FROM student_test_result str 
        join test on str.test_id = test.test_id 
        join test_questions tq on tq.test_id = test.test_id 
        join questions q on tq.question_id = q.question_id
        and str.student_id=? and str.test_id=? and str.class_id=? and str.deleted='0' AND str.is_submitted =1
        and q.deleted=0 and q.approval='approved' and tq.deleted=0
        left join translations t on t.question_id=q.question_id 
        and t.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
        [req.user[0].user_id, req.params.test_id, req.params.class_id, req.user[0].user_id], function (error, results) {      
          if (error) next(error); 
          else {
            console.log("saved class");
            
            res.render('t_student_analytics1', { data0: results,saved:JSON.parse(results[0].option_selected), class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
          }
        });
      }
      else 
      {
        if (req.params.class_id=='n'){
          con.query(`SELECT distinct str.class_id, q.question_id, test.test_name,t.language,t.translation_id,
          q.question, q.option_1,q.option_2, q.option_3,
          q.option_4,q.answer,q.solution, q.question_url, q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
          q.solution_url, t.t_question, t.t_option_1, t.t_option_2, t.t_option_3, t.t_option_4, t.t_answer, t.t_question_url, 
          t.t_option_1_url, t.t_option_2_url, t.t_option_3_url, t.t_option_4_url, t.t_solution_url, t.t_solution,
          str.student_id, str.test_id, str.score, str.option_selected, str.is_submitted, str.submitted_date, str.deleted
          FROM student_test_result str 
          join test on str.test_id = test.test_id 
          join test_questions tq on tq.test_id = test.test_id 
          join questions q on tq.question_id = q.question_id
          and str.student_id=? and str.test_id=? and str.class_id is null
          and str.deleted='0' AND str.is_submitted = 1 and str.is_individual='y'
          and q.deleted=0 and q.approval='approved' and tq.deleted=0
          left join translations t on t.question_id=q.question_id 
          and t.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
          [req.user[0].user_id, req.params.test_id, req.user[0].user_id], function (error, results) {      
            if (error) next(error); 
            else {
              console.log("saved individual");
              
              res.render('t_student_analytics1', { data0: results,saved:JSON.parse(results[0].option_selected), class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
            }
          });
          console.log("saved unaffiliated individual");
        }
        else {
          con.query(`SELECT distinct str.class_id, q.question_id, test.test_name,t.language,t.translation_id,q.question, q.option_1,q.option_2, q.option_3,q.option_4,q.answer,q.solution, 
          q.question_url, q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
          q.solution_url, t.t_question, t.t_option_1, 
          t.t_option_2, t.t_option_3, t.t_option_4, t.t_answer, t.t_question_url, t.t_option_1_url, t.t_option_2_url, t.t_option_3_url, 
          t.t_option_4_url, t.t_solution_url, t.t_solution,str.student_id, str.test_id, str.score, str.option_selected, str.is_submitted, str.submitted_date, str.deleted
          FROM student_test_result str 
          join test on str.test_id = test.test_id 
          join test_questions tq on tq.test_id = test.test_id 
          join questions q on tq.question_id = q.question_id and q.deleted=0
          and str.student_id=? and str.test_id=? and str.class_id=? and str.deleted='0' AND str.is_submitted = 1 and str.is_individual='y'
          and q.deleted=0 and q.approval='approved' and tq.deleted=0
          left join translations t on t.question_id=q.question_id 
          and t.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
          [req.query.user_id, req.params.test_id, req.params.class_id, req.query.user_id], function (error, results) {      
            if (error) next(error); 
            else {
              console.log("saved individual");
              console.log("options_seleted:", results)
              res.render('t_student_analytics1', { data0: results,saved:JSON.parse(results[0].option_selected), class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0], class_name:req.query.class_name,test_name:req.query.test_name,user_name:req.query.user_name,user_id:req.query.user_id });
            }
          });
          console.log("options_seleted:", req)
        }
      }
      });
    } catch (err) {
      next(err);
    }
  })

  router.get("/classanalytics/:test_id/:class_id", isLoggedIn, isTeacher, (req, res, next) => {
    try {
      con.query(`SELECT distinct str.class_id,t.language, q.question_id, test.test_name,t.translation_id,q.question, q.option_1,q.option_2, q.option_3,q.option_4,q.answer,
      q.solution, q.question_url,
      q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
      q.solution_url, t.t_question, t.t_option_1, 
      t.t_option_2, t.t_option_3, t.t_option_4, t.t_answer, t.t_question_url, t.t_option_1_url, t.t_option_2_url, t.t_option_3_url, 
      t.t_option_4_url, t.t_solution_url, t.t_solution,str.student_id, str.test_id, str.score, str.option_selected, str.is_submitted, str.submitted_date, str.deleted
      FROM student_test_result str 
      join test on str.test_id = test.test_id 
      join test_questions tq on tq.test_id = test.test_id 
      join questions q on tq.question_id = q.question_id and q.approval='approved' and q.deleted=0
      and str.student_id=? and str.test_id=? and str.class_id=? and str.deleted='0' AND str.is_submitted = 1  and test.deleted=0 and tq.deleted=0
      left join translations t on t.question_id=q.question_id 
      and t.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?)`, [req.query.u,req.params.test_id,req.params.class_id,req.query.u], function (error, results) {
        if (error) next(error); 
        else
        {
          
          let class_name=req.query.c;
          
          let test_name=req.query.t;
          let class_id=req.params.class_id;
          let test_id=req.params.test_id;
          console.log("saved:",JSON.parse(results[0].option_selected))
          res.render('t_class_analytics1',{class_name,class_id,test_id,test_name,saved:JSON.parse(results[0].option_selected),data0:results,user:req.user[0],user_name:req.query.un});
        }
        });
    } catch (err) {
      next(err);
    }
  // console.log("saved:",JSON.parse(results[0].option_selected))
  })




  router.post('/questions/AddQuestion', isLoggedIn, isTeacher, (req, res) => {
   

    con.query('select * from reference_tags where year=? and month=? and course=? and topic=? and sub_topic=? and difficulty=? and standard=?', [req.body.year, req.body.month, req.body.course, req.body.topic, req.body.sub_topic, req.body.difficulty, req.body.standard], function(error, reference_tags_obj) {
        if (error) throw error;
       
        if (reference_tags_obj.length <= 0) {
           
            con.query('insert into reference_tags(year,month,course,topic,sub_topic,difficulty,standard) values(?,?,?,?,?,?,?);', [req.body.year, req.body.month, req.body.course, req.body.topic, req.body.sub_topic, req.body.difficulty, req.body.standard], function(error, results) {
                if (error) throw (error);
          
                if (results.insertId)
                    con.query('select * from reference_tags where reference_tags_id=?;', [results.insertId], function(error, reference_tags_obj) {
                        if (error) throw error;
                    

                        var sqlQuery = 'insert into questions set creator_id=?,question = ?, option_1 = ?,option_2 = ?,option_3 = ?,option_4= ?,answer = ?,reference_tags_id=?,questions.created_date=now(),approval="pending",solution =?,';
                        var queryParams = [req.user[0].user_id, req.body.questionData.question, req.body.questionData.option_1, req.body.questionData.option_2, req.body.questionData.option_3, req.body.questionData.option_4, req.body.questionData.answer, reference_tags_obj[0].reference_tags_id, req.body.questionData.solution];

                        // Only include URLs that are present and not equal to '-1'
                        if (req.body.questionData.question_url != '-1') {
                            sqlQuery += ' question_url = ?,';
                            queryParams.push(req.body.questionData.question_url);
                        }
                        if (req.body.questionData.solution_url != '-1') {
                            sqlQuery += ' solution_url = ?,';
                            queryParams.push(req.body.questionData.solution_url);
                        }
                        if (req.body.questionData.option_1_url != '-1') {
                            sqlQuery += ' option_1_url = ?,';
                            queryParams.push(req.body.questionData.option_1_url);
                        }
                        if (req.body.questionData.option_2_url != '-1') {
                            sqlQuery += ' option_2_url = ?,';
                            queryParams.push(req.body.questionData.option_2_url);
                        }
                        if (req.body.questionData.option_3_url != '-1') {
                            sqlQuery += ' option_3_url = ?,';
                            queryParams.push(req.body.questionData.option_3_url);
                        }
                        if (req.body.questionData.option_4_url != '-1') {
                            sqlQuery += ' option_4_url = ?,';
                            queryParams.push(req.body.questionData.option_4_url);
                        }

                        // Remove the trailing comma
                        sqlQuery = sqlQuery.replace(/,$/, '');


                        con.query(sqlQuery, queryParams, function(error, results) {
                            if (error) throw error;
                            for (let i = 0; i < req.body.createTransilationResults.length && req.body.createTransilationResults[0] != -1; i++) {
                                const data = req.body.createTransilationResults[i];
                                con.query('INSERT INTO translations (question_id, t_question, t_option_1,t_option_2,t_option_3,t_option_4,t_answer,language,t_solution,t_question_url,t_solution_url,t_option_1_url,t_option_2_url,t_option_3_url,t_option_4_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [results.insertId, data.t_question, data.t_option_1, data.t_option_2, data.t_option_3, data.t_option_4, data.t_answer, data.language, data.t_solution, data.t_question_url, data.t_solution_url, data.t_option_1_url, data.t_option_2_url, data.t_option_3_url, data.t_option_4_url], function(error, results) {
                                    if (error) throw error;
                                
                                });

                            }
                        });

                    })
            })
        } else {
            
            var sqlQuery = 'insert into questions set creator_id=?,question = ?, option_1 = ?,option_2 = ?,option_3 = ?,option_4= ?,answer = ?,reference_tags_id=?,questions.created_date=now(),approval="pending",solution =?,';
            var queryParams = [req.user[0].user_id, req.body.questionData.question, req.body.questionData.option_1, req.body.questionData.option_2, req.body.questionData.option_3, req.body.questionData.option_4, req.body.questionData.answer, reference_tags_obj[0].reference_tags_id, req.body.questionData.solution];

            // Only include URLs that are present and not equal to '-1'
            if (req.body.questionData.question_url != '-1') {
                sqlQuery += ' question_url = ?,';
                queryParams.push(req.body.questionData.question_url);
            }
            if (req.body.questionData.solution_url != '-1') {
                sqlQuery += ' solution_url = ?,';
                queryParams.push(req.body.questionData.solution_url);
            }
            if (req.body.questionData.option_1_url != '-1') {
                sqlQuery += ' option_1_url = ?,';
                queryParams.push(req.body.questionData.option_1_url);
            }
            if (req.body.questionData.option_2_url != '-1') {
                sqlQuery += ' option_2_url = ?,';
                queryParams.push(req.body.questionData.option_2_url);
            }
            if (req.body.questionData.option_3_url != '-1') {
                sqlQuery += ' option_3_url = ?,';
                queryParams.push(req.body.questionData.option_3_url);
            }
            if (req.body.questionData.option_4_url != '-1') {
                sqlQuery += ' option_4_url = ?,';
                queryParams.push(req.body.questionData.option_4_url);
            }

            // Remove the trailing comma
            sqlQuery = sqlQuery.replace(/,$/, '');

            // Add the WHERE clause


            con.query(sqlQuery, queryParams, function(error, results) {
                if (error) throw error;

                for (let i = 0; i < req.body.createTransilationResults.length && req.body.createTransilationResults[0] != -1; i++) {
                    const data = req.body.createTransilationResults[i];
                    con.query('INSERT INTO translations (question_id, t_question, t_option_1,t_option_2,t_option_3,t_option_4,t_answer,language,t_solution,t_question_url,t_solution_url,t_option_1_url,t_option_2_url,t_option_3_url,t_option_4_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [results.insertId, data.t_question, data.t_option_1, data.t_option_2, data.t_option_3, data.t_option_4, data.t_answer, data.language, data.t_solution, data.t_question_url, data.t_solution_url, data.t_option_1_url, data.t_option_2_url, data.t_option_3_url, data.t_option_4_url], function(error, results) {
                        if (error) throw error;
                       
                    });

                }

            })

        }
    });

});
router.get('/AddQuestionModal', isLoggedIn, isTeacher, (req, res) => {


  con.query('select distinct predefined.predefined_id, predefined.type, predefined.type_value from predefined where predefined.deleted != 1;', function(er, refResults) {
      if (er) throw er;
      //dummy la data
      translationResults = [];
      questionResults = [{
          question_id: -1,
          creator_id: -1,
          question: '',
          option_1: '',
          option_2: '',
          option_3: '',
          option_4: '',
          answer: '',
          solution: '',
          created_date: '',
          approval: '',
          question_url: '',
          answer_url: null,
          reference_tags_id: '',
          deleted: 0,
          year: '',
          month: '',
          course: '',
          topic: '',
          sub_topic: '',
          difficulty: '',
          standard: '',
          question_tag: ''
      }];
      res.render('t_editQuestionModal', { translationResults, questionResults, refResults }, function(err, html) {
          if (err) throw err;
          res.send(html)
      });
  })

})
router.get('/addquestion', isLoggedIn, isTeacher, (req, res) => {

 res.render('t_addquestion',{user:req.user[0]});

})

router.post('/classpreviewquestions', isLoggedIn, isTeacher, (req, res) => {

  con.query(`select t.test_name,q.question_id,q.question, q.option_1,q.option_2, q.option_3,
  q.option_4,q.answer,q.solution, q.question_url, q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
  q.solution_url from questions q
join test_questions tq on tq.question_id=q.question_id
join test t on t.test_id=tq.test_id
where t.test_id=? and tq.deleted=0 and q.deleted=0 and q.approval='approved';`, [req.body.test_id], function (error, results) {
    if (error) next(error); 
   
    res.send(results);
  
  });

 
 })
 router.post('/studentpreviewquestions', isLoggedIn, isTeacher, (req, res) => {

  con.query(`select t.test_name,q.question_id,q.question, q.option_1,q.option_2, q.option_3,
  q.option_4,q.answer,q.solution, q.question_url, q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
  q.solution_url from questions q
join test_questions tq on tq.question_id=q.question_id
join test t on t.test_id=tq.test_id
where t.test_id=? and tq.deleted=0 and q.deleted=0 and q.approval='approved';`, [req.body.test_id], function (error, results) {
    if (error) next(error); 
   
    res.send(results);
  
  });

 
 })
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).render('error', { error: err });
}
router.use(errorHandler);
  
  

module.exports=router