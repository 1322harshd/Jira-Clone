import express from 'express';
import authentication from "./routes/authentication.js";
import dashboard from "./routes/dashboard.js";
import cors from "cors";
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT;

app.use(cors({
    origin: process.env.ORIGIN,
    credentials:true,
}));


//for parsing json
app.use(express.json());

app.use(cookieParser());

app.use('/',authentication);
app.use('/',dashboard);


app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
});
