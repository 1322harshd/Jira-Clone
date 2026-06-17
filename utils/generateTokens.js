import jwt from 'jsonwebtoken';

export function generateTokens(id,email){
    
    //generate access token
   const accessToken = jwt.sign(
            {userId:id,email:email},
            process.env.JWT_SECRET,
            {expiresIn:'1h'}
        );

    //generate refresh token
    const refreshToken = jwt.sign(
            {userId:id,email:email},
            process.env.JWT_REFRESH_SECRET,
            {expiresIn:'7d'}
        );

    return {accessToken, refreshToken};
}