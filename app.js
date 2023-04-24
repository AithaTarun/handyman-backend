const express = require('express');

const app = express();
const cors = require('cors');

const mongoose = require('mongoose');

const connectionURL = process.env.MONGO_DB_URL

const databaseName = 'handyman-database';

mongoose.connect
(
  // connectionURL + "/" + databaseName,
  connectionURL,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const database = mongoose.connection;

database.on
(
  'open', () =>
  {
    console.log("Connected to database");
  }
);

database.on
(
  'error', (error) =>
  {
    console.log("Error while connecting to database : ", error);
  }
);

app.use
(
  express.json()
);

app.use
{
  express.urlencoded
  (
    {
      extended: true
    }
  )
}

try
{
  app.use(cors({
  origin: ['*', 'http://localhost', 'http://localhost:8100', 'http://localhost:4200', process.env.FRONT_END_URL],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
}
catch (e)
{
  console.log("Error occurred :", e)
}

// Routes
const userRoutes = require('./routes/user');
app.use("/api/user", userRoutes);

const storgeRoutes = require('./routes/storage');
app.use("/api/storage", storgeRoutes);

module.exports = app;
