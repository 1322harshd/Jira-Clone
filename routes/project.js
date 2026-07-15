import express from 'express';
import 'dotenv/config';
import prisma from '../services/dbclient.js';
import { authenticate } from '../middleware/authenticateToken.js';

const router = express.Router();

//protecting dashboard route
router.use(authenticate);

router.get('/member-search', authenticate,  async (req,res) => {
    try{

        const {q} = req.query;

        if(!q){
            return res.json([]);
        }

        const currentUserId = req.userId; 
        console.log(`this is current user from member-search ${currentUserId}`);

        const results = await prisma.user.findMany({
            where:{
                name: {
                    contains: String(q),
                    mode: 'insensitive',
                },
                //excluding current user
                 ...(currentUserId && {
                    id: {
                        not: currentUserId
                    }
                })

            },
            take:10,

            select: {
                name: true,
                image:true,
                id:true,
            }
        });

        res.json(results)
    }
    catch(error){
        console.error('Search error:', error);
        res.status(500).json({error: 'Interval server error' });
    }

});

router.post('/create-project',authenticate, async (req,res) => {
    const {name, description, members = []} = req.body;
    const ownerId = req.userId;


    try{


        const project = await prisma.project.create({
         data: {
            name,
            description,
            ownerId,
            members: {
                    create: [
                        {
                            userId: ownerId,
                            role: "OWNER",
                        },
                        ...members.map((userId) => ({
                            userId,
                            role: "MEMBER",
                        })),
                    ],
                },
            },
        });

        res.status(200).json({message: "Project Created Successfully!"})

    }catch(error){
     console.log(error)
    }
});

export default router;