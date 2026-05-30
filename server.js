import express from 'express';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3002;

//for parsing json
app.use(express.json());

//signup route
app.post('/users', async (req, res) => {
    try{  
        const {name,email,password}=req.body;
        
        if(!password){
            return res.status(400).json({error:"Password is required"})
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password,saltRounds);

        const newUser ={
            name,
            email,
            password:hashedPassword
        }

        const result = await prisma.user.create({
            data: newUser 
            
        });

        console.log("User created Successfully!");
        res.status(201).json("User created successfully."); }
       
        catch(error){
            console.error(error);
            res.status(500).json({error: "Internal server error"});
        }

});

app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
});
