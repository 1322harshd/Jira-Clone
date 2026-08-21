import express from 'express';
import 'dotenv/config';
import prisma from '../services/dbclient.js';
import { authenticate } from '../middleware/authenticateToken.js';

const router = express.Router();

router.use(authenticate);

router.get('/search', async (req,res) => {
    try{
        const {q} = req.query;

        if(!q){
            return res.json({projects: [], tasks: []});
        }

        const [projects, tasks] = await Promise.all([
            prisma.project.findMany({
                where: {
                    name: {
                        contains: String(q),
                        mode: 'insensitive',
                    },
                    members: {
                        some: {
                            userId: req.userId,
                        },
                    },
                },
                take: 10,
                select: {
                    id: true,
                    name: true,
                },
            }),
            prisma.task.findMany({
                where: {
                    title: {
                        contains: String(q),
                        mode: 'insensitive',
                    },
                    project: {
                        members: {
                            some: {
                                userId: req.userId,
                            },
                        },
                    },
                },
                take: 10,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    projectId: true,
                },
            }),
        ]);

        res.json({projects, tasks});
    }catch(err){
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
});

export default router;
