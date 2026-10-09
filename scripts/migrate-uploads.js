// One-off script: moves avatars from public/uploads to Cloudinary and
// points each user's image at the new URL.
// Run with: node scripts/migrate-uploads.js          (dry run, changes nothing)
//           node scripts/migrate-uploads.js --apply  (uploads and updates the database)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../services/dbclient.js';

const apply = process.argv.includes('--apply');

const users = await prisma.user.findMany({
    where: { image: { startsWith: '/uploads/' } },
    select: { id: true, email: true, image: true },
});

console.log(`${users.length} user(s) with a local upload${apply ? '' : ' (dry run)'}`);

for (const user of users) {
    const filePath = path.join('public', user.image);

    if (!fs.existsSync(filePath)) {
        console.log(`MISSING  ${user.email}  ${filePath}`);
        continue;
    }

    if (!apply) {
        console.log(`WOULD MOVE  ${user.email}  ${filePath}`);
        continue;
    }

    const result = await cloudinary.uploader.upload(filePath, {
        folder: 'jira-clone/avatars',
        public_id: user.id,
        overwrite: true,
    });

    await prisma.user.update({
        where: { id: user.id },
        data: { image: result.secure_url },
    });

    console.log(`MOVED  ${user.email}  ${result.secure_url}`);
}

await prisma.$disconnect();
