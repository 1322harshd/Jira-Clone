import express from 'express';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3002;

//get request
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
});