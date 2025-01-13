import express from "express";
import pool from "../app.js";

const router = express.Router();

// Display all books
router.get("/", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM books ORDER BY rating DESC, id ASC");
      res.render("index", { books: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  });

router.get("/search", async (req, res) => {
  const query = req.query.query; // Get the search query from the URL
  try {
    const result = await pool.query(
      "SELECT * FROM books WHERE LOWER(title) LIKE LOWER($1) OR LOWER(author) LIKE LOWER($1)",
      [`%${query}%`]
    );
    res.render("index", { books: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Edit Book Form
router.get("/books/:id/edit", async (req, res) => {
  const { id } = req.params; // Extract book ID from the URL
  try {
    // Fetch the book details from the database
    const result = await pool.query("SELECT * FROM books WHERE id = $1", [id]);
    const book = result.rows[0];

    if (!book) {
      // If the book is not found, return a 404 error
      return res.status(404).send("Book not found");
    }

    // Render an edit form and pass the book data to it
    res.render("edit", { book });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Update Book
router.post("/books/:id/edit", async (req, res) => {
  const { id } = req.params;
  const { title, author, notes, date_read, rating, periplus_link, amazon_kindle_link } = req.body;
  const cover_url = `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-M.jpg`;

  try {
    await pool.query(
      "UPDATE books SET title = $1, author = $2, cover_url = $3, notes = $4, date_read = $5, rating = $6, periplus_link = $7, amazon_kindle_link = $8 WHERE id = $9",
      [title, author, cover_url, notes, date_read, rating, periplus_link, amazon_kindle_link, id]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Add a new book
router.post("/books", async (req, res) => {
    const { title, author, notes, date_read, rating, periplus_link, amazon_kindle_link } = req.body;
    const cover_url = `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-M.jpg`;
  
    try {
      await pool.query(
        "INSERT INTO books (title, author, cover_url, notes, date_read, rating, periplus_link, amazon_kindle_link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [title, author, cover_url, notes, date_read, rating, periplus_link, amazon_kindle_link]
      );
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  });

// Delete a book
router.post("/books/:id/delete", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM books WHERE id = $1", [id]);
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  });

export default router;