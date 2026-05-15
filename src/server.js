const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send(`
    <h1>K12NET LOGIN TEST 🚀</h1>
    <a href="/auth/k12net/login">K12NET ile Giriş Yap</a>
  `);
});

app.get("/auth/k12net/login", (req, res) => {
  res.redirect("https://okul.k12net.com/");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server çalışıyor:", PORT);
});
