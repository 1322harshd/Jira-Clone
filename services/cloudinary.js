import { v2 as cloudinary } from "cloudinary";

export function uploadAvatar(buffer,userId){
    return new Promise((resolve,reject) => {
        cloudinary.uploader.upload_stream(
            { folder: "jira-clone/avatars", public_id: userId, overwrite: true},
            (error, result) => (error ? reject(error) : resolve(result.secure_url))
        ).end(buffer);
    });
}