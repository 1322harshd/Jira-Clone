import express from 'express';
import authentication from "./routes/authentication.js";
import dashboard from "./routes/dashboard.js";
import project from "./routes/project.js";
import tasks from "./routes/tasks.js";
import comment from "./routes/comment.js";
import settings from "./routes/settings.js";
import search from "./routes/search.js";
import cors from "cors";
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();


app.use(cors({
    origin: process.env.ORIGIN,
    credentials:true,
}));


//for parsing json
app.use(express.json());

app.use(cookieParser());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));


app.use('/',authentication);
app.use('/',dashboard);
app.use('/',project);
app.use('/',tasks);
app.use('/',comment);
app.use('/',settings);
app.use('/',search);

export default app;