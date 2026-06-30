import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../services/dbclient.js';
import { generateTokens } from '../utils/generateTokens.js';
import { authenticate } from '../middleware/authenticateToken.js';
import upload from '../services/imagefileupload.js';


import 'dotenv/config';

const router = express.Router();
//signup route
router.post('/users', async (req, res) => {
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

            if(error.code === "P2002"){
                return res.status(409).json({
                    message:"Email already exists",
                });
            }else{
            res.status(500).json({error: "Internal server error"});
        }
        }

});

router.post('/login', async (req,res) => {
    try{
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({message: 'Email and password are required'});
        }

        const user = await prisma.user.findUnique({
            where: {email:email}
        })

        if(!user){
            return res.status(401).json({message: 'Invalid email or password'});
        }

        const isPasswordValid = await bcrypt.compare(password,user.password);
        console.log(isPasswordValid);

        if(!isPasswordValid){
            return res.status(401).json({message: 'Invalid email or password'});
        }

    //calling function to generate tokens
    const {accessToken,refreshToken} = generateTokens(user.id,user.email);

    const saltRounds=10;
    const hashedToken = await bcrypt.hash(refreshToken,saltRounds);

    //saving refresh token to database
    await prisma.refreshToken.upsert({
        where: {userId : user.id},
        update: {
            token : hashedToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        create: {
            token: hashedToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
    });

    res.cookie('accessToken',accessToken,{
        httpOnly:true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
    });

    res.cookie('refreshToken',refreshToken,{
        httpOnly:true,
        secure:process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/refresh',
    });

        return res.status(200).json({
            message:"Login successful. ",
            user:{id:user.id, email:user.email}
        });

    } catch(error){
        console.error("Login error:",error);
        return res.status(500).json({error: "An internal server occurred"});

    }

});

router.post('/logout',authenticate, async (req,res) => {
    try{
        const userId = req.userId;

        await prisma.refreshToken.deleteMany({
          where: {userId}
        });

        res.clearCookie('accessToken',{
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:'lax',
        });

        res.clearCookie('refreshToken',{
            httpOnly: true,
            secure:process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/refresh',
        });

        return res.status(200).json({ message: 'Logged out successfully'});
    } catch (error) {
        console.error('Logout error:',error);
        return res.status(500).json({error: 'Internal server error'});
    }
});

router.post('/displayimage', upload.single('image'), (req,res) => {
    try{
        let imagePath;

        if (req.file){
            imagePath = `/uploads/${req.file.filename}`;
        }

        else if(req.body.avatarOption){
            const safePresetName = path.basename(req.body.avatarOption);
            imagePath = `defaults/avatarts/${safePresetName}`;
        }
        else{
            imagePath = `/defaults/default-avatar.png`;
        }

        res.status(200).json({
            success:true,
            message: req.file? 'Custom photo saved!' : 'Preset/Default avatar assigned',
            imageUrl:imagePath
        });
    }catch (error) {
        res.status(500).json({ success: false, message: error.message});
    }
});
export default router;