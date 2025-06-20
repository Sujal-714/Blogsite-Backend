import express from "express";
import multer from "multer";
import cloudinary from '../cloudinary.js';
import streamifier from "streamifier";

function postRoute(pool) {
  const upload = multer({ storage: multer.memoryStorage() }); // store file in memory

  const router = express.Router();

  router.post("/", upload.single("image"), async (req, res) => {
    try {
      const { title, description } = req.body;
      let image = null;

      if (req.file) {
        // Upload buffer to Cloudinary
        const result = await cloudinary.uploader.upload_stream(
          { folder:"blogsite-posts"}, // optional folder
          async (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              return res.status(500).json({ message: "Image upload failed" });
            }

            // Save Cloudinary URL in DB
            const dbResult = await pool.query(
              "INSERT INTO posts(title, description, image) VALUES ($1, $2, $3) RETURNING *",
              [title, description, result.secure_url]
            );
            res.json(dbResult.rows[0]);
          }
        );

        // pipe file buffer to cloudinary upload stream
        streamifier.createReadStream(req.file.buffer).pipe(result);
      } else {
        // No image uploaded - insert without image
        const dbResult = await pool.query(
          "INSERT INTO posts(title, description, image) VALUES ($1, $2, $3) RETURNING *",
          [title, description, null]
        );
        res.json(dbResult.rows[0]);
      }
    } catch (err) {
      console.error("POST /api/posts error:", err);
      res.status(500).json({ message: "Failed to create post", error: err.message });
    }
  });

  // Keep other routes same, but update image handling similarly in PUT route

  router.get("/", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM posts ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/posts error:", err);
      res.status(500).json({ message: "Failed to fetch posts", error: err.message });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ message: "Post not found" });
      res.json(result.rows[0]);
    } catch (error) {
      console.error(`GET /api/posts/${req.params.id} error:`, error);
      res.status(500).json({ message: "Failed to fetch post", error: error.message });
    }
  });

  router.put("/:id", upload.single("image"), async (req, res) => {
    try {
      const postId = req.params.id;
      const existingPostRes = await pool.query("SELECT * FROM posts WHERE id = $1", [postId]);
      if (existingPostRes.rows.length === 0) return res.status(404).json({ message: "Post not found" });
      const existingPost = existingPostRes.rows[0];

      const title = req.body.title || existingPost.title;
      const description = req.body.description || existingPost.description;

      if (req.file) {
        // upload new image to cloudinary
        const uploadPromise = () =>
          new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "your-folder-name" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
              }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });

        const newImageUrl = await uploadPromise();

        const result = await pool.query(
          "UPDATE posts SET title=$1, description=$2, image=$3 WHERE id=$4 RETURNING *",
          [title, description, newImageUrl, postId]
        );
        return res.json(result.rows[0]);
      } else {
        // no new image uploaded - keep existing image
        const result = await pool.query(
          "UPDATE posts SET title=$1, description=$2 WHERE id=$3 RETURNING *",
          [title, description, postId]
        );
        return res.json(result.rows[0]);
      }
    } catch (error) {
      console.error(`PUT /api/posts/${req.params.id} error:`, error);
      res.status(500).json({ message: "Failed to update post", error: error.message });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const result = await pool.query("DELETE FROM posts WHERE id = $1 RETURNING *", [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ message: "Post not found" });
      res.json({ message: "Post deleted" });
    } catch (error) {
      console.error(`DELETE /api/posts/${req.params.id} error:`, error);
      res.status(500).json({ message: "Failed to delete post", error: error.message });
    }
  });

  return router;
}

export default postRoute;
