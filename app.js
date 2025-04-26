import express from "express";
import bodyParser from "body-parser";
import pkg from "pg";
import path from "path";
import session from "express-session";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import bookRoutes from "./routes/books.js";

dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 3000; 

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(path.resolve(), "public")));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SECRET_KEY || "default-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// PostgreSQL Configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
ssl: {
rejectUnauthorized: false
}
});

// Simulated User (Can be replaced with DB authentication later)
const user = {
  username: process.env.ADMIN_USERNAME,
  password: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10),
};

// Middleware to Check Authentication
const storeReturnUrl = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect("/login");
  }
  next();
};

app.get("/search", async (req, res) => {
  const searchQuery = req.query.query || ""; // Ensure searchQuery is defined
  try {
    const result = await pool.query(
      "SELECT * FROM books WHERE title ILIKE $1 OR author ILIKE $1",
      ["%" + searchQuery + "%"]
    );
    res.render("index", { books: result.rows, user: req.session.user, searchQuery });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error performing search.");
  }
});

// Login Page
app.get("/login", (req, res) => {
  res.render("login", { error: null }); // Ensure login.ejs exists
});

// Handle Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === user.username && bcrypt.compareSync(password, user.password)) {
    req.session.user = username;

    // Redirect to previous page (if stored)
    const returnTo = req.session.returnTo || "/books";
    delete req.session.returnTo;
    return res.redirect(returnTo);
  }

  res.render("login", { error: "Invalid username or password" });
});


app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/books");
  });
});

app.get("/books", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books ORDER BY rating DESC, date_read DESC");
    res.render("index", { books: result.rows, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving books.");
  }
});


app.post("/recommend", async (req, res) => {
  const { name, book_title, reason } = req.body;
  
  try {
      await pool.query(
          "INSERT INTO recommendations (name, book_title, reason) VALUES ($1, $2, $3)",
          [name, book_title, reason]
      );
      res.redirect("/thanks"); 
  } catch (err) {
      console.error(err);
      res.status(500).send("Error submitting recommendation.");
  }
});

app.get("/thanks", (req, res) => {
  res.render("thanks");
});

app.get("/admin/recommendations", async (req, res) => {
  if (!req.session.user) {
      return res.redirect("/login");
  }

  try {
      const result = await pool.query("SELECT * FROM recommendations ORDER BY submitted_at DESC");
      res.render("admin_recommendations", { recommendations: result.rows });
  } catch (err) {
      console.error(err);
      res.status(500).send("Error retrieving recommendations.");
  }
});

app.post("/books/add", async (req, res) => {
  const { title, author, notes, date_read, rating, periplus_link, amazon_kindle_link } = req.body;
  const cover_url = `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`;

  try {
      await pool.query(
        "INSERT INTO books (title, author, cover_url, notes, date_read, rating, periplus_link, amazon_kindle_link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [title, author, cover_url, notes, date_read, rating, periplus_link, amazon_kindle_link]
      );
      res.redirect("/books"); // Redirect back to book list
  } catch (err) {
      console.error(err);
      res.status(500).send("Error adding book.");
  }
});

app.get("/books/:id/edit", async (req, res) => {
  const { id } = req.params;

  try {
      const result = await pool.query("SELECT * FROM books WHERE id = $1", [id]);

      if (result.rows.length === 0) {
          return res.status(404).send("Book not found");
      }

      res.render("edit", { book: result.rows[0] }); // Render the edit form
  } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching book for editing.");
  }
});

app.post("/books/:id/update", async (req, res) => {
  const { id } = req.params;
  const { title, author, notes, date_read, rating, periplus_link, amazon_kindle_link } = req.body;

  // Auto-generate cover URL using Open Library API
  const cover_url = `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`;

  try {
      await pool.query(
          "UPDATE books SET title = $1, author = $2, cover_url = $3, notes = $4, date_read = $5, rating = $6, periplus_link = $7, amazon_kindle_link = $8 WHERE id = $9",
          [title, author, cover_url, notes, date_read, rating, periplus_link, amazon_kindle_link, id]
      );

      res.redirect("/books"); // Redirect back to book list after updating
  } catch (err) {
      console.error(err);
      res.status(500).send("Error updating book.");
  }
});




// Protected CRUD Routes
app.use("/books/add", storeReturnUrl);
app.use("/books/:id/edit", storeReturnUrl);
app.use("/books/:id/delete", storeReturnUrl);

app.use("/books", bookRoutes); // Handles book actions

// Home Route
app.get("/", (req, res) => {
  res.redirect("/books");
});

// Start Server
app.listen(port,'0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

export default pool;
