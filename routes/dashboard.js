import express from 'express';
import 'dotenv/config';
import prisma from '../services/dbclient.js';
import { authenticate } from '../middleware/authenticateToken.js';

const router = express.Router();

//protecting dashboard route
router.use(authenticate);

router.get('/dashboard' , async (req,res) =>{
    try{
        const userId = req.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });

        if(!user){
            return res.status(404).json({message: "User not found"});
        }
        
        return res.status(200).json(user);
    }
    catch(error){
        return res.status(500).json({ message: "Server error", error: error.message});
    }

});

export default router;