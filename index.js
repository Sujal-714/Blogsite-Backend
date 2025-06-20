import postRoute from "./routes/post.js";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import cors from "cors";
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
   ssl: {
    rejectUnauthorized: false,
  },
});
const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api/posts",postRoute(pool));
app.get("/",(req,res)=>{
    res.send("API Running...");
});

app.listen(PORT,()=>{
    console.log(`Server running on port:${PORT}`);   
});

export default pool;

