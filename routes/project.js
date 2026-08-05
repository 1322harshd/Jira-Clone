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

        res.status(200).json({message: "Project Created Successfully!",projectId:project.id});

    }catch(error){
     console.log(error)
    }
});


router.get('/projects', authenticate, async (req, res) => {
  try {
    const result = await prisma.project.findMany({
  where: {
    members: {
      some: {
        userId: req.userId,
      },
    },
  },
  include: {
    members: {
      where: {
        userId: {
          not: req.userId,
        },
      },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    },
    tasks: true,
  },
});

    res.status(200).json(result);
    console.log("projects being accessed");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

router.get('/project/:id', authenticate, async (req,res) => {
    const {id} = req.params;

    try{
        const result = await prisma.project.findUnique({
  where: {
    id,
  },
  include: {
    tasks: true,
    members: {
      where: {
        userId: {
          not: req.userId,
        },
      },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    },
  },
});

    res.status(200).json(result);

}catch(err){
    console.log(err);
    res.status(500).json({message: "failed ot fetch project"});
}
   
})

router.get('/projects/:projectId/member-search',authenticate, async (req,res) => {
    try{
        const {projectId} = req.params;
        const {q}  = req.query;

        if(!q){
            return res.json([]);
        }

        const users = await prisma.user.findMany({
            where: {
                name: {
                    contains: String(q),
                    mode: 'insensitive',
                },
                id: {
                    not: req.userId,
                },
                projectMembers:{
                    none:{
                        projectId,
                    },
                },
            },
            take:10,
            select: {
                id: true,
                name: true,
                image: true,
            },
        });

        res.json(users);
     }catch(error){
        console.log(error);
        res.status(500).json({message: 'Failed to search members'});
     }
});

router.post('/projects/:projectId/members',authenticate, async (req,res) => {
  try{
    const {projectId} = req.params;
    const {userIds} = req.body;
    
    await prisma.projectMember.createMany({
      data: userIds.map((userId) => ({
        userId,
        projectId,
        role: "MEMBER",
      })),
    });

    res.status(201).json({message:"Members added successfully"});
  }
  catch(err){
    console.log(err);
    res.status(500).json({message: "Server Error"});
  }
});


export default router;