import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import archiveRouter from "./archive.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname,"..");
const distPath = path.join(rootDir, "dist");

app.use(cors({
 origin: true,
 credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use("/auth",authRouter);
app.use("/archive",archiveRouter);
app.use("/api", usersRouter);

app.use(express.static(distPath));

app.use((req,res) => {
 res.sendFile(path.join(distPath, "index.html"));
});



app.listen(PORT, "0.0.0.0", () => {
 console.log(`server running on port ${PORT}`);
});
