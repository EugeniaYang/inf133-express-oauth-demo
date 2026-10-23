/*
Task:
 - Create a webpage in Node which returns the "students" feld of the "133_class.json" file as a comma-separated list.
*/

var http = require('http');
var fs = require('fs');
var server = http.createServer((req, res) => {
fs.readFile(__dirname + '/133_class.json', (err,data) => {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    var students = JSON.parse(data).students
    res.end(students.join(', '));
  });
});
server.listen(8080);
