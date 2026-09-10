import jwt from 'jsonwebtoken';
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
export const generateToken = (res, user, message) => {
  const token = jwt.sign({ userId: String(user._id), tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1d' });
  return res.status(200).cookie('token', token, { ...cookieOptions(), maxAge: 86400000 }).json({ success: true, message, user: user.toJSON() });
};
