const express = require('express')
const router = express.Router()
const con = require('../db');

function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}

function isAdmin(req, res, next) {
  if (req.user[0].user_id != null) {
    if (req.user[0].user_role == 'admin') {
      next();
    }
    else {

      res.sendStatus(401);
    }
  }
}

function isTeacher(req, res, next) {
  if (req.user[0].user_id != null) {
    if (req.user[0].user_role == 'teacher' || req.user[0].user_role == 'admin') {
      next();
    }
    else {
      res.sendStatus(401);
    }
  }
}

function isStudent(req, res, next) {
  if (req.user[0].user_id != null) {
    if (req.user[0].user_role == 'student' || req.user[0].user_role == 'admin') {
      next();
    }
    else {
      res.sendStatus(401);
    }
  }
}

//Student Landing Page
router.get("/", isLoggedIn, isStudent,(req, res, next) => {
  try {
    con.query(`select test.test_id, test.test_name, test.course, test.sub_topic, test.topic, stresult.is_submitted, 
    DATE_FORMAT(stresult.submitted_date, '%m/%d/%Y %h:%i %p') AS submitted_date, stresult.score, stresult.percentage, stresult.is_timed 
    from test join student_test_result stresult on test.test_id = stresult.test_id where stresult.student_id=? and stresult.class_id is null
    and test.topic IS NOT NULL and test.sub_topic IS NOT NULL and stresult.is_submitted=1 order by submitted_date desc;
  
    SELECT class_tests.is_timed, str.is_submitted,DATE_FORMAT(str.submitted_date, '%m/%d/%Y %h:%i %p') as submitted_date, 
    test.test_id, str.percentage, DATE_FORMAT(class_tests.created_date, '%m/%d/%Y %h:%i %p') as assigned_date,
    class.class_id, class.class_name, test.test_name, test.course, 
    DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p') AS due_date, COALESCE(NULL, 'n') AS assigned_questions_id
    FROM test
    JOIN test_questions ON test_questions.test_id = test.test_id
    JOIN class_tests ON test.test_id = class_tests.test_id
    JOIN class ON class_tests.class_id = class.class_id
    JOIN class_members ON class.class_id = class_members.class_id
    JOIN class_teachers ON class_teachers.class_id = class.class_id
    JOIN user1 u2 ON class_teachers.teacher_id = u2.user_id
    JOIN user1 ON class_members.student_id = user1.user_id
    and user1.user_id =?
	left join student_test_result str on str.student_id = class_members.student_id
    and str.test_id = test.test_id and str.class_id = class.class_id
    GROUP BY test.test_id
    UNION
    SELECT aq.is_timed, str.is_submitted,DATE_FORMAT(str.submitted_date, '%m/%d/%Y %h:%i %p') as submitted_date, 
    test.test_id, str.percentage, DATE_FORMAT(aq.created_date, '%m/%d/%Y %h:%i %p') as assigned_date,
    class.class_id, class.class_name, test.test_name, test.course, 
    DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p' ) AS due_date, aq.assigned_questions_id
    FROM test
    JOIN assigned_questions aq ON aq.test_id = test.test_id
    JOIN test_questions ON test_questions.test_id = test.test_id
    JOIN class ON aq.class_id = class.class_id
    JOIN class_members ON class.class_id = class_members.class_id
    JOIN class_teachers ON class_teachers.class_id = class.class_id
    JOIN user1 u2 ON class_teachers.teacher_id = u2.user_id
    JOIN user1 ON class_members.student_id = user1.user_id
    and user1.user_id=? AND aq.student_id=? AND test.deleted=0
	left join student_test_result str on str.student_id = class_members.student_id
    and str.test_id = test.test_id and str.class_id = class.class_id
    GROUP BY test.test_id
	UNION
    SELECT aq.is_timed, str.is_submitted,DATE_FORMAT(str.submitted_date, '%m/%d/%Y %h:%i %p') as submitted_date, 
    test.test_id, str.percentage, DATE_FORMAT(aq.created_date, '%m/%d/%Y %h:%i %p') as assigned_date,
    COALESCE(NULL, 'n') as class_id, COALESCE(NULL, 'n') as class_name, test.test_name, test.course, 
    DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p' ) AS due_date, aq.assigned_questions_id
    FROM test
    JOIN assigned_questions aq ON aq.test_id = test.test_id
    JOIN user1 on aq.student_id = user1.user_id
	JOIN user1 u1 ON aq.teacher_id = u1.user_id
    JOIN test_questions ON test_questions.test_id = test.test_id
    and aq.student_id=? AND test.deleted=0 and aq.class_id is null
	left join student_test_result str on aq.student_id = str.student_id
    and str.test_id = test.test_id and str.class_id is null
    GROUP BY test.test_id
    order by submitted_date desc;`, 
    [req.user[0].user_id, req.user[0].user_id, req.user[0].user_id, req.user[0].user_id, req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else {
        res.render('s_home', { data0: results[0], data1: results[1], user: req.user[0] });
      }
    });
  } catch (err) {
    next(err);
  }
})



//Student Profile
router.get("/profile", isLoggedIn, isStudent, async (req, res, next) => {
  try {
    con.query(`select type_value from predefined where type=?;select type_value from predefined where type=?;
    select preferred_language,school_name from user1 where user_id = ?;`,
    ['language', 'school name', req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else {
        res.render('s_profile', { data0: results[0], data1: results[1], data2: results[2], user: req.user[0] });
      }
    });
  } catch (err) {
    next(err);
  }
});

//update student profile
router.post('/profile', (req, res, next) => {
  try {
    con.query('update user1 set preferred_language = ?,school_name = ? where user_id=?;', 
    [req.body.preferred_language, req.body.school_name, req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else {
        console.log(req);
        res.redirect('profile');
      }
    });
  } catch (err) {
    next(err);
  }
});



//Student Learning by Topic
router.get("/learning/topic", isLoggedIn, isStudent, async (req, res, next) => {
  try {
    // First query to get distinct courses
    con.query(`SELECT DISTINCT course FROM reference_tags WHERE course IS NOT NULL AND course <> ''`, (error, courseResults) => {
      if (error) {
        res.render('s_learning_nodata', { data0: results[0], data1: results[1], user: req.user[0] });
        return;
      }
      const courses = courseResults.map(courseResult => courseResult.course);

      const selectedCourse = req.query.course || 'Algebra I';

      // Second query to get distinct topics for the selected course
      con.query(`SELECT DISTINCT topic FROM reference_tags WHERE course = ? and topic is not null AND topic <> ''`, [selectedCourse], (error, topicResults) => {
        if (error) {
          res.render('s_learning_nodata', { data0: results[0], data1: results[1], user: req.user[0] });
          return;
        }
        const topics = topicResults.map(topicResult => topicResult.topic);

        // Third query to get subtopics for each topic
        const subTopicsByTopic = {};
        let numTopicsProcessed = 0;

        for (const topic of topics) {
          con.query(`SELECT DISTINCT sub_topic FROM reference_tags WHERE topic = ? and sub_topic is not null AND sub_topic <> ''`, [topic], (error, subTopicResults) => {
            if (error) next(error); 

            subTopicsByTopic[topic] = subTopicResults.map(subTopicResult => subTopicResult.sub_topic);

            // Check if all topics have been processed
            numTopicsProcessed++;
            if (numTopicsProcessed === topics.length) {
              // Render both courses, topics, and subtopics to the 'topics' view
              res.render('s_learning_topics', { courses, selectedCourse, topics, subTopicsByTopic, user: req.user[0] });
            }
          });
        }
      });
    });
  } catch (err) {
    next(err);
  }
});





//Student Learning by Topic - All Questions Topic wise
router.get("/learning/topic/:topic", isLoggedIn, isStudent, (req, res, next) => {
  try {
    con.query(`SELECT reference_tags.topic, reference_tags.reference_tags_id,translations.language, translations.translation_id, questions.question_id, questions.question,
    questions.option_1, questions.option_2, questions.option_3, questions.option_4, questions.answer, questions.solution, questions.question_url,
    questions.option_1_url, questions.option_2_url, questions.option_3_url, questions.option_4_url,
    questions.solution_url, translations.t_question, translations.t_option_1, translations.t_option_2, translations.t_option_3, translations.t_option_4,
    translations.t_question_url, translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, translations.t_option_4_url,
    translations.t_answer, translations.t_solution_url, translations.t_solution
    FROM questions
    JOIN reference_tags ON questions.reference_tags_id = reference_tags.reference_tags_id AND reference_tags.topic = ?
    and questions.approval='approved' and questions.deleted=0 and reference_tags.deleted=0
    LEFT JOIN translations ON translations.question_id = questions.question_id
    AND translations.language = (
        SELECT preferred_language
        FROM user1
        WHERE user_id = ?);`, 
    [req.params.topic, req.user[0].user_id], function (error, results) {
      if (error) {
        res.render('s_learning_nodata', { data0: results, user: req.user[0] });
      } else {
        if (results.length === 0) {
          res.render('s_learning_nodata', { data0: results, user: req.user[0] });
        } else {
        res.render('s_learning_topics_all_ques', { data0: results, user: req.user[0] });
      }
      }
    });
  } catch (err) {
    next(err);
  }
})


//Student Learning by Topic - All Questions Sub-Topic wise
router.get("/learning/topic/:topic/:subTopic", isLoggedIn, isStudent, (req, res, next) => {
  try {
    con.query(`SELECT reference_tags.topic,reference_tags.sub_topic, reference_tags.reference_tags_id,translations.language,translations.translation_id,questions.question_id,questions.question,
    questions.option_1,questions.option_2,questions.option_3,questions.option_4,questions.answer,questions.question_url,
    questions.option_1_url,questions.option_2_url, questions.option_3_url,questions.option_4_url, 
    questions.solution_url,questions.solution, 
    translations.t_question, translations.t_option_1, translations.t_option_2, translations.t_option_3, translations.t_option_4,translations.t_answer, 
    translations.t_question_url, translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, translations.t_option_4_url, 
    translations.t_solution_url, translations.t_solution 
    from questions 
    join reference_tags on reference_tags.reference_tags_id = questions.reference_tags_id and topic = ? and sub_topic = ? 
    and questions.approval='approved' and questions.deleted=0 and reference_tags.deleted=0
    left join translations on translations.question_id=questions.question_id and translations.language = (
      SELECT preferred_language
      FROM user1
      WHERE user_id = ?);`, 
    [req.params.topic, req.params.subTopic, req.user[0].user_id], function (error, results) {
      if (error) {
        res.render('s_learning_nodata', { data0: results, user: req.user[0] });
      } else {
        if (results.length === 0) {
          res.render('s_learning_nodata', { data0: results, user: req.user[0] });
        } else {
          res.render('s_learning_topics_chap_ques', { data0: results, user: req.user[0] });
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

//Student Learning Archives

router.get("/learning/archive", isLoggedIn, isStudent, (req, res, next) => {
  try {
    con.query(`SELECT DISTINCT reference_tags.year FROM reference_tags where year is not null and year <> '';
    SELECT DISTINCT reference_tags.month FROM reference_tags where month is not null and month <> '';
    SELECT reference_tags.year,reference_tags.month,reference_tags.reference_tags_id,
    translations.translation_id,translations.language,
    questions.question_id,questions.question,questions.option_1,questions.option_2,questions.option_3,questions.option_4,
    questions.answer,questions.question_url, 
    questions.option_1_url,questions.option_2_url, questions.option_3_url,questions.option_4_url, 
    questions.solution_url,questions.solution, translations.t_question, translations.t_option_1, 
    translations.t_option_2, translations.t_option_3, translations.t_option_4, translations.t_answer, translations.t_question_url, 
    translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, translations.t_option_4_url, 
    translations.t_solution_url, translations.t_solution 
    from questions 
    join reference_tags on reference_tags.reference_tags_id = questions.reference_tags_id 
    and questions.approval="approved" and questions.deleted=0 and reference_tags.deleted=0
    left join translations on translations.question_id=questions.question_id 
    and translations.language = (SELECT preferred_language FROM user1 WHERE user_id = ?)
    WHERE
    reference_tags.year IS NOT NULL and reference_tags.year <> ''
    AND reference_tags.month IS NOT NULL and reference_tags.month <> '';`,
    [req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else {
        res.render('s_learning_archive', { data0: results[0], data1: results[1], user: req.user[0], data3: results[2],submittedMonth: null, submittedYear: null, formSubmitted: false });
      }
    });
  } catch (err) {
    next(err);
  }
})

router.post('/learning/archive', (req, res, next) => {
  try {
    res.redirect('/student/learning/archive/' + req.body.year + '/' + req.body.month);
  } catch (err) {
    next(err);
  }
});

router.get('/learning/archive/:year/:month', (req, res, next) => {
  try {
    const submittedMonth = req.params.month;
    const submittedYear = req.params.year;
    
    if(req.params.month=='Select Month')
  {
    con.query(`SELECT DISTINCT reference_tags.year FROM reference_tags where year is not null and year <> '';
    SELECT DISTINCT reference_tags.month FROM reference_tags where month is not null and month <> '';
    SELECT reference_tags.year,reference_tags.month,reference_tags.reference_tags_id,translations.translation_id,
    questions.question_id,questions.question,questions.option_1,questions.option_2,questions.option_3,questions.option_4,
    questions.answer,questions.question_url,
    questions.option_1_url,questions.option_2_url, questions.option_3_url,questions.option_4_url, 
    questions.solution_url,questions.solution, translations.t_question, translations.t_option_1, 
    translations.t_option_2, translations.t_option_3, translations.t_option_4, translations.t_answer, translations.t_question_url, 
    translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, translations.t_option_4_url, 
    translations.t_solution_url, translations.t_solution 
    from questions 
    join reference_tags on reference_tags.reference_tags_id = questions.reference_tags_id 
    and reference_tags.year=? and questions.approval="approved" and questions.deleted=0 and reference_tags.deleted=0
    left join translations on translations.question_id=questions.question_id 
    left join translations on translations.question_id=questions.question_id 
    and translations.language = (SELECT preferred_language FROM user1 WHERE user_id = ?);`,
    [req.params.year, req.user[0].user_id], (error, results) => {
      if (error) next(error); 
      res.render('s_learning_archive', { data0: results[0], data1: results[1], user: req.user[0], data3: results[2], submittedMonth, submittedYear, formSubmitted: true});
    });
  }
  else if(req.params.year=='Select Year')
  {
    con.query(`SELECT DISTINCT reference_tags.year FROM reference_tags where year is not null and year <> '';
    SELECT DISTINCT reference_tags.month FROM reference_tags where month is not null and month <> ''; 
    SELECT reference_tags.year,reference_tags.month,reference_tags.reference_tags_id,translations.translation_id,
    questions.question_id,questions.question,questions.option_1,
    questions.option_2,questions.option_3,questions.option_4,questions.answer,questions.question_url,
    questions.option_1_url,questions.option_2_url, questions.option_3_url,questions.option_4_url, 
    questions.solution_url,questions.solution, translations.t_question, 
    translations.t_option_1, translations.t_option_2, translations.t_option_3, translations.t_option_4, translations.t_answer, translations.t_question_url,
    translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, translations.t_option_4_url, 
     translations.t_solution_url, translations.t_solution 
     from questions 
     join reference_tags on reference_tags.reference_tags_id = questions.reference_tags_id and reference_tags.month=? 
     and questions.approval="approved" and questions.deleted=0 and reference_tags.deleted=0
     left join translations on translations.question_id=questions.question_id 
     and translations.language = (SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
     [req.params.month, req.user[0].user_id], (error, results) => {
      if (error) next(error); 
      res.render('s_learning_archive', { data0: results[0], data1: results[1], user: req.user[0], data3: results[2], submittedMonth, submittedYear, formSubmitted: true});
    });
  }
  else{
    console.log("month",req.params.month);
    console.log("year",req.params.year);
    con.query(`SELECT DISTINCT reference_tags.year FROM reference_tags where year is not null and year <> '';
    SELECT DISTINCT reference_tags.month FROM reference_tags where month is not null and month <> ''; 
    SELECT reference_tags.year,reference_tags.month,reference_tags.reference_tags_id,translations.translation_id,
    questions.question_id,questions.question,questions.option_1,
    questions.option_2,questions.option_3,questions.option_4,questions.answer,questions.question_url,
    questions.option_1_url,questions.option_2_url, questions.option_3_url,questions.option_4_url, 
    questions.solution_url,questions.solution, translations.t_question, 
    translations.t_option_1, translations.t_option_2, translations.t_option_3, translations.t_option_4, translations.t_answer, translations.t_question_url, 
    translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, translations.t_option_4_url, 
    translations.t_solution_url, translations.t_solution 
    from questions join reference_tags on reference_tags.reference_tags_id = questions.reference_tags_id and reference_tags.year=? and reference_tags.month=? 
    and questions.approval="approved" and questions.deleted=0 and reference_tags.deleted=0
    left join translations on translations.question_id=questions.question_id 
    and translations.language = (SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
    [req.params.year, req.params.month, req.user[0].user_id], (error, results) => {
      if (error) next(error); 
      res.render('s_learning_archive', { data0: results[0], data1: results[1], user: req.user[0], data3: results[2], submittedMonth, submittedYear, formSubmitted: true});
    });
  }
  } catch (err) {
    next(err);
  }
});



//Student Assessment - Assigned by Teacher
router.get("/assessment/assigned", isLoggedIn, isStudent, (req, res, next) => {
  try {
    con.query(`SELECT class_tests.is_timed, TIME_TO_SEC(class_tests.time) as time, str.is_submitted, str.option_selected, 
    class_members.student_id, test.test_id, class.class_id, class.class_name, UPPER(test.test_name) AS test_name, 
    test.course, DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p') AS due_date,
        COUNT(DISTINCT test_questions.question_id) AS question_count,
        GROUP_CONCAT(DISTINCT u2.user_name SEPARATOR ',') AS teacher_name,
        COALESCE(NULL, 'n') AS assigned_questions_id
        FROM test
        JOIN test_questions ON test_questions.test_id = test.test_id
        join questions q on test_questions.question_id = q.question_id
        JOIN class_tests ON test.test_id = class_tests.test_id
        JOIN class ON class_tests.class_id = class.class_id
        JOIN class_members ON class.class_id = class_members.class_id
        JOIN class_teachers ON class_teachers.class_id = class.class_id
        JOIN user1 u2 ON class_teachers.teacher_id = u2.user_id
        JOIN user1 ON class_members.student_id = user1.user_id
        and user1.user_id = ?
        and test.deleted=0 and test_questions.deleted=0 and class.deleted=0
         and class_tests.deleted=0 and class_members.deleted=0 and q.deleted=0 and q.approval='approved'
      left join student_test_result str on str.student_id = class_members.student_id
        and str.test_id = test.test_id and str.class_id = class.class_id
        GROUP BY test.test_id
      HAVING str.is_submitted IS NULL OR str.is_submitted = 0 OR str.is_submitted != 1
        UNION
        SELECT aq.is_timed, TIME_TO_SEC(aq.time) as time, str.is_submitted, str.option_selected, 
        class_members.student_id, test.test_id, class.class_id, class.class_name, 
        UPPER(test.test_name) AS test_name, test.course, DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p') AS due_date,
        COUNT(DISTINCT test_questions.question_id) AS question_count,
        GROUP_CONCAT(DISTINCT u2.user_name SEPARATOR ',') AS teacher_name,
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
        and user1.user_id= ? AND aq.student_id= ?
        AND test.deleted=0 and aq.deleted=0 and test_questions.deleted=0
        and class.deleted=0 and class_members.deleted=0 and q.deleted=0 and q.approval='approved'
      left join student_test_result str on str.student_id = class_members.student_id
        and str.test_id = test.test_id and str.class_id = class.class_id
        GROUP BY test.test_id
      HAVING str.is_submitted IS NULL OR str.is_submitted = 0 OR str.is_submitted != 1
      UNION
        SELECT aq.is_timed, TIME_TO_SEC(aq.time) as time, str.is_submitted, str.option_selected, 
        aq.student_id, test.test_id, COALESCE(NULL, 'n') as class_id, COALESCE(NULL, 'n') as class_name,
        UPPER(test.test_name) AS test_name, test.course, 
        DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p') AS due_date,
        COUNT(DISTINCT test_questions.question_id) AS question_count,
        u1.user_name AS teacher_name,
        aq.assigned_questions_id
        FROM test
        JOIN assigned_questions aq ON aq.test_id = test.test_id
        JOIN user1 on aq.student_id = user1.user_id
        JOIN user1 u1 ON aq.teacher_id = u1.user_id
        JOIN test_questions ON test_questions.test_id = test.test_id
		join questions q on test_questions.question_id = q.question_id
        and aq.student_id= ? and aq.class_id is null
        AND test.deleted=0 and aq.deleted=0 and test_questions.deleted=0 and q.deleted=0 and q.approval='approved'
      left join student_test_result str on aq.student_id = str.student_id
        and str.test_id = test.test_id and str.class_id is null
        GROUP BY test.test_id
      HAVING str.is_submitted IS NULL OR str.is_submitted = 0 OR str.is_submitted != 1;`, 
  [req.user[0].user_id, req.user[0].user_id, req.user[0].user_id, req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else {
        res.render('s_assessment_assigned', { data0: results, user: req.user[0] });
      }
    });
  } catch (err) {
    next(err);
  }
})



//Student Assessment - Assigned by Teacher Questions
router.get("/assessment/assigned/questions/:test_id/:class_id/:assigned_questions_id", isLoggedIn, isStudent, (req, res, next) => {
  try {
    con.query(`SELECT student_id, class_id, test_id, score, option_selected, is_submitted, submitted_date, deleted FROM student_test_result 
    where student_id=? and class_id=? and test_id=? and deleted='0' AND is_submitted IN (0, 1);`, 
    [req.user[0].user_id, req.params.class_id, req.params.test_id], function (error, results) {
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
  
                res.render('s_assessment_assigned_ques', { data0: results, class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
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

    
                  res.render('s_assessment_assigned_ques', { data0: results, class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
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
    
                  res.render('s_assessment_assigned_ques', { data0: results, class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
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
        and str.student_id=? and str.test_id=? and str.class_id=? and str.deleted='0' AND str.is_submitted IN (0, 1)
        and q.deleted=0 and q.approval='approved' and tq.deleted=0
        left join translations t on t.question_id=q.question_id 
        and t.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
        [req.user[0].user_id, req.params.test_id, req.params.class_id, req.user[0].user_id], function (error, results) {      
          if (error) next(error); 
          else {
            console.log("saved class");
            
            res.render('s_assessment_assigned_ques', { data0: results,saved:JSON.parse(results[0].option_selected), class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
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
          and str.deleted='0' AND str.is_submitted IN (0, 1) and str.is_individual='y'
          and q.deleted=0 and q.approval='approved' and tq.deleted=0
          left join translations t on t.question_id=q.question_id 
          and t.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
          [req.user[0].user_id, req.params.test_id, req.user[0].user_id], function (error, results) {      
            if (error) next(error); 
            else {
              console.log("saved individual");
              
              res.render('s_assessment_assigned_ques', { data0: results,saved:JSON.parse(results[0].option_selected), class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
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
          join questions q on tq.question_id = q.question_id
          and str.student_id=? and str.test_id=? and str.class_id=? and str.deleted='0' AND str.is_submitted IN (0, 1) and str.is_individual='y'
          and q.deleted=0 and q.approval='approved' and tq.deleted=0
          left join translations t on t.question_id=q.question_id 
          and t.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
          [req.user[0].user_id, req.params.test_id, req.params.class_id, req.user[0].user_id], function (error, results) {      
            if (error) next(error); 
            else {
              console.log("saved individual");
              
              res.render('s_assessment_assigned_ques', { data0: results,saved:JSON.parse(results[0].option_selected), class_id: req.params.class_id, assigned_questions_id: req.params.assigned_questions_id, user: req.user[0] });
            }
          });
        }
      }
    });
  } catch (err) {
    next(err);
  }
})

  
  router.post("/assessment/assigned/questions/:test_id/:class_id/:assigned_questions_id/submit-score", isLoggedIn, isStudent, (req, res, next) => {
    try {
      const student_id = req.user[0].user_id;
      console.log("req.body", req.body);
      console.log("req.body.score", req.body.score);
    
      let values = [];
      for (let i = 0; i < req.body.options.length; i++) {
        values.push([req.body.options[i].questionId, req.body.options[i].option]);
      }
      values = JSON.stringify(values);
    
      con.query(`SELECT student_id, test_id, class_id, score, percentage, option_selected, is_submitted, submitted_date, is_timed, deleted 
      FROM student_test_result where student_id=? and test_id=? and is_submitted='0' and 
      deleted='0';`, [req.user[0].user_id, req.params.test_id, req.params.class_id], function (error, results) {
        console.log('results: ',results);
        if (error) next(error); 
        else if (results.length=='0')
        {
          if (req.params.assigned_questions_id=='n')
          {
            con.query(`INSERT INTO student_test_result (student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted, class_id, percentage, is_timed) 
            VALUES (?, ?, ?, ?, ?, now(), ?, ?, ?, ?)`, 
            [req.user[0].user_id, req.params.test_id, req.body.score, values, '1', '0', req.params.class_id, req.body.percentage, req.body.timed], function (error, results) {
              if (error) next(error); 
              else {
                console.log('a');
              }
            });
          }
          else {
            if (req.params.class_id=='n')
            {
              con.query(`INSERT INTO student_test_result (student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted, is_individual, percentage, is_timed) 
              VALUES (?, ?, ?, ?, ?, now(), ?, ?, ?, ?)`, 
              [req.user[0].user_id, req.params.test_id, req.body.score, values, '1', '0', 'y', req.body.percentage, req.body.timed], function (error, results) {
                if (error) next(error); 
                else {
                  console.log('a');
                }
              });
            }
            else {
              con.query(`INSERT INTO student_test_result (student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted, class_id, is_individual, percentage, is_timed) 
              VALUES (?, ?, ?, ?, ?, now(), ?, ?, ?, ?, ?)`, 
              [req.user[0].user_id, req.params.test_id, req.body.score, values, '1', '0', req.params.class_id, 'y', req.body.percentage, req.body.timed], function (error, results) {
                if (error) next(error); 
                else {
                  console.log('a');
                }
              });
            }
          }
        }
        else if(results.length!='0' && req.params.assigned_questions_id=='n')
        {
          con.query(`UPDATE student_test_result SET score = ?, option_selected = ?, is_submitted = ?, submitted_date = now(), percentage = ? 
          WHERE student_id = ? and test_id = ? and class_id=? and is_submitted = '0' and deleted = '0';`, 
          [req.body.score, values, '1', req.body.percentage, req.user[0].user_id, req.params.test_id, req.params.class_id], function (error, results) {    
            if (error) next(error); 
            else {
              console.log("saved");
              console.log('updated');
            }
          });
        }
        else 
        {
          if (req.params.class_id=='n')
          {
            con.query(`UPDATE student_test_result SET score = ?, option_selected = ?, is_submitted = ?, submitted_date = now(), percentage = ? 
            WHERE student_id = ? and test_id = ? and is_submitted = '0' and deleted = '0' and is_individual = 'y';`, 
            [req.body.score, values, '1', req.body.percentage, req.user[0].user_id, req.params.test_id], function (error, results) {    
              if (error) next(error); 
              else {
                console.log("saved");
                console.log('a');
              }
            });
          }
          else {
            con.query(`UPDATE student_test_result SET score = ?, option_selected = ?, is_submitted = ?, submitted_date = now(), percentage = ? 
            WHERE student_id = ? and test_id = ? and class_id=? and is_submitted = '0' and deleted = '0' and is_individual = 'y';`, 
            [req.body.score, values, '1', req.body.percentage, req.user[0].user_id, req.params.test_id, req.params.class_id], function (error, results) {    
              if (error) next(error); 
              else {
                console.log("saved");
                console.log('a');
              }
            });
          }
        }
      });
    } catch (err) {
      next(err);
    }
  });
  
  
  router.post("/assessment/assigned/questions/:test_id/:class_id/:assigned_questions_id/save-test", isLoggedIn, isStudent, (req, res, next) => {
    try {
      const student_id = req.user[0].user_id;
  
      let values = [];
      for (let i = 0; i < req.body.options.length; i++) {
        values.push([req.body.options[i].questionId, req.body.options[i].option]);
      }
      values = JSON.stringify(values);
    
      con.query(`SELECT student_id, test_id, class_id, score, percentage, option_selected, is_submitted, submitted_date, deleted 
      FROM student_test_result where student_id=? and test_id=? and is_submitted='0' and deleted='0';`, 
      [req.user[0].user_id, req.params.test_id, req.params.class_id], function (error, results) {
        if (error) next(error); 
        else if (results.length=='0')
        {
          if (req.params.assigned_questions_id=='n')
          {
            con.query(`INSERT INTO student_test_result (student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted, class_id, percentage) 
            VALUES (?, ?, ?, ?, ?, now(), ?, ?, ?)`, [req.user[0].user_id, req.params.test_id, req.body.score, values, '0', '0', req.params.class_id, req.body.percentage], 
            function (error, results) {
              if (error) next(error); 
              else {
                console.log('a');
              }
            });
          }
          else {
            if (req.params.class_id=='n')
            {
              con.query(`INSERT INTO student_test_result (student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted, is_individual, percentage) 
              VALUES (?, ?, ?, ?, ?, now(), ?, ?, ?)`, 
              [req.user[0].user_id, req.params.test_id, req.body.score, values, '0', '0', 'y', req.body.percentage], function (error, results) {
                if (error) next(error); 
                else {
                  console.log('a');
                }
              });
            }
            else {
              con.query(`INSERT INTO student_test_result (student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted, class_id, is_individual, percentage) 
              VALUES (?, ?, ?, ?, ?, now(), ?, ?, ?, ?)`, 
              [req.user[0].user_id, req.params.test_id, req.body.score, values, '0', '0', req.params.class_id, 'y', req.body.percentage], function (error, results) {
                if (error) next(error); 
                else {
                  console.log('a');
                }
              });
            }
          }
        }
        else if(results.length!='0' && req.params.assigned_questions_id=='n')
        {
          con.query(`UPDATE student_test_result SET score = ?, option_selected = ?, is_submitted = ?, submitted_date = now(), percentage = ? 
          WHERE student_id = ? and test_id = ? and class_id=? and is_submitted = '0' and deleted = '0';`, 
          [req.body.score, values, '0', req.body.percentage, req.user[0].user_id, req.params.test_id, req.params.class_id], function (error, results) {    
            if (error) next(error); 
            else {
              console.log("saved");
            }
          });
        }
        else 
        {
          if (req.params.class_id=='n')
          {
            con.query(`UPDATE student_test_result SET score = ?, option_selected = ?, is_submitted = ?, submitted_date = now(), percentage = ? 
            WHERE student_id = ? and test_id = ? and is_submitted = '0' and deleted = '0' and is_individual = 'y';`, 
            [req.body.score, values, '0', req.body.percentage, req.user[0].user_id, req.params.test_id], function (error, results) {    
              if (error) next(error); 
              else {
                console.log("saved");
              }
            });
          }
          else {
            con.query(`UPDATE student_test_result SET score = ?, option_selected = ?, is_submitted = ?, submitted_date = now(), percentage = ? 
            WHERE student_id = ? and test_id = ? and class_id=? and is_submitted = '0' and deleted = '0' and is_individual = 'y';`, 
            [req.body.score, values, '0', req.body.percentage, req.user[0].user_id, req.params.test_id, req.params.class_id], function (error, results) {    
              if (error) next(error); 
              else {
                console.log("saved");
              }
            });
          }
        }
      });
    } catch (err) {
      next(err);
    }
  })
  


  //Student Assessment - Tests
router.get("/assessment/tests", isLoggedIn, isStudent, (req, res, next) => {
  try {
    // First query to get distinct courses
    con.query(`SELECT DISTINCT course FROM reference_tags WHERE course IS NOT NULL AND course <> '' and reference_tags.deleted=0`, (error, courseResults) => {
      if (error) {
        res.render('s_learning_nodata', { data0: results[0], data1: results[1], user: req.user[0] });
        return;
      }
      const courses = courseResults.map(courseResult => courseResult.course);

      const selectedCourse = req.query.course || 'Algebra I';

      // Second query to get distinct topics for the selected course
      con.query(`WITH cte AS
      (SELECT str.is_submitted, COALESCE(str.option_selected, '[]') as option_selected, str.submitted_date,
      test.test_id, test.topic, test.sub_topic, test.test_name, 
        ROW_NUMBER() OVER (PARTITION BY test.test_id ORDER BY str.submitted_date DESC) AS rn
        FROM test 
        join test_questions on test.test_id = test_questions.test_id 
        join questions on questions.question_id = test_questions.question_id 
        join reference_tags on questions.reference_tags_id  = reference_tags.reference_tags_id 
        and test.course=reference_tags.course and test.topic IS NOT NULL AND test.topic <> ''
        and test.sub_topic IS NOT NULL AND test.sub_topic <> ''
        and test.course=?
        and test.deleted=0 and test_questions.deleted=0 and reference_tags.deleted=0 
        and questions.deleted=0 and questions.approval='approved'
        left join student_test_result str on str.test_id = test.test_id and str.class_id is null
        and str.student_id=?)
        SELECT *
    FROM cte
    WHERE rn = 1`, [selectedCourse, req.user[0].user_id], function (error, results) {
      if (error) next(error); 
      else {
        console.log(results);
        res.render('s_assessment_tests', { courses, selectedCourse, data0: results, user: req.user[0] });
      }
    });
  });
 } catch (err) {
    next(err);
  }
})


//Student Test Questions
router.get("/assessment/tests/questions/:test_id", isLoggedIn, isStudent, (req, res, next) => {
  try {
    con.query(`SELECT student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted FROM student_test_result 
    where student_id=? and test_id=? and is_submitted='0' and deleted='0';`, 
    [req.user[0].user_id, req.params.test_id], function (error, results) {
      if (error) next(error); 
      else if (results.length=='0')
      {
          con.query(`select questions.question_id, test_questions.test_id,test.test_name,translations.language,
          translations.translation_id,questions.question_id,questions.question,questions.option_1,
          questions.option_2, questions.option_3,questions.option_4,questions.answer,questions.solution, questions.question_url, questions.solution_url,
          questions.option_1_url, questions.option_2_url, questions.option_3_url, questions.option_4_url,
          translations.t_question, translations.t_option_1, translations.t_option_2, translations.t_option_3, translations.t_option_4, translations.t_answer, 
          translations.t_question_url, translations.t_option_1_url, translations.t_option_2_url, translations.t_option_3_url, 
          translations.t_option_4_url, translations.t_solution_url, translations.t_solution 
          from questions 
          join test_questions on test_questions.question_id=questions.question_id 
          join test on test.test_id = test_questions.test_id and test_questions.test_id=?
          and questions.deleted=0 and questions.approval='approved' and test_questions.deleted=0 
          left join translations on translations.question_id=questions.question_id 
          and translations.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?);`,
           [req.params.test_id, req.user[0].user_id], function (error, results) {
            if (error) next(error); 
            else {
              console.log("start new");
              res.render('s_assessment_tests_ques', { data0: results, user: req.user[0] });
            }
          });
      }
      else 
      {
        con.query(`SELECT q.question_id, test.test_name,t.language,t.translation_id,q.question, q.option_1,q.option_2, q.option_3,q.option_4,q.answer,q.solution, 
        q.question_url, q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
        q.solution_url, t.t_question, t.t_option_1, 
        t.t_option_2, t.t_option_3, t.t_option_4, t.t_answer, t.t_question_url, 
        t.t_option_1_url, t.t_option_2_url, t.t_option_3_url, t.t_option_4_url,
        t.t_solution_url, t.t_solution,str.student_id, str.test_id, str.score, str.option_selected, str.is_submitted, str.submitted_date, str.deleted
        FROM student_test_result str 
        join test on str.test_id = test.test_id 
        join test_questions tq on tq.test_id = test.test_id 
        join questions q on tq.question_id = q.question_id and str.student_id=? and 
        str.test_id=? and str.deleted='0' and str.is_submitted='0'
        and q.deleted=0 and q.approval='approved' and tq.deleted=0
        left join translations t on t.question_id=q.question_id 
        and t.language = ( SELECT preferred_language FROM user1 WHERE user_id = ?);`, 
        [req.user[0].user_id, req.params.test_id, req.user[0].user_id], function (error, results) {      
          if (error) next(error); 
          else {
            console.log("saved");
            
            res.render('s_assessment_tests_ques', { data0: results,saved:JSON.parse(results[0].option_selected), user: req.user[0] });
          }
        });
      }
    });
  } catch (err) {
    next(err);
  }
})



router.post("/assessment/tests/questions/:test_id/submit-score", isLoggedIn, isStudent, (req, res, next) => {
  try {
    const student_id = req.user[0].user_id;

    let values = [];
    for (let i = 0; i < req.body.options.length; i++) {
      values.push([req.body.options[i].questionId, req.body.options[i].option]);
    }
    values = JSON.stringify(values);
  
    con.query(`SELECT student_id, test_id, score, percentage, option_selected, is_submitted, submitted_date, is_timed, deleted 
    FROM student_test_result where student_id=? and test_id=? and is_submitted='0' and deleted='0';`, 
    [req.user[0].user_id, req.params.test_id], function (error, results) {
      if (error) next(error); 
      else if (results.length=='0')
      {
        con.query(`INSERT INTO student_test_result (student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted, percentage, is_timed) 
        VALUES (?, ?, ?, ?, ?, now(), ?, ?, ?)`, 
        [req.user[0].user_id, req.params.test_id, req.body.score, values, '1', '0', req.body.percentage, req.body.timed], function (error, results) {
          if (error) next(error); 
          else {
            console.log('a');
          }
        });
      }
      else 
      {
        con.query(`UPDATE student_test_result SET score = ?, option_selected = ?, is_submitted = ?, submitted_date = now(), percentage = ? 
        WHERE student_id = ? and test_id = ? and is_submitted = '0' and deleted = '0';`, 
        [req.body.score, values, '1', req.body.percentage, req.user[0].user_id, req.params.test_id], function (error, results) {    
          if (error) next(error); 
          else {
            console.log("saved");
            console.log('a');
          }
        });
      }
    });
  } catch (err) {
    next(err);
  }
});


router.post("/assessment/tests/questions/:test_id/save-test", isLoggedIn, isStudent, (req, res, next) => {
  try {
    const student_id = req.user[0].user_id;

    let values = [];
    for (let i = 0; i < req.body.options.length; i++) {
      values.push([req.body.options[i].questionId, req.body.options[i].option]);
    }
    values = JSON.stringify(values);
  
    con.query(`SELECT student_id, test_id, score, percentage, option_selected, is_submitted, submitted_date, deleted 
    FROM student_test_result where student_id=? and test_id=? and is_submitted='0' and deleted='0';`, 
    [req.user[0].user_id, req.params.test_id], function (error, results) {
      if (error) next(error); 
      else if (results.length=='0')
      {
        con.query(`INSERT INTO student_test_result (student_id, test_id, score, option_selected, is_submitted, submitted_date, deleted, percentage) 
        VALUES (?, ?, ?, ?, ?, now(), ?, ?)`, 
        [req.user[0].user_id, req.params.test_id, req.body.score, values, '0', '0', req.body.percentage], function (error, results) {
          if (error) next(error); 
          else {
            console.log('a');
          }
        });
      }
      else 
      {
        con.query(`UPDATE student_test_result SET score = ?, option_selected = ?, is_submitted = ?, submitted_date = now(), percentage = ? 
        WHERE student_id = ? and test_id = ? and is_submitted = '0' and deleted = '0';`, 
        [req.body.score, values, '0', req.body.percentage, req.user[0].user_id, req.params.test_id], function (error, results) {    
          if (error) next(error); 
          else {
            console.log("saved");
          }
        });
      }
    });
  } catch (err) {
    next(err);
  }
})

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).render('error', { error: err });
}
router.use(errorHandler);

module.exports = router