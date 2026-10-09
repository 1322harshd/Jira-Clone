import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../services/dbclient.js';
import { generateTokens } from '../utils/generateTokens.js';
import { authenticate ,authMiddleware} from '../middleware/authenticateToken.js';
import upload from '../services/imagefileupload.js';
import path from "path";
import jwt from 'jsonwebtoken';
import { uploadAvatar } from "../services/cloudinary.js";


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

        const token = jwt.sign({ userId: result.id }, process.env.JWT_SECRET, {
        expiresIn: '1d'
        });

        res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'

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
        path:'/api/refresh',
    });

        return res.status(200).json({
            user:{id:user.id, email:user.email, image:user.image, name: user.name,}
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

router.post('/displayimage', authMiddleware, upload.single('image'), async (req,res) => {
    try{
        let imagePath;

        if (req.file){
           imagePath = await uploadAvatar(req.file.buffer, req.userId);

            await prisma.user.update({
                where: { id: req.userId},
                data: {image: imagePath}
            });

        }

        else if(req.body.avatarOption){
            const safePresetName = path.basename(req.body.avatarOption);
            imagePath = `defaults/avatars/${safePresetName}`;

            await prisma.user.update({
                where: { id: req.userId},
                data: {image: imagePath}
            });

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
        console.log(error);
    }
});

router.post('/refresh',async (req,res) => {
    try{
        const refreshToken = req.cookies.refreshToken;

        if(!refreshToken){
            return res.status(401).json({message: 'No refresh token provided' });
        }

        jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET,async (err,decoded) => {
            if(err){
                console.log(err);
                return res.status(403).json({message: 'Invalid or expired refresh token'});
            }

            const storedToken = await prisma.refreshToken.findUnique({
                where: {userId: decoded.userId}
            });

            if(!storedToken){
                return res.status(403).json({message: 'Refresh token not found' });
            }

            const isValidRefreshToken = await bcrypt.compare(
    refreshToken,
    storedToken.token
);

            if (!isValidRefreshToken){
                return res.status(403).json({message: 'Invalid refresh token'});
            }

            const newAccessToken = jwt.sign(
                {
                    userId: decoded.userId,
                    email: decoded.email
                },
                process.env.JWT_SECRET,
                {expiresIn: '1h'}
            );

            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 1000
            });

            console.log("refresh logic implemented");
            
            return res.status(200).json({
                message: 'Access token refreshed'
                
            });
        }); 
   

    } catch (error) {
        console.error('Refresh error:', error);
        return res.status(500).json({ error: 'Internal server error'});
    }
});

export default router;