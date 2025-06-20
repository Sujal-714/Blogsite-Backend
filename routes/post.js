import express from "express";
import multer from "multer";
import path from "path";

function postRoute(pool){
  const storage = multer.diskStorage({
  destination: "public/uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g., 1718662163.webp
  },
});
const upload = multer({ storage });

    const router = express.Router();

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      "INSERT INTO posts(title, description, image) VALUES ($1, $2, $3) RETURNING *",
      [title, description, image]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/posts error:", err);
    res.status(500).json({ message: "Failed to create post", error: err.message });
  }
});


router.get("/",async(req,res)=>{
    try{
const result = await pool.query(
"SELECT *  FROM posts ORDER BY created_at DESC"
);
res.json(result.rows);
}catch(err){
console.error("GET /api/posts error:", err);
res.status(500).json({message:"Failed to fetch post",error: err.message});
}   
});

  router.get("/:id", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error(`GET /api/posts/${req.params.id} error:`, error);
      res.status(500).json({ message: "Failed to fetch post", error: error.message });
    }
  });

  router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const postId = req.params.id;

    // Fetch existing post
    const existingPostRes = await pool.query("SELECT * FROM posts WHERE id = $1", [postId]);
    if (existingPostRes.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    const existingPost = existingPostRes.rows[0];

    // Use new title/description if sent, else keep old ones
    const title = req.body.title || existingPost.title;
    const description = req.body.description || existingPost.description;

    // Use uploaded file if available, else keep existing image
    const image = req.file ? `/uploads/${req.file.filename}` : existingPost.image;

    // Update post with new values
    const result = await pool.query(
      "UPDATE posts SET title = $1, description = $2, image = $3 WHERE id = $4 RETURNING *",
      [title, description, image, postId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`PUT /api/posts/${req.params.id} error:`, error);
    res.status(500).json({ message: "Failed to update post", error: error.message });
  }
});

    router.delete("/:id", async (req, res) => {
    try {
      const result = await pool.query("DELETE FROM posts WHERE id = $1 RETURNING *", [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json({ message: "Post deleted" });
    } catch (error) {
      console.error(`DELETE /api/posts/${req.params.id} error:`, error);
      res.status(500).json({ message: "Failed to delete post", error: error.message });
    }
  });

    
  return router;
}


export default  postRoute;