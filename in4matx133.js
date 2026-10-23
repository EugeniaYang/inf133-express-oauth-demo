// Slide 92 refers to this helper; here is a runnable implementation.
const { students } = require('./students.json');
const records = students.map((name, index) => ({ id: String(index + 1), name }));

// FEATURE: /students/list returns all fictional records from this helper.
function enrolledStudents() {
  return records;
}

// FEATURE: /students/:id returns one record, or a 404 when this returns null.
function isEnrolled(id) {
  return records.find((student) => student.id === id) || null;
}

module.exports = { enrolledStudents, isEnrolled };
