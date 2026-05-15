const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send(`
    <h1>K12NET Login API Çalışıyor 🚀</h1>
    <a href="/login">K12NET Login</a>
  `);
});

app.get("/login", (req, res) => {
  res.redirect("https://api.k12net.com/Login.aspx");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
