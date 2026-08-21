import express from 'express';
import 'dotenv/config';
import prisma from '../services/dbclient.js';
import { authenticate } from '../middleware/authenticateToken.js';
import bcrypt from 'bcrypt';

const router = express.Router();

router.use(authenticate);

router.put('/updatedetails', async (req,res) => {
    try{
        const {name,email} = req.body;

        const updates = {}

        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;

        const user = await prisma.user.update({
            where: {
                id: req.userId,
            },
            data: updates,
        });

        console.log(user);

        res.status(200).json({message: 'User Data Updated'});
    }catch(err){
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
});

router.put('/changepassword', async (req,res) => {
    try{
        const {newPassword,oldPassword} = req.body;

        if(!newPassword){
            return res.status(400).json({message: "Require New Password"});
        }
        if(!oldPassword){
            return res.status(400).json({message: "Require Old Password"});
        }

        const user = await prisma.user.findUnique({
            where:{
                id: req.userId,
            },
        });

        if(!user){
            return res.status(404).json({message: 'User not found'});
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if(!isMatch){
            return res.status(401).json({message: 'Old password is incorrect'});
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword,saltRounds);

        await prisma.user.update({
            where:{
                id: req.userId,
            },
            data:{
                password: hashedPassword,
            },
        });

        await prisma.refreshToken.deleteMany({
            where: { userId: req.userId },
        });

        res.status(200).json({message:'Password changed successfully'});
    }catch(err){
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
})

export default router;
