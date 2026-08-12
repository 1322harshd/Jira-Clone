
import prisma from '../services/dbclient.js';

export async function createActivity({
    type,
    message,
    userId,
    projectId = null,
    taskId = null,
}) {
  return await prisma.activity.create({
    data: {
        type,
        message,
        userId,
        projectId,
        taskId,
    },
  });
}