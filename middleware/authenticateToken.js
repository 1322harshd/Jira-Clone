import jwt from 'jsonwebtoken';

export function authenticate(req,res,next){
    const token = req.cookies.accessToken;

    if(!token){
        return res.status(401).json({message: 'No token provided'});
    }

    jwt.verify(token,process.env.JWT_SECRET, (err, decoded) =>{
         console.log(err);
        if(err){
            return res.status(401).json({ message: 'Access token expired'});
        }
        req.userId = decoded.userId;
        next();
    })
}