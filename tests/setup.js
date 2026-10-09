import { beforeEach, afterAll } from "vitest";
import prisma from "../services/dbclient.js";

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "Activity","Comment","Task","ProjectMember","Project","RefreshToken","User" CASCADE`
  );
});

afterAll(() => prisma.$disconnect());
