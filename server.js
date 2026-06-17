import express from 'express';
import authentication from "./routes/authentication.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT;

app.use(cors({
    origin: process.env.ORIGIN,
    credentials:true,
}));


//for parsing json
app.use(express.json());

app.use('/',authentication);

app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
});
