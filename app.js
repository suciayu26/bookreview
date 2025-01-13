import express from "express";
import bodyParser from "body-parser";
import pkg from "pg";
import path from "path";
import bookRoutes from "./routes/books.js";

const { Pool } = pkg;
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(path.resolve(), "public")));
app.set("view engine", "ejs");

// PostgreSQL Configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "book_db",
  password: "123456",
  port: 5432,
});

// Routes
app.use("/", bookRoutes);

// Start Server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

export default pool;
