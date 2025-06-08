import { Request } from 'express';
import { JwtPayload } from 'src/user/interfaces/jwt-payload.interface';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}