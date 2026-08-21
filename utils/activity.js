
import prisma from '../services/dbclient.js';

export async function createActivity({
    type,
    message,
    userId,
    projectId = null,
    taskId = null,
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  return await prisma.activity.create({
    data: {
        type,
        message: `${user.name} ${message}`,
        userId,
        projectId,
        taskId,
    },
  });
}