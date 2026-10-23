/*
Task:
 - Create a webpage in Node which returns the "students" feld of the "133_class.json" file as a comma-separated list.
*/

var http = require('http');
var server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Hello World!")
});
server.listen(8080);
console.log("Hello, console");
