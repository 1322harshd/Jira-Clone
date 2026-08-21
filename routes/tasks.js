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
            message: `created task "${task.title}"`,
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
    const {
        title,
        description,
        priority,
        status,
        dueDate,
        assignedToId,
    } = req.body;

    const validStatuses = ['TO_DO', 'IN_PROGRESS', 'DONE'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    
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
        const changes = [];

        if(title !== undefined){
            if(typeof title !== 'string' || title.trim() === ''){
                return res.status(400).json({message: 'Title is required'});
            }

            data.title = title.trim();
            if(data.title !== task.title){
                changes.push(`renamed to "${data.title}"`);
            }
        }

        if(description !== undefined){
            data.description = description === null ? null : String(description);
            changes.push('description updated');
        }

        if(priority !== undefined){
            if(!validPriorities.includes(priority)){
                return res.status(400).json({message: 'Invalid task priority'});
            }

            data.priority = priority;
            if(data.priority !== task.priority){
                changes.push(`priority set to ${data.priority}`);
            }
        }

        if(status !== undefined){
            if(!validStatuses.includes(status)){
                return res.status(400).json({message: 'Invalid task status'});
            }

            data.status = status;
            if(data.status !== task.status){
                changes.push(`status set to ${data.status}`);
            }
        }

        if(dueDate !== undefined){
            if(!dueDate){
                data.dueDate = null;
                changes.push('due date removed');
            } else {
                const parsedDueDate = new Date(dueDate);

                if(Number.isNaN(parsedDueDate.getTime())){
                    return res.status(400).json({message: 'Invalid due date'});
                }

                data.dueDate = parsedDueDate;
                changes.push(`due date set to ${parsedDueDate.toDateString()}`);
            }
        }

        let assigneeName;

        if(assignedToId !== undefined){
            const normalizedAssignedToId = assignedToId === null
                ? null
                : String(assignedToId);

            if(normalizedAssignedToId !== null){
                const assignee = await prisma.projectMember.findFirst({
                    where:{
                        projectId: task.projectId,
                        userId: normalizedAssignedToId,
                    },
                    include: {
                        user: {
                            select: { name: true },
                        },
                    },
                });

                if(!assignee){
                    return res.status(400).json({
                        message: 'Assignee must be a member of this project',
                    });
                }

                assigneeName = assignee.user.name;
            }

            data.assignedToId = normalizedAssignedToId;
            changes.push(normalizedAssignedToId ? `assigned to ${assigneeName}` : 'unassigned');
        }

        if(Object.keys(data).length === 0){
            return res.status(400).json({
                message: 'No fields provided to update',
            });
        }

        const updatedTask = await prisma.task.update({
            where: {
                id :taskId,
            },
            data,
        });

        createActivity({
            type:'UPDATE_TASK',
            message: `updated task "${updatedTask.title}"${changes.length ? `: ${changes.join(', ')}` : ''}`,
            taskId: taskId,
            projectId: updatedTask.projectId,
            userId: req.userId,
         }).catch((err) => {
            console.log('Failed to create activity:', err);
         });

        return res.status(200).json({
            message: "Task Updated Successfully",
            task: updatedTask,
        });

    }catch(err){
        console.log(err);
        return res.status(500).json({message: 'Server Error'});
    }
});

router.patch('/updatestatus/:taskId', async (req,res) => {
        const {taskId} = req.params;
        try{
        console.log(`this is status ${req.body.status}`);
        const task = await prisma.task.findFirst({
            where:{
                id: taskId,
                project:{
                    members:{
                       some:{
                         userId: req.userId,
                       }
                    },
                },
            },
        });

        if(!task){
            return res.status(404).json({message: 'Task Not Found'});
        };

        const updatedStatus = await prisma.task.update({
            where:{
                id: taskId,
            },
            data:{
                status: req.body.status,
            },
        });

        createActivity({
            type: 'UPDATE_TASK_STATUS',
            message: `moved "${task.title}" from ${task.status} to ${updatedStatus.status}`,
            taskId: taskId,
            projectId: updatedStatus.projectId,
            userId: req.userId,
        });

        res.status(200).json({message: 'Task Status Updated'});
    }
    catch(err){
        res.status(500).json({message: 'Server Error'});
        console.log(err);
    }


});

router.delete('/deletetask/:taskId', async (req,res) => {
    const {taskId} = req.params;

    try{
        const Task = await prisma.task.findFirst({
            where: {
                id: taskId,
                project:{
                    members:{
                        some:{
                            userId:req.userId,
                        },
                    },
                },
            },
        });

        if(!Task){
            return res.status(404).json({message: "Task not Found"});
        }

        await prisma.task.delete({
            where: {
                id: taskId,
            },
        });
        
        createActivity({
            type:'DELETE_TASK',
            message: `deleted task "${Task.title}"`,
            taskId: taskId,
            projectId: Task.projectId,
            userId:req.userId
        }).catch((err) => {
            console.log('Failed to create activity:', err);
        });

        res.status(200).json({message: 'Task Deleted'});

    }catch(err){
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
})

export default router;
