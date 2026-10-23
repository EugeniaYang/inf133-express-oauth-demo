const express = require('express');
const { students } = require('../students.json');
const in4matx133 = require('../in4matx133');
const router = express.Router();

// FEATURE: "HTML page from a Pug template" → GET /students.
// Express supplies title/students; views/students.pug loops over the names.
router.get('/', (req, res) => {
  res.render('students', { title: 'INF 133 Students', students });
});

// FEATURE: "/students/list — all student records" (slide 92).
// This fixed route must be before /:id so 'list' is not mistaken for a student ID.
router.get('/list', (req, res) => {
  res.status(200).send(in4matx133.enrolledStudents());
});

// FEATURE: clicking a student name, /students/2, or the missing-ID example.
// Look up req.params.id; return one record (200) or stop with Not found (404).
router.get('/:id', (req, res) => {
  const user = in4matx133.isEnrolled(req.params.id);
  if (user === null) {
    console.log(`Student with id ${req.params.id} not found.`);
    // A missing student is 404; the slide uses 400.
    return res.status(404).send('Not found');
  }
  res.status(200).send(user);
});

module.exports = router;
