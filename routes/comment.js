import express from "express";
import 'dotenv/config';
import prisma from '../services/dbclient.js';
import { createActivity} from "../utils/activity.js";
import { authenticate } from "../middleware/authenticateToken.js";
import { create } from "domain";

const router = express.Router();

router.use(authenticate);

router.get('/getcomments/:taskId', async (req,res) => {

    try{
    const {taskId} = req.params;

//finding project from project id so that false project cannot be created
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                project:{
                    members: {
                        some: {
                            userId: req.userId,
                        },
                    },
                },
            },
        });

        if(!task){
            return res.status(404).json({message: 'Task not found'});
        } 

        const comments = await prisma.comment.findMany({
            where:{
                taskId: taskId,
            },
        });

        res.status(200).json(comments);

    }catch(err){
        console.log('Get all comments:',err);
        res.status(500).json({message:'Server Error'});
    }
});

router.post('/comment/:taskId', async (req,res) => {
    try{
        const {taskId} = req.params;

         const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                project:{
                    members: {
                        some: {
                            userId: req.userId,
                        },
                    },
                },
            },
        });

        if(!task){
            return res.status(404).json({message: 'Task not found'});
        } 

        const comment = await prisma.comment.create({
            data: {
                content: req.body.content,
                userId: req.userId,
                taskId: taskId,
            }
        });

        createActivity({
            type: 'COMMENT',
            message: `commented on "${task.title}"`,
            userId:req.userId,
            projectId: task.projectId,
            taskId:taskId,
        });

        res.status(201).json({message:'Commented Successfully'});

    } catch(err){
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
});

router.delete('/deletecomment/:commentId', async (req,res) => {
    try{
        const {commentId} = req.params;

         const comment = await prisma.comment.findFirst({
                where: {
                    id: commentId,
                    task: {
                    project: {
                        members: {
                        some: {
                            userId: req.userId,
                        },
                        },
                    },
                    },
                },
                include: {
                    task: {
                    select: {
                        id: true,
                        title: true,
                        projectId: true,
                    },
                    },
                },
                });

        if(!comment){
            return res.status(404).json({message: 'Task not found'});
        } 

        if(comment.userId !== req.userId){
            return res.status(403).json({message: 'No allowed to delete comment'});
        }

        const deleteComment = await prisma.comment.delete({
            where:{
                id: commentId,
            }
        });


        createActivity({
            type:'COMMENT DELETED',
            message: `deleted a comment on "${comment.task.title}"`,
            userId: req.userId,
            projectId: comment.task.projectId,
            taskId:comment.task.id,
        });

        res.status(200).json({message: 'Comment Deleted Successfully'});

    } catch(err){
        console.log(err);
        res.status(500).json({message: 'Server Error'});
    }
});

export default router;