const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const { VerifyToken } = require("./middleware/VerifyToken");

const app = express();
const port = parseInt(process.env.PORT) || 8080;

app.use(cors());
app.use(express.json());
app.use(VerifyToken);

const uri = process.env.ATLAS_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("Connection established w MongoDB");
});

const routes = require("./routes");
app.use("", routes);

app.listen(port, () => {
  console.log("server started on: " + port);
});