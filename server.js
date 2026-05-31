import express from 'express';

import authentication from "./routes/authentication.js";

const app = express();
const PORT = process.env.PORT || 3002;

//for parsing json
app.use(express.json());

app.use('/',authentication);

app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
});
