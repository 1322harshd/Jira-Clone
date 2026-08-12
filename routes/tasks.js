import express from 'express';
import 'dotenv/config';
import prisma from '../services/dbclient.js';
import { createActivity } from '../utils/activity.js';
import { authenticate } from '../middleware/authenticateToken.js';


const router = express.Router();

router.use(authenticate);

router.post('/createtask/:projectId', async (req,res) => {
    try{
        const {projectId}= req.params;

        //finding project from project id so that false project cannot be created
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                members: {
                    some: {
                        userId: req.userId,
                    },
                },
            },
        });

        if(!project){
            return res.status(404).json({message: 'Project not found'});
        }

       const task = await prisma.task.create({
            data: {
                title: req.body.title,
                description: req.body.description,
                priority: req.body.priority,
                dueDate: new Date(req.body.dueDate),
                projectId:projectId,
                status: req.body.status,
            },
        });

        createActivity({
            type:'TASK_CREATED',
            message: 'Task Created',
            userId: req.userId,
            projectId: projectId,
            taskId: task.id,
        })

        res.status(201).json({message:'Task Created Successfully'});
    }catch(err){
        res.status(500).json({message: 'Server Error'});
        console.log(err);
    }
})

router.put('/updatetask/:taskId', async (req,res) => {
    const {taskId} = req.params;
    
    try{

        //check if task exist
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                project: {
                    members: {
                        some: {
                            userId: req.userId,
                        },
                    },
                },
            },
        });

        if(!task){
            return res.status(404).json({
                message: 'Task Not Found'
            });
        }

        const data = {};

        if (req.body.title !== undefined) data.title = req.body.title;
        if (req.body.description !== undefined) data.description = req.body.description;
        if(req.body.priority !== undefined) data.priority = req.body.priority;
        if (req.body.status !== undefined) data.status = req.body.status;

        if(req.body.dueDate !== undefined){
            data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
        }

        const updatedTask = await prisma.task.update({
            where: {
                id :taskId,
            },
            data,
        });

        createActivity({
            type:'UPDATE_TASK',
            message: 'Task Updated Successfully',
            taskId: taskId,
            projectId: updatedTask.projectId,
            userId: req.userId,
         });
        res.status(201).json({message: "Task Updated Successfully"});



    }catch(err){
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
});

router.put('/updatestatus/:taskId', async (req,res) => {
        const {taskId} = req.params;

        try{
        const task = await prisma.task.findFirst({
            where:{
                taskId: taskId,
                project:{
                    members:{
                        userId: req.userId,
                    },
                },
            },
        });

        if(!task){
            res.status(404).json({message: 'Task Not Found'});
        };

        const updatedStatus = await prisma.task.update({
            where:{
                taskId: taskId,
            },
            data:{
                status: req.body.status,
            },
        });

        createActivity({
            type: 'UPDATE_TASK_STATUS',
            message: 'Task Status Updated Successfully',
            taskId: taskId,
            projectId: updatedStatus.projectId,
            userId: req.userid,
        });

        res.status(201).json({message: 'Task Status Updated'});
    }
    catch(err){
        res.status(500).json({message: 'Server Error'});
        console.log(err);
    }


})

export default router;