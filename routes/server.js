import express from "express";
import cors from "cors";
import archiveRouter from "./archive.js";
import authRouter from "./auth.js";

const app = express();
const PORT = 3001;


app.use(cors());
app.use(express.json());

app.use("/archive",archiveRouter);
app.use("/auth",authRouter);

app.get("/",(req,res) => {
 res.send("server running");
});

app.listen(PORT, "0.0.0.0", () => {
 console.log(`server running on hhttp://localhost:${PORT}`);
});