require('dotenv').config()
var bodyParser = require('body-parser');
const express = require('express')
const app = express()
var cors = require('cors')
const ibmdb = require('ibm_db');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
const port = 3000

let connStr = "DATABASE=" + process.env.DB_DATABASE + ";HOSTNAME=" + process.env.DB_HOSTNAME + ";PORT=" + process.env.DB_PORT + ";PROTOCOL=TCPIP;UID=" + process.env.DB_UID + ";PWD=" + process.env.DB_PWD + ";";

app.get('/', function (request, response) {
  return response.json({ success: 1, message: 'api works!' })
});

app.post('/getUser', function (request, response) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    var query = "SELECT * FROM " + process.env.DB_SCHEMA + ".USERS WHERE LOWER(USER_NAME) = LOWER('" + request.body.username + "') AND PASSWORD = '" + request.body.password + "';";
    conn.query(query, function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      conn.close(function () {
        return response.json({ success: 1, message: 'Data Received!', data: data });
      });
    });
  });
})

app.post('/addQuestion', function (request, response) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    var queryToGetNewId = "SELECT CONCAT('Q' , (CAST(MAX(SUBSTRING(QUESTION_ID, 2, LENGTH(QUESTION_ID)-1))  AS NUMERIC) + 1)) AS NEWID FROM " + process.env.DB_SCHEMA + ".QUESTIONS;"
    conn.query(queryToGetNewId, function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }    
      var queryToInserData = "INSERT INTO " + process.env.DB_SCHEMA + ".QUESTIONS VALUES('" + data[0]["NEWID"] + "','" + request.body.subjectid + "','" + request.body.question + "','" + request.body.option1 + "','" + request.body.option2 + "','" + request.body.option3 + "','" + request.body.option4 + "','" + request.body.correctAnswer + "','" + request.body.option1Desc + "','" + request.body.option2Desc + "','" + request.body.option3Desc + "','" + request.body.option4Desc + "','" + request.body.userId + "');";
      console.log(queryToInserData);
      conn.query(queryToInserData, function (err, data1) {
        if (err) {
          return response.json({ success: -2, message: err });
        }
        conn.close(function () {
          return response.json({ success: 1, message: 'Data Added!' });
        });
      });
    });
  });
})

app.post('/getQuestions', function (request, response, next) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    conn.query("SELECT * FROM " + process.env.DB_SCHEMA + ".QUESTIONS WHERE  SUBJECT_ID = '" + request.body.subjectid + "' ORDER BY RAND() LIMIT 10;", function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      conn.close(function () {
        return response.json({ success: 1, message: 'Data Received!', data: data });
      });
    });
  });
})

app.post('/submitTest', function (request, response, next) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    var userId = request.body.userId;
    var subjectId = request.body.subjectId;
    var attempt = 0;
    var queryToFetchAttempt = "SELECT CASE  WHEN (SELECT MAX(ATTEMPT_NUMBER)  AS ATTEMPT  FROM  " + process.env.DB_SCHEMA + ".USER_ATTEMPTS WHERE USER_ID = '" + request.body.userId + "' AND SUBJECT_ID = '" + request.body.subjectId + "')  IS NOT NULL THEN (SELECT MAX(ATTEMPT_NUMBER)  AS ATTEMPT  FROM  " + process.env.DB_SCHEMA + ".USER_ATTEMPTS WHERE USER_ID = '" + request.body.userId + "' AND SUBJECT_ID = '" + request.body.subjectId + "') + 1 ELSE 1 END AS ATTEMPT FROM SYSIBM.SYSDUMMY1;"
    conn.query(queryToFetchAttempt, function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      attempt = data[0].ATTEMPT;
      for (var i =0 ; i<request.body.testDetails.length; i++) {
        var queryToInsertUserAttempt = "INSERT INTO " + process.env.DB_SCHEMA + ".USER_ATTEMPTS VALUES('" + userId + "','" + subjectId + "','" + request.body.testDetails[i].questionId + "','" + attempt + "','" + request.body.testDetails[i].score + "');";
        conn.query(queryToInsertUserAttempt, function (err, data1) {
          if (err) {
            return response.json({ success: -2, message: err });
          }
          
        });
      }
      conn.close(function () {
        return response.json({ success: 1, message: 'Data Inserted!' });
      });
    });
  });
})

app.post('/getQuery', function (request, response, next) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    conn.query("SELECT * FROM " + process.env.DB_SCHEMA + ".STUDENT_QUERIES WHERE  STUDENT_QUERY_ID = '" + request.body.studentQueryId + "';", function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      conn.close(function () {
        return response.json({ success: 1, message: 'Data Received!', data: data });
      });
    });
  });
})

app.post('/postQuery', function (request, response, next) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    var queryId = 0;
    var queryToQueryId = "SELECT CASE  WHEN  (SELECT CONCAT('SQ' , (CAST(MAX(SUBSTRING(STUDENT_QUERY_ID, 3, LENGTH(STUDENT_QUERY_ID)-1))  AS NUMERIC) + 1)) AS NEWID FROM STUDENT_QUERIES)  IS NOT NULL THEN (SELECT CONCAT('SQ' , (CAST(MAX(SUBSTRING(STUDENT_QUERY_ID, 3, LENGTH(STUDENT_QUERY_ID)-1))  AS NUMERIC) + 1)) AS NEWID FROM " + process.env.DB_SCHEMA + ".STUDENT_QUERIES) ELSE 'SQ1' END AS QUERYID FROM SYSIBM.SYSDUMMY1;"
    conn.query(queryToQueryId, function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      queryId = data[0]["QUERYID"];
      var queryToInsertToStudQuery = "INSERT INTO " + process.env.DB_SCHEMA + ".STUDENT_QUERIES VALUES('" + queryId + "','" + request.body.studentId + "','" + request.body.questionId + "','" + request.body.studentQuestion + "','" + request.body.teacherId + "','');"
      conn.query(queryToInsertToStudQuery, function (err, data1) {
        if (err) {
          return response.json({ success: -2, message: err });
        }
        conn.close(function () {
          return response.json({ success: 1, message: 'Data Inserted!', data: data1 });
        });
      });
    });
  });
})

app.post('/updateQuery', function (request, response, next) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    var queryId = 0;
    var queryToUpdateQuery = "UPDATE " + process.env.DB_SCHEMA + ".STUDENT_QUERIES SET ANSWER = '" + request.body.answer + "' WHERE STUDENT_QUERY_ID = '" + request.body.studentQueryId + "'  ;"
    conn.query(queryToUpdateQuery, function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      conn.close(function () {
        return response.json({ success: 1, message: 'Data Inserted!' });
      });
    });
  });
})

app.post('/getQueryByTeacher', function (request, response, next) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    conn.query("SELECT * FROM " + process.env.DB_SCHEMA + ".STUDENT_QUERIES WHERE  TEACHER_ID = '" + request.body.teacherId + "';", function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      conn.close(function () {
        return response.json({ success: 1, message: 'Data Received!', data: data });
      });
    });
  });
})


app.post('/getQueryByStudent', function (request, response, next) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    conn.query("SELECT * FROM " + process.env.DB_SCHEMA + ".STUDENT_QUERIES WHERE  STUDENT_ID = '" + request.body.studentId + "';", function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      conn.close(function () {
        return response.json({ success: 1, message: 'Data Received!', data: data });
      });
    });
  });
})

app.post('/getAllSubject', function (request, response, next) {
  ibmdb.open(connStr, function (err, conn) {
    if (err) {
      return response.json({ success: -1, message: err });
    }
    conn.query("SELECT * FROM " + process.env.DB_SCHEMA + ".SUBJECTS;", function (err, data) {
      if (err) {
        return response.json({ success: -1, message: err });
      }
      conn.close(function () {
        return response.json({ success: 1, message: 'Data Received!', data: data });
      });
    });
  });
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))