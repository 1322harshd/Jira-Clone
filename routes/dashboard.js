import express from 'express';
import 'dotenv/config';
import prisma from '../services/dbclient.js';
import { authenticate } from '../middleware/authenticateToken.js';

const router = express.Router();

//protecting dashboard route
router.use(authenticate);

router.get('/dashboard', async (req,res) => {
    try{
    const user = await prisma.user.findUnique({
        where:{
            id: req.userId,
        },
        select:{
            id: true,
            name: true,
            email: true,
            image: true,
        },
    });

    if(!user){
        return res.status(404).json({message: 'User not found'});
    }

    const projects = await prisma.projectMember.findMany({
        where:{
            userId: req.userId,
        },
        include:{
            project: true,
        },
    });

    const tasks = await prisma.task.findMany({
        where:{
            assignedToId: req.userId,
        },
    });

    //initializing tasks object
    const groupedTasks = {
        TO_DO: [],
        IN_PROGRESS: [],
        DONE: [],
    };
    
    //sorting tasks object
    for (const task of tasks) {
        if(groupedTasks[task.status]){
            groupedTasks[task.status].push(task);
        }
    }

    const recentActivities = await prisma.activity.findMany({
        where:{
            project:{
                members:{
                    some:{
                        userId: req.userId,
                    },
                },
            },
        },
        include:{
            user:{
                select:{
                    id: true,
                    name: true,
                    image: true,
                },
            },
            project:{
                select:{
                    id: true,
                    name: true,
                },
            },
        },
        orderBy:{
            createdAt: 'desc',
        },
        take: 10,
    });

    res.status(200).json({
        user,
        projects,
        tasks: groupedTasks,
        recentActivities,
    });
    }
    catch(err){
        console.log(err);
        res.status(500).json({message:'Server Error'});
    }
});

router.get('/dashboard/tasks', async (req,res) => {
    try{
        const tasks = await prisma.task.findMany({
        where:{
            assignedToId: req.userId,
        },
    });

    //initializing tasks object
    const groupedTasks = {
        TO_DO: [],
        IN_PROGRESS: [],
        DONE: [],
    };
    
    //sorting tasks object
    for (const task of tasks) {
        groupedTasks[task.status].push(task);
    }

    res.status(200).json({tasks:groupedTasks});
    }
    catch(err){
        console.log(err);
        res.status(500).json({message:'Server Error'});
    }
    
});

router.get('/recentactivity', async (req,res) => {
    try{
        const activity = await prisma.activity.findMany({
            where: {
                project: {
                    members: {
                    some: {
                        userId: req.userId,
                    },
                    },
                },
            },
            include:{
                user:{
                    select:{
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                project:{
                    select:{
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy:{
                createdAt: 'desc',
            },
            take: 20,
            },
        );

        res.status(200).json({activity});
    }
    catch(err){
        console.log(err);
        res.status(500).json({message:'Server error'});
    }
});
export default router;
