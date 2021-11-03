const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");

const app = express();
app.use(cookieParser());

app.use("/static", express.static(__dirname + "/jsdebug"));
app.get("/compromise", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  console.log("START COMPROMISING");
  fs.readFile("./compromise.html", "utf8", (err, data) => {
    if (err) {
      res.send("error");
      return;
    }
    res.send(data);
  });
});
app.get("/success", (req, res) => {
  console.log("SUCCESSFUL COMPROMISING");
});
app.get("/:cookie", (req, res) => {
  console.log("COOKIE", req.params["cookie"]);
  res.status(404).end();
});
app.get("/", (req, res) => {
  console.log("REQ");
  fs.readFile("./index.html", "utf8", (err, data) => {
    if (err) {
      res.send("error");
      return;
    }
    res.send(data);
  });
});

app.listen(8081, () => {
  console.log("server start");
});
