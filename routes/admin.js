const express = require('express')
const router = express.Router()
const con = require('../db');
const s3 = require('../s3')
const bodyParser = require("body-parser");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}))
const app = express()
app.use(express.static('public'));


// all student
router.get('/', isLoggedIn, isAdmin, (req, res) => {
    try{
    con.query(`select * from user1 where user1.user_role="student" and deleted=0`, function(error, results) {
        if (error) next(error);
        // console.log(results);
        res.redirect('/admin/student');
    });}
    catch{
        next(err);
    }

})

router.get('/getAllStudents', isLoggedIn, isAdmin, (req, res) => {
    try{
        // console.log(req.body);
        con.query(`select * from user1`, function(error, results) {
            if (error) next(error);
            // console.log(results);
            res.json(results);
        });}
        catch{
            next(err);
        }

    })
    // 
router.get('/student', isLoggedIn, isAdmin, (req, res) => {
    try{
    con.query(`select * from user1 where user1.user_role="student" and user1.deleted=0`, function(error, results) {
        if (error) next(error);
        con.query(`select distinct * from predefined where  type="language" or type="school name";`, function(errorIn, refResults) {
            // console.log(results, refResults);
            res.render('a_student_index', { results, refResults, user: req.user[0] });
        });
    });

}
catch{
    next(err);
}
})

router.get('/TestingUStudent', isLoggedIn, isAdmin, (req, res) => {
    try{
    con.query(`SELECT * FROM user1 LEFT JOIN class_members ON user1.user_id = class_members.student_id
    WHERE user1.user_role = 'student' and user1.deleted=0 AND class_members.student_id IS NULL;`, function(error, results) {
        if (error) next(error);
        con.query(`select distinct * from predefined where  type="language" or type="school name";`, function(errorIn, refResults) {
            console.log(results, refResults);
            res.render('a_student_index', { results, refResults, user: req.user[0] });
        });
    });  
}
catch{
    next(err);
}
})

router.get('/student/assigntask', isLoggedIn, isAdmin, (req, res) => {
    // console.log(req);
    try {
        con.query(`select question_id,question,SUBSTRING(question,1,40) as initialText,question_url, topic, sub_topic, month, year, standard, difficulty,r.course 
        from  questions q 
        join reference_tags r on r.reference_tags_id=q.reference_tags_id 
       where q.deleted=0 and r.deleted=0 and q.approval='approved';
       select  distinct course from reference_tags rt where rt.course is not null AND rt.course <> '' `, function(error, results) {
            if (error) next(error);
            else {
                let user_name = req.query.user_name;
                let student_id = req.query.user_id;
                res.render('a_student_index_assigntask', { data0: results[0], data1: results[1], user: req.user[0], student_id, user_name });
            }
        });
    } catch (err) {
        next(err);
    }

})

router.post("/student/assigntaskstudent/preview", isLoggedIn, isAdmin, (req, res, next) => {

    try {
        const values = [];
        if (req.body.questionIds != undefined) {
            for (let i = 0; i < req.body.questionIds.length; i++) {
                values.push([req.body.questionIds[i]]);
            }
        }
        console.log("Values:", values);
        con.query("select * from questions where question_id in (?);", [values], function(error, results) {
            if (error) next(error);
            console.log(req);
            res.send(results);
            console.log("results:", results);
        });
    } catch (err) {
        next(err);
    }


})
router.post("/student/assignstudent", isLoggedIn, isAdmin, (req, res, next) => {

    try {
        con.query("INSERT INTO test (test_name, teacher_id, due_date,course,created_date) values (?,?,?,?,now());", [req.body.assignmentName, req.user[0].user_id, req.body.dueDate, req.body.coursevalue, ], function(error, results) {
            if (error) next(error);
            else {
                const test_id = results.insertId;
                const values = [];
                if (req.body.questionIds != undefined) {
                    for (let i = 0; i < req.body.questionIds.length; i++) {
                        values.push([test_id, req.body.questionIds[i]]);
                    }
                }

                con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function(error, results1) {
                    if (error) next(error);
                    else {

                        con.query("INSERT INTO assigned_questions (assigned_questions_id,class_id, test_id,student_id,teacher_id,created_date,due_date,is_timed,time) values (?,?,?,?,?,now(),?,?,?);", [, req.body.class_id, `${test_id}`, req.body.student_id, req.user[0].user_id, req.body.dueDate, req.body.isTimed, req.body.timer], function(error, results1) {
                            if (error) next(error);
                            else {

                                res.json({ nextRoute: '/admin/student' });
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

router.delete('/student', isLoggedIn, isAdmin, (req, res) => {
    try{
    con.query(`select * from user1 where user1.user_role="student" and user1.deleted=0`, function(error, results) {
        if (error) next(error);
        con.query(`select distinct * from predefined where type="language" or type="school name";`, function(errorIn, refResults) {
            console.log(results, refResults);
            res.render('a_student_index', { results, refResults, user: req.user[0] });
        });
    });}
    catch (err) {
        next(err);
    }
})




router.post('/student/updateStudent', isLoggedIn, isAdmin, (req, res) => {
    // console.log('student/updateStudent');
    try{
    req = req.body
    // console.log(req);

    con.query(`update user1 set user_name=?,school_name=?,user_email=?, preferred_language=?, deleted="0" where user_id=? `, [req.username, req.schoolSelect, req.useremail, req.languageSelect, req.user_id], function(error, results) {
        if (error) next(error);
        console.log(results)
        res.json(results);
    })
}
catch (err) {
    next(err);
}
});

router.delete('/student/deleteStudent', isLoggedIn, isAdmin, (req, res) => {
    try{
    console.log("/student/deleteStudent");
    req = req.body
    console.log(req)
    con.query(`Update user1 set user1.deleted='1' WHERE user1.user_id=? and user1.user_role='student'`, [req.user_id], function(error, results) {
        if (error) next(error);
        res.redirect('/admin/student');
    });
}
catch (err) {
    next(err);
}
})






router.post('/student/addStudent', isLoggedIn, isAdmin, (req, res) => {
    try{
    req = req.body
    con.query(`insert into user1 set user_name = ?, user_email = ?, user_role =?, preferred_language=?, school_name=?,created_date = now()`, [req.username, req.useremail, req.user_role, req.languageSelect, req.schoolSelect], function(error, results) {
        if (error) {
            console.log(error.code)
            if (error.code === 'ER_DUP_ENTRY') {
                console.log("error")
                con.query(`update user1 set user_name=?,school_name=?,user_email=?, preferred_language=?, deleted="0" where user_email=? `, [req.username, req.schoolSelect, req.useremail, req.languageSelect, req.useremail], function(error, results) {
                    if (error) next(error);
                    // console.log(results)
                    res.json(results);
                })
            }
        } else {
            error;
            var refResults = results;
            res.render('a_student_index', { results, refResults, user: req });
        }
    });
}
catch (err) {
    next(err);
}
})

// router.put('/student/editStudent', isLoggedIn, isAdmin, (req, res) => {

//     req = req.body
//     con.query(`insert into user1 set user_id = ?, user_name = ?, user_email = ?, user_role =?, preferred_language=?, school_name=?,created_date = now()`, [makeid(6), req.username, req.useremail, req.user_role, req.languageSelect, req.schoolSelect, ], function(error, results) {
//         if (error) throw error;

//     });
//     console.log(req);
// })



// router.get('/getAllstudent', isLoggedIn, isAdmin, (req, res) => {
//     con.query(`select * from user1 where user1.user_role="student" and deleted=0`, function(error, results) {
//         if (error) throw error;
//         console.log(results);
//         res.render('a_student_index', { results });
//     });

// })

router.get('/getUnaffiliatedStudents', isLoggedIn, isAdmin, (req, res) => {
    try{
    con.query(`SELECT * FROM user1 LEFT JOIN class_members ON user1.user_id = class_members.student_id
    WHERE user1.user_role = 'student' and user1.deleted=0 AND class_members.student_id IS NULL;`, function(error, results) {
        if (error) next(error);
        // console.log(results);
        res.json(results);
    });
}
catch (err) {
    next(err);
}
})







class Classname {
    constructor(class_id, teacher_id) {
        this.class_id = class_id;
        this.teacher_id = teacher_id;
    }
}

let classes = [new Classname("Freshman", "Prem Sai"), new Classname("Sophomore", "Karan"), new Classname("Junior", "Dheeraj"), new Classname("Senior", "Shivam"), new Classname("8th Grade", "Liam"), new Classname("7th Grade", "Noah")]

router.get('/teacher', isLoggedIn, isAdmin, (req, res) => {
    try{
    con.query(`select * from user1 where user1.user_role="teacher" and user1.deleted=0 and user1.approved=1;`, function(error, results) {
        if (error) next(error);
        con.query(`select distinct * from predefined where  type="language" or type="school name";`, function(errorIn, refResults) {
            console.log(results, refResults);
            res.render('a_teacher_index', { classes, results, refResults, user: req.user[0] });
        });
    });
}
catch (err) {
    next(err);
}

})



router.post('/teacher/addTeacher', isLoggedIn, isAdmin, (req, res) => {
    try{
    req = req.body;
    console.log("/teacher/addTeacher");
    console.log(req.username);
    con.query(`insert into user1 set user_name = ?, user_email = ?, user_role ="teacher",approved="1", school_name=?,preferred_language=?, created_date = now()`, [req.username, req.useremail, req.schoolSelect, req.languageSelect], function(error, results) {
        if (error) {
            console.log(error.code)
            if (error.code === 'ER_DUP_ENTRY') {
                console.log("error")
                con.query(`update user1 set user_name=?,school_name=?,user_email=?, preferred_language=?, deleted="0" where user_email=? `, [req.username, req.schoolSelect, req.useremail, req.languageSelect, req.useremail], function(error, results) {
                    if (error) next(error);
                    console.log(results)
                    res.redirect('back');
                })
            }
        } else {
            res.redirect('back')
        }
    });
    
}
catch (err) {
    next(err);
}
})

router.put('/teacher/updateTeacher', isLoggedIn, isAdmin, (req, res) => {
try{
    console.log("/teacher/updateTeacher");
    req = req.body;
    console.log(req)
    con.query(`update user1 set user_name=?,school_name=?,user_email=?, preferred_language=? where user_id=? `, [req.username, req.schoolSelect, req.useremail, req.languageSelect, req.user_id], function(error, results) {
        if (error) next(error);
        res.json(results)
            // con.query(`select distinct * from predefined where  type="language" or type="school name";`, function(errorIn, refResults) {
            //     console.log(results, refResults);
            //     res.render('a_student_index', { results, refResults });
            // });
    });
}
catch (err) {
    next(err);
}
})

router.delete('/teacher/deleteTeacher', isLoggedIn, isAdmin, (req, res) => {
    try{
    console.log("/teacher/deleteTeacher");
    req = req.body
    console.log(req)
    con.query(`Update user1 set user1.deleted='1' WHERE user1.user_id=? and user1.user_role='teacher'`, [req.user_id], function(error, results) {
        if (error) next(error);
        res.json('results');
    });
}
catch (err) {
    next(err);
}
})

router.get('/class', isLoggedIn, isAdmin, (req, res) => {
    console.log(req.body)
    con.query(`SELECT user1.user_name as teacher, class.class_id, 
                GROUP_CONCAT(CASE WHEN user1.user_id != u1.user_id THEN u1.user_name END) as co_teacher, 
                class.class_name 
            FROM class 
            JOIN user1 ON class.teacher_id = user1.user_id   
            JOIN class_teachers ON class.class_id = class_teachers.class_id   
            JOIN user1 AS u1 ON class_teachers.teacher_id = u1.user_id 
            WHERE class.deleted=0 
            AND u1.deleted=0 
            AND class_teachers.deleted=0
            GROUP BY class.class_id, user1.user_id;
            SELECT user1.user_id,user1.user_name,user1.user_email from user1
      where user1.deleted = 0 and user1.user_role = 'teacher' or user1.user_role = 'admin';select class_name from class where deleted=0;`, function(error, results) {
        if (error) throw error;
        else {
            const values = [];
            for (let i = 0; i < results[2].length; i++) {
                values.push([results[2][i].class_name]);
            }
            res.render('a_class_index', { data0: results[0], user: req.user[0], data1: results[1], values });
        }
    });
})
router.post("/class", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        con.query("INSERT INTO class set class_name=? ,teacher_id =?,created_date =?;", [req.body.classname1, req.user[0].user_id, currentDate], function(error, results) {
            if (error) next(error);
            else {
                const class_id = results.insertId;
                const values = [];
                if (req.body.teachername != undefined) {
                    for (let i = 0; i < req.body.teachername.length; i++) {
                        values.push([class_id, req.body.teachername[i]]);
                    }
                }
                values.push([class_id, req.user[0].user_id]);
                con.query("INSERT INTO class_teachers (class_id, teacher_id) VALUES ?", [values], function(error, result) {
                    if (error) next(error);
                    else {
                        res.redirect('/admin/class');
                    }
                });
            }
        });
    } catch (err) {
        next(err);
    }
})
router.post('/deleteclass', isLoggedIn, isAdmin, (req, res) => {

    con.query(`Update class
    set class.deleted='1' 
    WHERE class.class_id=?`, [req.body.class_id], function(error, results) {
        if (error) throw error;
        else {
            res.send(`
                            <script>
                            alert('Class Deleted Successfully!');
                            window.location.href = '/admin/class';
                            </script>
                        `);

        }
    });
});
router.get('/head', isLoggedIn, isAdmin, (req, res) => {
    res.render('a_header', { classes })
})

router.get('/questions', isLoggedIn, isAdmin, (req, res) => {
    try{
    con.query(`SELECT * FROM questions q JOIN reference_tags rt ON q.reference_tags_id = rt.reference_tags_id 
    where q.deleted!=1 && q.approval="approved";
    
    SELECT *, q.approval as approved,SUBSTRING(question,1,100) as question_sub, GROUP_CONCAT(language SEPARATOR ',') as translations 
    FROM questions q 
    JOIN reference_tags rt ON q.reference_tags_id = rt.reference_tags_id 
    and q.deleted=0 AND q.approval = "approved" AND q.approval != "pending"
    LEFT JOIN translations t ON t.question_id = q.question_id 
    GROUP BY q.question_id, q.question`, function(error, results) {
        if (error) next(error);
        con.query('select distinct predefined.predefined_id, predefined.type, predefined.type_value from predefined where predefined.deleted != 1;',
            function(er, refResults) {
                if (er) next(er);
                console.log("from questions", results[0]);
                res.render('a_questions_index', { results: results[0], data0: results[1], refResults: refResults, user: req.user[0] });
            });
    })} catch{
        next(err);
    }
})


router.get('/editQuestion', isLoggedIn, isAdmin, (req, res) => {
    try{
    console.log("from admin")
    console.log(req.query.questionId, "from admin")
    con.query(`select * from translations where translations.question_id = ?;`, [req.query.questionId], function(error, translationResults) {
        if (error) next(error);
        console.log(req.query.questionId, "from editquestion");
        con.query(`select * from questions join reference_tags on reference_tags.reference_tags_id=questions.reference_tags_id where questions.question_id=?`, [req.query.questionId], function(error, questionResults) {
            if (error) next(error);
            con.query('select distinct predefined.predefined_id, predefined.type, predefined.type_value from predefined where predefined.deleted != 1;', function(er, refResults) {
                if (error) next(error);
                console.log(questionResults,translationResults,refResults)
                res.render('a_editQuestionModal', { translationResults, questionResults, refResults }, function(err, html) {
                    if (error) next(error);
                    res.send(html)
                });
            })

        });

    });

} catch{
    next(err);
}

})

router.get('/AddQuestionModal', isLoggedIn, isAdmin, (req, res) => {

    console.log("from admin")
    console.log(req.query.questionId, "from admin")

    console.log(req.query.questionId, "from editquestion");
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
        res.render('a_editQuestionModal', { translationResults, questionResults, refResults }, function(err, html) {
            if (err) throw err;
            res.send(html)
        });
    })

})

router.post('/questionsRequests/approve', isLoggedIn, isAdmin, (req, res) => {
    console.log(req.body)
    con.query('UPDATE questions SET questions.approval="approved" WHERE question_id = ?;', [req.body.question_id], function(error, results) {
        if (error) throw error;
        res.json(results);
    })
});

router.post('/questionsRequests/reject', isLoggedIn, isAdmin, (req, res) => {
    console.log(req.body)
    con.query('UPDATE questions SET questions.approval="rejected" WHERE question_id = ?;', [req.body.question_id], function(error, results) {
        if (error) throw error;
        res.json(results);
    })
});

router.post('/questions/delete', isLoggedIn, isAdmin, (req, res) => {
    console.log(req.body)
    con.query('UPDATE questions SET questions.deleted=1 WHERE question_id = ?;', [req.body.question_id], function(error, results) {
        if (error) throw error;
        res.json(results);
    })
});

//thisiseditquestionpost
router.post('/questions/getReferenceid', isLoggedIn, isAdmin, (req, res) => {
    try{
    console.log("hello Atlesat till here");
    console.log(req.body);
    con.query('select * from reference_tags where year=? and month=? and course=? and topic=? and sub_topic=? and difficulty=? and standard=?', [req.body.year, req.body.month, req.body.course, req.body.topic, req.body.sub_topic, req.body.difficulty, req.body.standard], function(error, reference_tags_obj) {
        if (error) throw error;
        console.log("reference_tags_obj ***************** TESTSING...7", reference_tags_obj);
        if (reference_tags_obj.length <= 0) {
            console.log("No Tag Found... Creating TAG");
            con.query('insert into reference_tags(year,month,course,topic,sub_topic,difficulty,standard) values(?,?,?,?,?,?,?);', [req.body.year, req.body.month, req.body.course, req.body.topic, req.body.sub_topic, req.body.difficulty, req.body.standard], function(error, results) {
                if (error) throw (error);
                console.log(results);
                if (results.insertId)
                    con.query('select * from reference_tags where reference_tags_id=?;', [results.insertId], function(error, reference_tags_obj) {
                        if (error) throw error;
                        console.log("came to updayte the question Testing for Qurl", req.body.questionData.question_url)

                        var sqlQuery = 'UPDATE questions SET question = ?, option_1 =?, option_2 = ?, option_3 = ?, option_4 = ?, answer = ?,  reference_tags_id = ?, solution =?,';
                        var queryParams = [req.body.questionData.question, req.body.questionData.option_1, req.body.questionData.option_2, req.body.questionData.option_3, req.body.questionData.option_4, req.body.questionData.answer, reference_tags_obj[0].reference_tags_id, req.body.questionData.solution];

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
                        sqlQuery += ' WHERE question_id = ?;';

                        queryParams.push(req.body.questionData.question_id);

                        con.query(sqlQuery, queryParams, function(error, results) {
                            if (error) throw error;
                        });

                    })
            })
        } else {
            console.log(req.body.questionData.question, req.body.questionData.option_1, req.body.questionData.option_2, req.body.questionData.option_3, req.body.questionData.option_4, req.body.questionData.answer, reference_tags_obj[0].reference_tags_id, req.body.questionData.question_url, req.body.questionData.question_id);

            var sqlQuery = 'UPDATE questions SET question = ?, option_1 =?, option_2 = ?, option_3 = ?, option_4 = ?, answer = ?,  reference_tags_id = ?, solution =?,';
            var queryParams = [req.body.questionData.question, req.body.questionData.option_1, req.body.questionData.option_2, req.body.questionData.option_3, req.body.questionData.option_4, req.body.questionData.answer, reference_tags_obj[0].reference_tags_id, req.body.questionData.solution];

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
            sqlQuery += ' WHERE question_id = ?;';

            queryParams.push(req.body.questionData.question_id);
            console.log(sqlQuery, queryParams)
            con.query(sqlQuery, queryParams, function(error, results) {
                if (error) throw error;
            });
        }
    });
    console.log("Concureent excuting of this query", req.body)
    for (let i = 0; i < req.body.createTransilationResults.length && req.body.createTransilationResults[0] != -1; i++) {
        const data = req.body.createTransilationResults[i];
        con.query('INSERT INTO translations (question_id, t_question, t_option_1,t_option_2,t_option_3,t_option_4,t_answer,language,t_solution,t_question_url,t_solution_url,t_option_1_url,t_option_2_url,t_option_3_url,t_option_4_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [req.body.questionData.question_id, data.t_question, data.t_option_1, data.t_option_2, data.t_option_3, data.t_option_4, data.t_answer, data.language, data.t_solution, data.t_question_url, data.t_solution_url, data.t_option_1_url, data.t_option_2_url, data.t_option_3_url, data.t_option_4_url], function(error, results) {
            if (error) throw error;
            console.log(results);
        });

    }
    console.log("Concureent excuting of this UPDATE TRansliation query", req.body)
    for (let i = 0; i < req.body.updateTransilationResults.length && req.body.updateTransilationResults[0] != -1; i++) {
        const data = req.body.updateTransilationResults[i];

        var sqlQuery = 'UPDATE translations set t_question=?, t_option_1=?,t_option_2=?,t_option_3=?,t_option_4=?,t_answer=?,t_solution=?,';
        var queryParams = [data.t_question, data.t_option_1, data.t_option_2, data.t_option_3, data.t_option_4, data.t_answer, data.t_solution];

        if (data.t_question_url != '-1') {
            sqlQuery += ' t_question_url = ?,';
            queryParams.push(data.t_question_url);
        }

        if (data.t_solution_url != '-1') {
            sqlQuery += ' t_solution_url = ?,';
            queryParams.push(data.t_solution_url);
        }

        if (data.t_option_1_url != '-1') {
            sqlQuery += ' t_option_1_url = ?,';
            queryParams.push(data.t_option_1_url);
        }

        if (data.t_option_2_url != '-1') {
            sqlQuery += ' t_option_2_url = ?,';
            queryParams.push(data.t_option_2_url);
        }

        if (data.t_option_3_url != '-1') {
            sqlQuery += ' t_option_3_url = ?,';
            queryParams.push(data.t_option_3_url);
        }

        if (data.t_option_4_url != '-1') {
            sqlQuery += ' t_option_4_url = ?,';
            queryParams.push(data.t_option_4_url);
        }


        sqlQuery = sqlQuery.replace(/,$/, '');

        // Add the WHERE clause
        sqlQuery += ' WHERE translation_id = ?;';

        queryParams.push(data.translation_id);
        console.log(sqlQuery, queryParams);
        con.query(sqlQuery, queryParams, function(error, results) {
            if (error) throw error;
        });

    }
    }catch{

    }

});

// add question moment is the
router.post('/questions/AddQuestion', isLoggedIn, isAdmin, (req, res) => {
    try{
    console.log("hello Atlesat till here");
    console.log(req.body);
    con.query('select * from reference_tags where year=? and month=? and course=? and topic=? and sub_topic=? and difficulty=? and standard=?', [req.body.year, req.body.month, req.body.course, req.body.topic, req.body.sub_topic, req.body.difficulty, req.body.standard], function(error, reference_tags_obj) {
        if (error) throw error;
        console.log("reference_tags_obj ***************** TESTSING...7", reference_tags_obj);
        if (reference_tags_obj.length <= 0) {
            console.log("No Tag Found... Creating TAG");
            con.query('insert into reference_tags(year,month,course,topic,sub_topic,difficulty,standard) values(?,?,?,?,?,?,?);', [req.body.year, req.body.month, req.body.course, req.body.topic, req.body.sub_topic, req.body.difficulty, req.body.standard], function(error, results) {
                if (error) throw (error);
                console.log(results);
                if (results.insertId)
                    con.query('select * from reference_tags where reference_tags_id=?;', [results.insertId], function(error, reference_tags_obj) {
                        if (error) throw error;
                        console.log("came to Insert the question Testing ")

                        var sqlQuery = 'insert into questions set creator_id=?,question = ?, option_1 = ?,option_2 = ?,option_3 = ?,option_4= ?,answer = ?,reference_tags_id=?,questions.created_date=now(),approval="approved",solution =?,';
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
                                    console.log(results);
                                });

                            }
                        });

                    })
            })
        } else {
            console.log(req.body.questionData.question, req.body.questionData.option_1, req.body.questionData.option_2, req.body.questionData.option_3, req.body.questionData.option_4, req.body.questionData.answer, reference_tags_obj[0].reference_tags_id, req.body.questionData.question_url, req.body.questionData.question_id);

            var sqlQuery = 'insert into questions set creator_id=?,question = ?, option_1 = ?,option_2 = ?,option_3 = ?,option_4= ?,answer = ?,reference_tags_id=?,questions.created_date=now(),approval="approved",solution =?,';
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
                        console.log(results);
                    });

                }

            })

        }
    });}
    catch{
        
    }

});




// con.query('insert into questions set creator_id=?,reference_tag_id=?,question = ?, option_1 = ?,option_2 = ?,option_3 = ?,option_4= ?,answer = ?,date=now(),approval=?,question_url=?,answer_url=?',
// ['',req.questionData.question,reference_tags_obj.reference_tags_id,req.questionData.question,req.questionData.question,
// req.questionData.option_1,req.questionData.option_2,req.questionData.option_3,req.questionData.option_4,'','','','' ]
// ,function(error,results){
//     if (error) throw error;
//     res.json(reference_tags_obj);
// })


router.get('/questions/getReferencedata', isLoggedIn, isAdmin, (req, res) => {

    // con.query('SELECT * FROM questions q JOIN reference_tags rt ON q.reference_tags_id = rt.reference_tags_id;', function(error, results) {
    //     if (error) throw error;
    //     con.query('select distinct predefined.predefined_id, predefined.type, predefined.type_value from predefined where predefined.deleted != 1;',
    //         function(er, refResults) {
    //             if (er) throw er;
    //             console.log("from questions", results);
    //             res.render('a_questions_index', { results: results, refResults: refResults });
    //         });
    // })
})

//not using i guess;
// router.post('/questions/addQuestion', isLoggedIn, isAdmin, (req, res) => {
//     con.query('SELECT * FROM questions q JOIN reference_tags rt ON q.reference_tags_id = rt.reference_tags_id;', function(error, results) {
//         if (error) throw error;
//         console.log(results);
//         res.render('a_questions_index', { results });
//     })
// })


//
router.get('/referencedata', isLoggedIn, isAdmin, (req, res) => {
    con.query('select distinct predefined.predefined_id, predefined.type, predefined.type_value from predefined where predefined.deleted != 1;',
        function(error, results) {
            if (error) throw error;
            console.log(results);
            const questionRefdataDd = []
            for (i = 0; i < results.length; i++) {
                if (!questionRefdataDd.includes(results[i].type)) {
                    questionRefdataDd.push(results[i].type)
                }
            }
            res.render('a_referencedata_index', { results, user: req.user[0] })
        })
})


router.post('/referencedata/addReferenceData', isLoggedIn, isAdmin, (req, res) => {
    console.log('/referencedata/addReferenceData')
    req = req.body;
    console.log("***************", req);
    if (req.add == 'true') {
        console.log("add**********************", req.type)
        con.query('insert into predefined set type = ?,type_value = ?', [req.type, req.type_value],
            function(error, results) {
                if (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        console.log("error")
                        con.query(`update predefined set deleted="0" where type=? and type_value=?; `, [req.type, req.type_value], function(error, results) {
                            if (error) throw error;
                            console.log(results)
                            res.json({ sentData: req, insertId: results.insertId });
                        })
                    }
                } else {
                    console.log(results);
                    res.json({ sentData: req, insertId: results.insertId });
                }
                //res.render('a_referencedata_index', { results })
            })
    } else {
        console.log("edit********************", req.type)
        con.query('update predefined set type_value=? where predefined_id=? and type=? and deleted="0";', [req.type_value, req.predefined_id, req.type],
            function(error, results) {
                if (error) throw error;
                console.log(results);
                res.json({ sentData: req.body, insertId: results.insertId });
                //res.render('a_referencedata_index', { results })
            })
    }
})

router.delete('/referencedata/deleteReferenceData', isLoggedIn, isAdmin, (req, res) => {
    console.log('/referencedata/deleteReferenceData')
    req = req.body;
    console.log("***************", req);
    con.query('update predefined set deleted="1" where predefined_id=?', [req.predefined_id],
        function(error, results) {
            if (error) throw error;
            console.log(results);
            res.json('');
            //res.render('a_referencedata_index', { results })
        })

})

router.get('/addStudnetModalReferenceData', isLoggedIn, isAdmin, (req, res) => {
    con.query('select distinct * from predefined where  type="language" or type="school name";',
        function(error, results) {
            if (error) throw error;
            console.log(results);
            const questionRefdataDd = []
            for (i = 0; i < results.length; i++) {
                if (!questionRefdataDd.includes(results[i].type)) {
                    questionRefdataDd.push(results[i].type)
                }
            }
            res.render('a_referencedata_index', { results })
        })
})




// all student  
router.get('/questionsRequests', isLoggedIn, isAdmin, (req, res) => {

    con.query(`select *,DATE_FORMAT(questions.created_date, '%m/%d/%Y %h:%i %p') AS created_date1 from questions join user1 on questions.creator_id=user1.user_id join reference_tags on reference_tags.reference_tags_id=questions.reference_tags_id where questions.approval="pending";`,
        function(error, results) {
            if (error) throw error;
            con.query('select distinct predefined.predefined_id, predefined.type, predefined.type_value from predefined where predefined.deleted != 1;',
                function(er, refResults) {
                    if (er) throw er;
                    console.log("from questions", results);
                    res.render('a_requests_questions', { results, refResults, user: req.user[0] });
                });
        })
})

router.get('/teacherRequests', isLoggedIn, isAdmin, (req, res) => {
    con.query('select * from user1 where user1.user_role="teacher" and user1.approved=0;',
        function(error, results) {
            if (error) throw error;
            con.query("select distinct predefined.predefined_id, predefined.type, predefined.type_value from predefined where predefined.deleted != 1;",
                function(er, refResults) {
                    if (er) throw er;
                    res.render('a_requests_teacher', { results, refResults, user: req.user[0] })
                }
            )
        })
})

router.put('/teacherRequests/reject', isLoggedIn, isAdmin, (req, res) => {
    console.log("/teacherRequests/reject");
    req = req.body;
    console.log(req)
    con.query(`update user1 set user_name=?,school_name=?,user_email=?, preferred_language=?,approved=2 where user_id=? `, [req.username, req.schoolSelect, req.useremail, req.languageSelect, req.user_id], function(error, results) {
        if (error) throw error;
        res.json(results)
    });
})


router.post('/teacher/makeTeacherAsAdmin', isLoggedIn, isAdmin, (req, res) => {
    console.log("/teacher/makeTeacherAsAdmin");
    req = req.body;
    console.log(req)
    con.query(`update user1 set user_role='admin' where user_id=? `, [req.user_id], function(error, results) {
        if (error) throw error;
        res.json(results)
    });
})

router.put('/teacherRequests/approve', isLoggedIn, isAdmin, (req, res) => {
    console.log("/teacherRequests/approve");
    req = req.body;
    console.log(req)
    con.query(`update user1 set user_name=?,school_name=?,user_email=?, preferred_language=?,approved=1 where user_id=? `, [req.username, req.schoolSelect, req.useremail, req.languageSelect, req.user_id], function(error, results) {
        if (error) throw error;
        res.json(results)
            // con.query(`select distinct * from predefined where  type="language" or type="school name";`, function(errorIn, refResults) {
            //     console.log(results, refResults);
            //     res.render('a_student_index', { results, refResults });
            // });
    });
})



router.get('/referencedata/all', isLoggedIn, isAdmin, (req, res) => {

    console.log(pathtojson);
    res.json(pathtojson)
})

//View/Edit Class- view Student
router.get('/viewclass/:class_id', isLoggedIn, isAdmin, (req, res) => {
        con.query(`SELECT c.class_id,c.class_name,u.user_name,cm.student_id,u.user_email FROM class_members cm
    JOIN class c ON cm.class_id=c.class_id
    JOIN user1 u ON u.user_id=cm.student_id
    WHERE cm.class_id=? and cm.deleted=0 and u.deleted=0;
    SELECT * FROM user1 
    where user1.user_role = 'student' and user1.deleted='0' and user1.user_id not in (
        SELECT distinct cm.student_id 
        FROM class_members cm 
        JOIN class_teachers ct ON ct.class_id = cm.class_id 
        join user1 on cm.student_id = user1.user_id join class on cm.class_id = class.class_id 
        WHERE  class.class_id = ? and user1.deleted = '0' and class.deleted='0' and cm.deleted='0' and ct.deleted='0');
        
        SELECT u.user_email, u.user_name,u.user_role,u.approved, u.user_id
        FROM user1 u
        JOIN predefined p ON u.user_role = p.type_value
        LEFT JOIN class_teachers ct ON u.user_id = ct.teacher_id AND ct.class_id = ?
        WHERE p.type_value IN ('teacher', 'admin') AND ct.teacher_id IS NULL
        
            AND u.deleted = 0 and (u.approved=1 and u.user_role='teacher') or u.user_role='admin'`, [req.params.class_id, req.params.class_id, req.params.class_id], function(error, results) {
            if (error) throw error;
            else {

                let class_name = req.query.class_name;

                res.render('a_viewclass', { data0: results[0], data1: results[1], data2: results[2], class_id: req.params.class_id, class_name: class_name, user: req.user[0] });
            }
        });
    })
    // Add Students in view Class
router.post('/class/:class_id/students', isLoggedIn, isAdmin, (req, res, next) => {
        try {
            const values = [];
            for (let i = 0; i < req.body.studentname.length; i++) {
                values.push([req.params.class_id, req.body.studentname[i]]);
            }

            con.query(" INSERT INTO class_members (class_id, student_id) VALUES ?;", [values], function(error, results) {
                if (error) next(error);
                else {
                    res.redirect('/admin/viewclass/' + req.params.class_id + '?class_name=' + req.body.class_name);
                }
            });
        } catch (err) {
            next(err);
        }

    })
    //   Add coteacher in view class
router.post('/class/:class_id/coteachers', isLoggedIn, isAdmin, (req, res, next) => {
        try {
            const values = [];
            console.log(req)
            for (let i = 0; i < req.body.coteachername.length; i++) {
                values.push([req.params.class_id, req.body.coteachername[i]]);
            }

            con.query("INSERT INTO class_teachers (class_id, teacher_id) VALUES ?", [values], function(error, results) {
                if (error) {
                    next(error);
                } else {
                    res.send(`
            <script>
              alert('Teachers added successfully!');
              window.location.href = '/admin/viewclass/${req.params.class_id}?class_name=${req.body.class_name}';
            </script>
          `);
                }
            });
        } catch (err) {
            next(err);
        }

    })
    //   Assign Task in class
    //assigntask Page
router.get("/assigntask", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`select question_id,question,SUBSTRING(question,1,40) as initialText,question_url, topic, sub_topic, month, year, standard, difficulty,r.course 
      from  questions q 
      join reference_tags r on r.reference_tags_id=q.reference_tags_id 
     where q.deleted=0 and r.deleted=0 and q.approval='approved';
     select  distinct course from reference_tags rt where rt.course is not null AND rt.course <> '' `, function(error, results) {
            if (error) next(error);
            else {
                let class_name = req.query;
                let class_id = req.query.class_id;

                res.render('a_assigntaskclass', { class_name: class_name, class_id: class_id, data0: results[0], data1: results[1], user: req.user[0] });
            }
        });
    } catch (err) {
        next(err);
    }

})

//   preview in class assigntask
router.post("/assigntask/preview", isLoggedIn, isAdmin, (req, res, next) => {

        try {
            const values = [];
            if (req.body.questionIds != undefined) {
                for (let i = 0; i < req.body.questionIds.length; i++) {
                    values.push([req.body.questionIds[i]]);
                }
            }
            console.log("Values:", values);
            con.query("select * from questions where question_id in (?);", [values], function(error, results) {
                if (error) next(error);
                console.log(req);
                res.send(results);
                console.log("results:", results);
            });
        } catch (err) {
            next(err);
        }


    })
    //   Assign assignment to a class
router.post("/assigntask", isLoggedIn, isAdmin, (req, res, next) => {
        try {
            con.query("INSERT INTO test (test_name, teacher_id, due_date,course,created_date) values (?,?,?,?,now());", [req.body.assignmentName, req.user[0].user_id, req.body.dueDate, req.body.coursevalue, ], function(error, results) {
                if (error) next(error);
                else {
                    const test_id = results.insertId;
                    const values = [];
                    if (req.body.questionIds != undefined) {
                        for (let i = 0; i < req.body.questionIds.length; i++) {
                            values.push([test_id, req.body.questionIds[i]]);
                        }
                    }
                    con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function(error, results1) {
                        if (error) next(error);
                        else {
                            con.query("INSERT INTO class_tests (class_id, test_id,created_date,due_date,is_timed,time) values (?,?,now(),?,?,?);", [req.body.class_id, `${test_id}`, req.body.dueDate, req.body.isTimed, req.body.timer], function(error, results1) {
                                if (error) next(error);
                                res.redirect('/admin/class')
                            });
                        }
                    });
                }
            });
        } catch (err) {
            next(err);
        }

    })
    //View Tasks in class
router.get("/viewtask/:class_id", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`select c.class_name,t.test_name,DATE_FORMAT(ct.created_date, '%m/%d/%Y %h:%i %p') AS created_date,c.class_id,DATE_FORMAT(ct.due_date, '%m/%d/%Y %h:%i %p') AS due_date,ct.test_id from class c
      join class_tests ct on ct.class_id=c.class_id
      join test t on t.test_id=ct.test_id
     
      where c.class_id=? and c.deleted=0 and ct.deleted=0 and t.deleted=0  ;`, [req.params.class_id], function(error, results) {
            if (error) next(error);
            else {
                console.log(results)
                let class_name = req.query.class_name;

                res.render('a_viewtaskclass', { class_name, data0: results, user: req.user[0].user_id, class_id: req.params.class_id });
            }
        });

    } catch (err) {
        next(err);
    }
});

//   Delete task in viewtask class
router.post("/viewtask/delete", isLoggedIn, isAdmin, (req, res, next) => {
        try {
            con.query(` UPDATE class_tests ct
      JOIN class c ON ct.class_id = c.class_id
      JOIN test t ON ct.test_id = t.test_id
      
    SET ct.deleted = 1
    WHERE c.class_id = ?
    and t.test_id=?
      AND c.deleted = 0 
      AND t.deleted = 0 
       ;`, [req.body.class_id, req.body.test_id], function(error, results) {
                if (error) next(error);
                else {
                    res.redirect('/admin/viewtask/' + req.body.class_id + '?class_name=' + req.body.class_name);
                }
            });
        } catch (err) {
            next(err);
        }
    })
    //   viewtask questions in class
router.get('/v/questions/:class_id/:test_id', isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`SELECT q.question_id,q.question,rt.topic,rt.year,rt.month,rt.standard,rt.difficulty,t.test_id,c.class_id,DATE_FORMAT(cts.due_date, '%m/%d/%Y %h:%i %p') AS due_date,tq.test_questions_id,q.question_url FROM class c
      JOIN class_tests cts on cts.class_id=c.class_id
      JOIN test t on t.test_id=cts.test_id
      JOIN test_questions tq on tq.test_id=t.test_id
      Join questions q on q.question_id=tq.question_id and q.deleted=0 and q.approval='approved'
      
      join reference_tags rt on rt.reference_tags_id=q.reference_tags_id
      WHERE c.class_id=? and t.test_id=? and c.deleted=0 and t.deleted=0 and tq.deleted=0 ;
      select question_id,question,SUBSTRING(question,1,40) as initialText,q.question_url, topic, sub_topic, month, year, standard, difficulty,r.course from  questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where q.deleted=0 ;`, [req.params.class_id, req.params.test_id], function(error, results) {
            if (error) next(error);
            else {
                // console.log(results[0])
                res.render('a_viewtaskclass_questions', { class_name: req.query.class_name, test_name: req.query.test_name, data0: results[0], user: req.user[0].user_id, class_id: req.params.class_id, test_id: req.params.test_id, data1: results[1] });
            }
        });
    } catch (err) {
        next(err);
    }
});

//   questions in view task delete
router.post('/v', isLoggedIn, isAdmin, (req, res, next) => {
    try {
        let test_id = req.body.test_id;

        const values = [];
        if (req.body.questionIds != undefined) {
            for (let i = 0; i < req.body.questionIds.length; i++) {
                values.push([test_id, req.body.questionIds[i]]);
            }
        }


        con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function(error, results1) {
            if (error) next(error);
            else {
                // http://localhost/teacher/v/questions/1/1?class_name=class%20A
                res.json({ nextRoute: '/admin/v/questions/' + req.body.class_id + '/' + req.body.test_id + '?class_name=' + req.body.class_name + '&test_name=' + req.body.test_name });
            }
        });
    } catch (err) {
        next(err);
    }
});
//delete questions in a particular task in a class
router.post("/viewtask/questions/delete", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(` UPDATE test_questions
      SET deleted = 1
      WHERE test_id = ? and test_questions_id=? ;`, [req.body.test_id, req.body.test_questions_id], function(error, results) {
            if (error) next(error);
            else {


                res.redirect('/admin/v/questions/' + req.body.class_id + '/' + req.body.test_id + '?class_name=' + req.body.class_name + '&test_name=' + req.body.test_name);
            }
        });
    } catch (err) {
        next(err);
    }
    // console.log(req);
})

router.post('/v/duedate', isLoggedIn, isAdmin, (req, res, next) => {
    try {

        con.query("update class_tests set due_date=? where test_id=?", [req.body.datetimeMySQL, req.body.test_id], function(error, results1) {
            if (error) next(error);
            //http://localhost/admin/v/questions/29/78?class_name=Class%20testing%201&test_name=Class%20Test%201
            res.json({ nextRoute: '/admin/v/questions/' + req.body.class_id + '/' + req.body.test_id + '?class_name=' + req.body.class_name + '&test_name=' + req.body.tes });

        });

    } catch (err) {
        next(err);
    }
});

//   Delete student in a class
router.post('/student/delete', isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`Update class_members cm1 
      JOIN class c  ON c.class_id = cm1.class_id 
      JOIN user1 t1 ON cm1.student_id = t1.user_id 
      LEFT JOIN class_members cm2 ON c.class_id = cm2.class_id AND cm1.student_id <> cm2.student_id 
      LEFT JOIN user1 t2 ON cm2.student_id = t2.user_id set cm1.deleted='1' 
      WHERE c.class_id=? and cm1.student_id = ?;`, [req.body.class_id, req.body.student_id], function(error, results) {

            if (error) next(error);
            else {

                res.redirect('/admin/viewclass/' + req.body.class_id + '?class_name=' + req.body.class_name);
            }
        });
    } catch (err) {
        next(err);
    }

})

//   assigntask in view/edit
router.get("/assignstudent", isLoggedIn, isAdmin, (req, res, next) => {
        try {
            con.query(`select q.question_id,question,question_url ,SUBSTRING(question,1,40) as initialText, topic, sub_topic, month, year, standard, difficulty,r.course 
      from  questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where q.deleted=0 and q.approval='approved';
      select  distinct course from reference_tags rt where rt.course is not null AND rt.course <> ''`, function(error, results) {
                if (error) next(error);
                else {

                    let class_name = req.query.class_name;
                    let student_id = req.query.student_id;
                    let class_id = req.query.class_id;
                    let user_name = req.query.student_name;

                    res.render('a_assigntaskstudent', { class_name, data0: results[0], user: req.user[0], student_id, class_id, user_name: user_name, data1: results[1] });
                }
            });
        } catch (err) {
            next(err);
        }
    })
    //   preview for student question
router.post("/assigntaskstudent/preview", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        const values = [];
        if (req.body.questionIds != undefined) {
            for (let i = 0; i < req.body.questionIds.length; i++) {
                values.push([req.body.questionIds[i]]);
            }
        }
        console.log("Values:", values);
        con.query("select * from questions where question_id in (?);", [values], function(error, results) {
            if (error) next(error);
            res.send(results);
        });
    } catch (err) {
        next(err);
    }
})

//   assign task in view edit
router.post("/assignstudent", isLoggedIn, isAdmin, (req, res, next) => {
        try {
            con.query("INSERT INTO test (test_name, teacher_id, due_date,course,created_date) values (?,?,?,?,now());", [req.body.assignmentName, req.user[0].user_id, req.body.dueDate, req.body.coursevalue, ], function(error, results) {
                if (error) next(error);
                else {
                    const test_id = results.insertId;
                    const values = [];
                    if (req.body.questionIds != undefined) {
                        for (let i = 0; i < req.body.questionIds.length; i++) {
                            values.push([test_id, req.body.questionIds[i]]);
                        }
                    }

                    con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function(error, results1) {
                        if (error) next(error);
                        else {

                            con.query("INSERT INTO assigned_questions (assigned_questions_id,class_id, test_id,student_id,teacher_id,created_date,due_date,is_timed,time) values (?,?,?,?,?,now(),?,?,?);", [, req.body.class_id, `${test_id}`, req.body.student_id1, req.user[0].user_id, req.body.dueDate, req.body.isTimed, req.body.timer], function(error, results1) {
                                if (error) next(error);
                                else {

                                    res.json({ nextRoute: '/admin/viewclass/' + req.body.class_id + 'class_name=' + req.body.class_name });
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
    //view task students
router.get("/viewtask1", isLoggedIn, isAdmin, (req, res, next) => {
        try {
            con.query(` SELECT c.class_name,t.test_name,DATE_FORMAT(aq.due_date, '%m/%d/%Y %h:%i %p') AS due_date,DATE_FORMAT(aq.created_date, '%m/%d/%Y %h:%i %p') AS created_date,c.class_id,aq.test_id,aq.student_id FROM class c
   
      JOIN class_members cm on cm.class_id=c.class_id
      
      JOIN assigned_questions aq on aq.student_id=cm.student_id and aq.class_id=cm.class_id
      JOIN test t on t.test_id=aq.test_id
    
      
      Where c.class_id=?  and cm.student_id=? and cm.deleted=0 and c.deleted=0 and aq.deleted=0 and t.deleted=0;`, [req.query.class_id, req.query.student_id], function(error, results) {
                if (error) next(error);
                else {

                    let student_id = req.query.student_id;
                    let class_id = req.query.class_id;

                    res.render('a_viewtaskstudent', { user_name: req.query.user_name, class_name: req.query.class_name, class_id: class_id, student_id: student_id, data0: results, user: req.user[0] });

                }
            });
        } catch (err) {
            next(err);
        }

    })
    //   delete task in view edit
router.post("/viewtask1/student/delete", isLoggedIn, isAdmin, (req, res, next) => {
    console.log(req.user[0].user_id);
    try {
        con.query(`UPDATE assigned_questions aq 
      join class c on c.class_id=aq.class_id
      join class_members cm on c.class_id=cm.class_id
      join class_teachers cts on cts.class_id=c.class_id
      join test t on t.test_id=aq.test_id
      join test_questions tq on tq.test_id=t.test_id
       set aq.deleted=1
       where c.class_id=?  and cm.student_id=? and aq.test_id=?;`, [req.body.class_id, req.body.student_id, req.body.test_id], function(error, results) {
            if (error) next(error);
            else {

                res.redirect('/admin/viewtask1?class_id=' + req.body.class_id + '&student_id=' + req.body.student_id + '&class_name=' + req.body.class_name + '&user_name=' + req.body.user_name);

            }
        });
    } catch (err) {
        next(err);
    }
})
router.get("/viewtask1/student/question", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`select t.test_id, t.test_name, q.question_id ,q.question, q.question_url, aq.class_id,rt.topic,rt.sub_topic,rt.month,rt.year,rt.difficulty,rt.standard,DATE_FORMAT(aq.due_date, '%m/%d/%Y %h:%i %p') AS due_date,rt.course,tq.test_questions_id
      from questions q
      join reference_tags rt on rt.reference_tags_id=q.reference_tags_id
      join test_questions tq on tq.question_id = q.question_id and q.deleted=0
      join test t on tq.test_id = t.test_id
      join assigned_questions aq on t.test_id = aq.test_id
    
      where aq.class_id=? and aq.student_id=? and tq.test_id=?  and tq.deleted=0 and aq.deleted=0;
      select question_id,question,SUBSTRING(question,1,40) as initialText,q.question_url, topic, sub_topic, month, year, standard, difficulty,r.course from  questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where q.deleted=0 and q.approval='approved' `, [req.query.class_id, req.query.student_id, req.query.test_id], function(error, results) {
            if (error) next(error);
            else {

                res.render('a_viewtask_student_question', { test_name: req.query.test_name, user_name: req.query.user_name, class_name: req.query.class_name, class_id: req.query.class_id, student_id: req.query.student_id, test_id: req.query.test_id, user: req.user[0], data0: results[0], data1: results[1] });

            }
        });
    } catch (err) {
        next(err);
    }

})
router.post("/viewtask1/student/addquestion", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        let test_id = req.body.test_id;

        const values = [];
        if (req.body.questionIds != undefined) {
            for (let i = 0; i < req.body.questionIds.length; i++) {
                values.push([test_id, req.body.questionIds[i]]);
            }
        }


        con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function(error, results1) {
            if (error) next(error);
            else {

                // http://localhost/teacher/viewtask1/student/question?class_id=1&test_id=24&student_id=112690867271153442852&class_name=class%20A&user_name=M.%20Sai%20Rochan
                res.json({ nextRoute: '/admin/viewtask1/student/question?class_id=' + req.body.class_id + '&test_id=' + req.body.test_id + '&student_id=' + req.body.student_id + '&class_name=' + req.body.class_name + '&user_name=' + req.body.user_name });
            }
        });
    } catch (err) {
        next(err);
    }
})
router.post('/viewtask1/duedate', isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query("update assigned_questions set due_date=? where test_id=?", [req.body.datetimeMySQL, req.body.test_id], function(error, results) {
            if (error) next(error);
            // http://localhost/admin/viewtask1/student/question?class_id=27&test_id=109&student_id=9&class_name=Algebra&user_name=M.%20Sai%20Rochan&test_name=test%201121
            // res.redirect('/teacher/viewtask1/student/question?class_id=1&test_id=43&student_id=118323662810681107996&class_name=class%20A&user_name=Subhasri')
        });
    } catch (err) {
        next(err);
    }

});
router.post("/viewtask1/questions/delete", isLoggedIn, isAdmin, (req, res, next) => {
        try {
            con.query(`UPDATE test_questions tq 
      set tq.deleted=1
      where tq.test_id=? and tq.test_questions_id=?;		;`, [req.body.test_id, req.body.test_questions_id], function(error, results) {
                if (error) next(error);
                else {
                    console.log(req);
                    // http://localhost/admin/viewtask1/student/question?class_id=1&test_id=68&student_id=9&class_name=class%20A&user_name=M.%20Sai%20Rochan
                    res.redirect('/admin/viewtask1/student/question?class_id=' + req.body.class_id + '&test_id=' + req.body.test_id + '&student_id=' + req.body.student_id + '&class_name=' + req.body.class_name + '&user_name=' + req.body.user_name);

                }
            });
        } catch (err) {
            next(err);
        }
    })
    // loginAuthfucntions


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
router.get("/student/viewtask1", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(` select t.test_name,t.test_id,DATE_FORMAT(t.created_date, '%m/%d/%Y %h:%i %p') AS created_date,DATE_FORMAT(aq.due_date, '%m/%d/%Y %h:%i %p') AS due_date,aq.student_id from test t
      join assigned_questions aq on aq.test_id=t.test_id
      where aq.student_id=? and aq.deleted=0 and t.deleted=0 `, [req.query.student_id], function(error, results) {
            if (error) next(error);
            else {


                res.render('a_studentviewtask', { user_name: req.query.user_name, data0: results, user: req.user[0], student_id: req.query.student_id });

            }
        });
    } catch (err) {
        next(err);
    }

})
router.get("/student/viewtask1/question", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`select t.test_id, t.test_name, q.question_id ,q.question, q.question_url, aq.class_id,rt.topic,rt.sub_topic,rt.month,rt.year,rt.difficulty,rt.standard,DATE_FORMAT(aq.due_date, '%m/%d/%Y %h:%i %p') AS due_date,tq.test_questions_id
      from questions q
      join reference_tags rt on rt.reference_tags_id=q.reference_tags_id
      join test_questions tq on tq.question_id = q.question_id
      join test t on tq.test_id = t.test_id
      join assigned_questions aq on t.test_id = aq.test_id
      join user1 u on u.user_id=aq.student_id
      where t.test_id=? and u.user_id=? and aq.deleted=0 and t.deleted=0 and tq.deleted=0;
      select question_id,question,SUBSTRING(question,1,40) as initialText,question_url, topic, sub_topic, month, year, standard, difficulty,r.course from  questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where q.deleted=0 and q.approval='approved'`, [req.query.test_id, req.query.student_id], function(error, results) {
            if (error) next(error);
            else {
                console.log(results[0].due_date);
                res.render('a_studentviewtask_questions', { user_name: req.query.user_name, student_id: req.query.student_id, test_id: req.query.test_id, user: req.user[0], data0: results[0], data1: results[1], test_name: req.query.test_name });

            }
        });
    } catch (err) {
        next(err);
    }
    //   console.log(req)
})
router.post('/studentpreviewquestions', isLoggedIn, isAdmin, (req, res) => {

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
   router.post('/classstudentpreviewquestions', isLoggedIn, isAdmin, (req, res) => {

    con.query(`select t.test_name,q.question_id,q.question, q.option_1,q.option_2, q.option_3,
    q.option_4,q.answer,q.solution, q.question_url, q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
    q.solution_url from questions q
  join test_questions tq on tq.question_id=q.question_id
  join test t on t.test_id=tq.test_id
  where t.test_id=? and tq.deleted=0;`, [req.body.test_id], function (error, results) {
      if (error) next(error); 
     
      res.send(results);
    
    });
// console.log(req.body)
  
   
   })
   router.post('/classpreviewquestions', isLoggedIn, isAdmin, (req, res) => {

    con.query(`select t.test_name,q.question_id,q.question, q.option_1,q.option_2, q.option_3,
    q.option_4,q.answer,q.solution, q.question_url, q.option_1_url, q.option_2_url, q.option_3_url, q.option_4_url,
    q.solution_url from questions q
  join test_questions tq on tq.question_id=q.question_id
  join test t on t.test_id=tq.test_id
  where t.test_id=? and tq.deleted=0 and q.deleted=0 and q.approval='approved';`, [req.body.test_id], function (error, results) {
      if (error) next(error); 
     
      res.send(results);
    
    });
// console.log(req.body)
  
   
   })
router.post("/student/viewtask1/addquestion", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        let test_id = req.body.test_id;

        const values = [];
        if (req.body.questionIds != undefined) {
            for (let i = 0; i < req.body.questionIds.length; i++) {
                values.push([test_id, req.body.questionIds[i]]);
            }
        }


        con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function(error, results1) {
            if (error) next(error);
            else {

                // http://localhost/admin/viewtask1/student/question?class_id=27&test_id=98&student_id=12&class_name=undefined&user_name=Ron%20Weasley&test_name=Dependent%20Variables%20
                res.json({ nextRoute: '/admin/viewtask1/student/question?class_id=' + req.body.class_id + '&test_id=' + req.body.test_id + '&student_id=' + req.body.student_id + '&class_name=' + req.body.class_name + '&user_name=' + req.body.user_name + '&test_name=' + req.body.test_name });
            }
        });
    } catch (err) {
        next(err);
    }
    // console.log(req)
})
router.post("/studentindex/viewtask1/addquestion", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        let test_id = req.body.test_id;

        const values = [];
        if (req.body.questionIds != undefined) {
            for (let i = 0; i < req.body.questionIds.length; i++) {
                values.push([test_id, req.body.questionIds[i]]);
            }
        }


        con.query("INSERT INTO test_questions (test_id, question_id) VALUES ?", [values], function(error, results1) {
            if (error) next(error);
            else {

                // http://localhost/admin/student/viewtask1/question?test_id=68&student_id=4&test_name=Expressions%20and%20functions%20&user_name=Argus%20Filch
                res.json({ nextRoute: '/admin/student/viewtask1/question?test_id=' + req.body.test_id + '&student_id=' + req.body.student_id + '&test_name=' + req.body.test_name + '&user_name=' + req.body.user_name });
            }
        });
    } catch (err) {
        next(err);
    }
    // console.log(req)
})
router.post('/student/viewtask1/duedate', isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query("update assigned_questions set due_date=? where test_id=?", [req.body.datetimeMySQL, req.body.test_id], function(error, results) {
            if (error) next(error);
            // http://localhost/admin/viewtask1/student/question?class_id=27&test_id=109&student_id=9&class_name=Algebra&user_name=M.%20Sai%20Rochan&test_name=test%201121
            res.json({ nextRoute: '/admin/viewtask1/student/question?class_id=' + req.body.class_id + '&test_id=' + req.body.test_id + '&student_id=' + req.body.student_id + '&class_name=' + req.body.class_name + '&user_name=' + req.body.user_name + '&test_name=' + req.body.test_name });
        });
    } catch (err) {
        next(err);
    }

});
router.post('/studentindex/viewtask1/duedate', isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query("update assigned_questions set due_date=? where test_id=?", [req.body.datetimeMySQL, req.body.test_id], function(error, results) {
            if (error) next(error);
            // http://localhost/admin/student/viewtask1/question?test_id=75&student_id=9&test_name=Functions%202&user_name=M.%20Sai%20Rochan
            res.json({ nextRoute: '/admin/student/viewtask1/question?test_id=' + req.body.test_id + '&student_id=' + req.body.student_id + '&test_name=' + req.body.test_name + '&user_name=' + req.body.user_name });
        });
    } catch (err) {
        next(err);
    }

});
router.post("/student/viewtask1/questions/delete", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`UPDATE test_questions tq
      join assigned_questions aq on aq.test_id=tq.test_id 
           set tq.deleted=1
           where aq.test_id=? and tq.test_questions_id=?	;`, [req.body.test_id, req.body.test_questions_id], function(error, results) {
            if (error) next(error);
            else {
                // console.log(results)
                // http://localhost/admin/viewtask1/student/question?class_id=27&test_id=109&student_id=9&class_name=Algebra&user_name=M.%20Sai%20Rochan&test_name=test%201121
                res.redirect('/admin/viewtask1/student/question?class_id=' + req.body.class_id + '&test_id=' + req.body.test_id + '&student_id=' + req.body.student_id + '&class_name=' + req.body.class_name + '&user_name=' + req.body.user_name + '&test_name=' + req.body.test_name);

            }
        });
    } catch (err) {
        next(err);
    }
    // console.log(req)
})
router.post("/studentindex/viewtask1/questions/delete", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`UPDATE test_questions tq
      join assigned_questions aq on aq.test_id=tq.test_id 
           set tq.deleted=1
           where aq.test_id=? and tq.test_questions_id=?	;`, [req.body.test_id, req.body.test_questions_id], function(error, results) {
            if (error) next(error);
            else {
                // /http://localhost/admin/student/viewtask1/question?test_id=70&student_id=9&test_name=Constant%20&user_name=M.%20Sai%20Rochan
                res.redirect('/admin/student/viewtask1/question?test_id=' + req.body.test_id + '&student_id=' + req.body.student_id + '&test_name=' + req.body.test_name + '&user_name=' + req.body.user_name);

            }
        });
    } catch (err) {
        next(err);
    }
    // console.log(req)
})
router.get("/analytics", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`    SELECT 
        ct.test_id,
        t.test_name,DATE_FORMAT(ct.created_date, '%m/%d/%Y %h:%i %p') AS created_date,DATE_FORMAT(ct.due_date, '%m/%d/%Y %h:%i %p') AS due_date, 
        AVG(str.score) as avg_score,
        GROUP_CONCAT(DISTINCT u.user_name SEPARATOR ', ') AS attempted,
        GROUP_CONCAT(DISTINCT u2.user_name SEPARATOR ', ') AS not_attempted,
        COUNT(DISTINCT cm.student_id)  as not_attempted_count, 
        COUNT(DISTINCT str.student_id) AS num_attempted,
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
        ct.test_id, num_attempted ASC
  
  ;`, [req.query.class_id], function(error, results) {
            if (error) next(error);
            else {

                res.render('a_class_analytics', { data0: results, class_name: req.query.class_name, user: req.user[0] });
            }
        });

    } catch (err) {
        next(err);
    }
})
router.get("/class/analytics", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`  SELECT 
      t.test_name,DATE_FORMAT(ct.created_date, '%m/%d/%Y') AS created_date,DATE_FORMAT(ct.due_date, '%m/%d/%Y') AS due_date,
      CASE WHEN str.score IS NULL THEN NULL ELSE str.score END AS score,
      u.user_name,
      str.percentage
  FROM 
      class c
  JOIN 
      class_members cm ON cm.class_id = c.class_id
  JOIN 
      user1 u ON u.user_id = cm.student_id
  JOIN 
      class_tests ct ON ct.class_id = cm.class_id
  LEFT JOIN 
      student_test_result str ON str.test_id = ct.test_id AND str.class_id = ct.class_id AND str.student_id = cm.student_id
  JOIN 
      test t ON t.test_id = ct.test_id
  WHERE 
      c.class_id = ? AND c.deleted = 0 AND ct.deleted = 0 AND ct.test_id = ? and cm.deleted=0 and u.deleted=0;
  ;`, [req.query.class_id, req.query.test_id], function(error, results) {
            if (error) next(error);
            else {

                res.render('a_viewtask_analytics', { data0: results, class_name: req.query.class_name, test_name: req.query.test_name, class_id: req.query.class_id, user: req.user[0] });
            }
        });

    } catch (err) {
        next(err);
    }
})
router.get("/student/analytics", isLoggedIn, isAdmin, (req, res, next) => {
    try {
        con.query(`  SELECT 
      aq.test_id,DATE_FORMAT(aq.created_date, '%m/%d/%Y') AS created_date,DATE_FORMAT(aq.due_date, '%m/%d/%Y') AS due_date,
      CASE WHEN str.score IS NULL THEN NULL ELSE str.score END AS score,
      t.test_name
  FROM 
      class c
  JOIN 
      class_members cm ON cm.class_id = c.class_id
  JOIN 
      assigned_questions aq ON aq.class_id = c.class_id AND aq.deleted = 0
  LEFT JOIN 
      student_test_result str ON str.test_id = aq.test_id AND str.student_id = cm.student_id
  JOIN 
      test t ON t.test_id = aq.test_id AND t.deleted = 0
  WHERE 
      cm.student_id = ?
    and
      aq.student_id=? and aq.class_id=?
      AND cm.deleted = 0
  ;`, [req.query.student_id, req.query.student_id, req.query.class_id], function(error, results) {
            if (error) next(error);
            else {

                res.render('a_student_analytics', { data0: results, class_name: req.query.class_name, class_id: req.query.class_id, student_name: req.query.user_name, user: req.user[0] });
            }
        });

    } catch (err) {
        next(err);
    }
})
router.get("/studentindex/analytics", isLoggedIn, isAdmin, (req, res, next) => {
        try {
            con.query(` SELECT class_tests.is_timed, str.score, str.percentage, TIME_TO_SEC(class_tests.time) as time, DATE_FORMAT(class_tests.created_date, '%m/%d/%Y %h:%i %p') AS created_date , str.is_submitted, str.option_selected, class_members.student_id, test.test_id, 
            class.class_id, class.class_name, UPPER(test.test_name) AS test_name, test.course, DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p') AS due_date,
            COUNT(DISTINCT test_questions.question_id) AS question_count,
            GROUP_CONCAT(DISTINCT u2.user_name SEPARATOR ',') AS teacher_name,
            COALESCE(NULL, 'n') AS assigned_questions_id
            FROM test
            JOIN test_questions ON test_questions.test_id = test.test_id
            join questions q on q.question_id = test_questions.question_id
            JOIN class_tests ON test.test_id = class_tests.test_id
            JOIN class ON class_tests.class_id = class.class_id
            JOIN class_members ON class.class_id = class_members.class_id
            JOIN class_teachers ON class_teachers.class_id = class.class_id
            JOIN user1 u2 ON class_teachers.teacher_id = u2.user_id
            JOIN user1 ON class_members.student_id = user1.user_id
            and user1.user_id =? and class_tests.deleted=0 and test.deleted=0 and class.deleted=0 and class_members.deleted=0
            left join student_test_result str on str.student_id = class_members.student_id
            and str.test_id = test.test_id and str.class_id = class.class_id
            GROUP BY test.test_id
            UNION
            SELECT aq.is_timed, str.score, str.percentage, TIME_TO_SEC(aq.time) as time,DATE_FORMAT(aq.created_date, '%m/%d/%Y %h:%i %p') AS created_date, str.is_submitted, str.option_selected, class_members.student_id, test.test_id, 
            class.class_id, class.class_name, UPPER(test.test_name) AS test_name, test.course, DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p') AS due_date,
            COUNT(DISTINCT test_questions.question_id) AS question_count,
            GROUP_CONCAT(DISTINCT u2.user_name SEPARATOR ',') AS teacher_name,
            aq.assigned_questions_id
            FROM test
            JOIN assigned_questions aq ON aq.test_id = test.test_id
            JOIN test_questions ON test_questions.test_id = test.test_id
            join questions q on q.question_id = test_questions.question_id
            JOIN class ON aq.class_id = class.class_id
            JOIN class_members ON class.class_id = class_members.class_id
            JOIN class_teachers ON class_teachers.class_id = class.class_id
            JOIN user1 u2 ON class_teachers.teacher_id = u2.user_id
            JOIN user1 ON class_members.student_id = user1.user_id
            and user1.user_id=? AND aq.student_id=? AND test.deleted=0
            and aq.deleted=0 and class.deleted=0 and class_members.deleted=0
            left join student_test_result str on str.student_id = class_members.student_id
            and str.test_id = test.test_id and str.class_id = class.class_id
            GROUP BY test.test_id
            UNION
            SELECT aq.is_timed, str.score, str.percentage, TIME_TO_SEC(aq.time) as time, DATE_FORMAT(aq.created_date, '%m/%d/%Y %h:%i %p') AS created_date, str.is_submitted, str.option_selected, aq.student_id, test.test_id, 
            COALESCE(NULL, 'n') as class_id, COALESCE(NULL, 'n') as class_name, UPPER(test.test_name) AS test_name, test.course, DATE_FORMAT(test.due_date, '%m/%d/%Y %h:%i %p') AS due_date,
            COUNT(DISTINCT test_questions.question_id) AS question_count,
            u1.user_name AS teacher_name,
            aq.assigned_questions_id
            FROM test
            JOIN assigned_questions aq ON aq.test_id = test.test_id
            JOIN user1 on aq.student_id = user1.user_id
            JOIN user1 u1 ON aq.teacher_id = u1.user_id
            JOIN test_questions ON test_questions.test_id = test.test_id
            join questions q on q.question_id = test_questions.question_id
            and aq.student_id=? AND test.deleted=0 and aq.class_id is null
            and aq.deleted=0
            left join student_test_result str on aq.student_id = str.student_id
            and str.test_id = test.test_id and str.class_id is null
            GROUP BY test.test_id
  ;`, [req.query.student_id, req.query.student_id,req.query.student_id,req.query.student_id], function(error, results) {
                if (error) next(error);
                else {

                    res.render('a_studentindex_analytics', { data0: results, student_name: req.query.user_name, user: req.user[0], student_id: req.query.student_id });
                }
            });

        } catch (err) {
            next(err);
        }
    })
    //profile
router.get("/profile", isLoggedIn, isAdmin, (req, res, next) => {
        try {
            con.query(`select type_value from predefined where type=?;select type_value from predefined where type=?;
            select preferred_language,school_name from user1 where user_id = ?;`,
            ['language', 'school name', req.user[0].user_id],  function (error, results) {
                if (error) next(error);
                else {

                    res.render('a_profile', { data0: results[0], data1: results[1], data2: results[2], data3: results[3],user: req.user[0] });
                }
            });
        } catch (err) {
            next(err);
        }
    })
    //update student profile
router.post('/profile',isLoggedIn,isAdmin, (req, res, next) => {
    try {
        con.query('update user1 set preferred_language = ?,school_name = ? where user_id=?;', [req.body.preferred_language, req.body.school_name, req.user[0].user_id], function(error, results) {
            if (error) next(error);
            else {
                console.log(req);
                res.redirect('/admin/profile');
            }
        });
    } catch (err) {
        next(err);
    }
});
router.get('/tests',isLoggedIn,isAdmin, (req, res, next) => {
  
  try {
    con.query(`SELECT  test.test_id, test.course,test.topic, test.sub_topic, test.test_name
    FROM test 
    join test_questions on test.test_id = test_questions.test_id 
    join questions on questions.question_id = test_questions.question_id 
    join reference_tags on questions.reference_tags_id  = reference_tags.reference_tags_id 
    and test.course=reference_tags.course and test.topic IS NOT NULL AND test.topic <> ''
    and test.sub_topic IS NOT NULL AND test.sub_topic <> ''
    and test.deleted=0 and test_questions.deleted=0 and reference_tags.deleted=0 
    and questions.deleted=0 and questions.approval='approved' group by test_id;`, function(error, results) {
        if (error) next(error);
        else {
            res.render('a_practice_tests',{user: req.user[0],data0:results})
        }
    });
} catch (err) {
    next(err);
}
});
router.get('/newtests',isLoggedIn,isAdmin, (req, res, next) => {
  
    try {
        con.query(`select q.question_id,question,question_url ,SUBSTRING(question,1,40) as initialText, topic, sub_topic, month, year, standard, difficulty,r.course 
        from user1, questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where user1.user_id= ? and q.deleted=0 and q.approval='approved';
        
        select distinct test.course from test where test.course is not null AND test.course <> ''`, [req.user[0].user_id], function (error, results) {
          if (error) next(error); 
          else
          {
         
            let class_name=req.query.class_name;
            let student_id=req.query.student_id;
            let class_id=req.query.class_id;
            let user_name=req.query.student_name;
            
            res.render('a_practice_tests_create_tests',{class_name,data0:results[0],user:req.user[0],student_id,class_id,user_name:user_name,data1:results[1]});
          }
          });
      } catch (err) {
        next(err);}
  });
  router.post('/newtests1',isLoggedIn,isAdmin, (req, res, next) => {
  
    try {
        con.query("INSERT INTO test (test_name, teacher_id, due_date,course,topic,sub_topic,created_date) values (?,?,?,?,?,?,now());", [req.body.assignmentName,req.user[0].user_id,req.body.dueDate,req.body.coursevalue,req.body.topic,req.body.sub_topic,], function (error, results) {
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
                
                  res.redirect('/admin/tests')
              
              }
            });
          }
        });
      } catch (err) {
        next(err);
      }
    // console.log(req)
  });
  router.post("/getTopics",isLoggedIn,isAdmin, (req, res, next) => {
    var course = req.body.course;
    var query = "SELECT DISTINCT topic FROM reference_tags WHERE course = ? AND topic IS NOT NULL AND topic <> ''";
  
    con.query(query, [course], function(err, rows, fields) {
      if (err) {
        console.log(err);
        res.sendStatus(500);
        return;
      }
  
      var topics = [];
      for (var i = 0; i < rows.length; i++) {
        topics.push(rows[i].topic);
      }
    //   console.log(topics)
      res.send(topics);
    });
    
  });
  router.post('/getSubtopics',isLoggedIn,isAdmin, function(req, res) {
    var courseValue = req.body.course;
    var topicValue = req.body.topic;
    var query = "SELECT sub_topic FROM reference_tags WHERE sub_topic IS NOT NULL AND sub_topic <> '' AND course=? AND topic=? GROUP BY sub_topic";
    con.query(query, [courseValue, topicValue], function(err, result) {
      if (err) throw err;
      res.send(result);
    });
  });
  router.post("/practicepreview",isLoggedIn,isAdmin,(req,res, next)=>{
  
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
  
  router.post("/practicetests/delete",isLoggedIn,isAdmin,(req,res, next)=>{
  
    try {
     
     
      con.query("update test set deleted=1 where test_id=? ;", [req.body.test_id], function (error, results) {
        if (error) next(error); 
       
        res.redirect('/admin/tests');
      
      });
    } catch (err) {
      next(err);
    }
    
  
  })
  router.get('/view_practice_questions/:test_name/:test_id', isLoggedIn, isTeacher, (req, res, next) => {
    try {
      con.query(`select q.question,q.question_url,rt.topic,rt.course,rt.sub_topic,t.test_name,t.test_id,tq.test_questions_id,rt.month,rt.year,rt.standard,rt.difficulty from questions q
      join reference_tags rt on q.reference_tags_id=rt.reference_tags_id and q.approval='approved' and q.deleted=0
      join test_questions tq on tq.question_id=q.question_id and tq.deleted=0
      join test t on t.test_id = tq.test_id where t.test_id=? and t.deleted=0;
      select question_id,question,SUBSTRING(question,1,40) as initialText,q.question_url, topic, sub_topic, month, year, standard, difficulty,r.course from user1, questions q join reference_tags r on r.reference_tags_id=q.reference_tags_id where user1.user_id= ? and q.approval='approved' and q.deleted=0;`, [req.params.test_id,req.user[0].user_id], function (error, results) {
          if (error) next(error); 
          else
          {
            
                  res.render('a_view_practice_questions',{data0:results[0],user:req.user[0].user_id,test_name:req.params.test_name,test_id:req.params.test_id,data1:results[1]});
          }
          }); 
    } catch (err) {
      next(err);
    }
    console.log(req)
  });
  router.post('/assignpracticequestions', isLoggedIn, isAdmin, (req, res, next) => {
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
            res.json({ nextRoute: '/admin/view_practice_questions/'+req.body.test_name+'/'+req.body.test_id});
          }
        });
    } catch (err) {
      next(err);
    }
  });
  router.post('/practicepreviewquestions', isLoggedIn, isAdmin, (req, res) => {

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
   router.post("/practicetestsquestions/delete",isLoggedIn,isAdmin,(req,res, next)=>{
    try {
      con.query(` UPDATE test_questions tq
      set deleted=1 where tq.test_questions_id=?;`, [req.body.test_questions_id], function (error, results) {
        if (error) next(error); 
        else
        {
          res.redirect('/admin/view_practice_questions/'+req.body.test_name+'/'+req.body.test_id);
        }
        }); 
    } catch (err) {
      next(err);
    }
    // console.log(req)
  })
  
module.exports = router