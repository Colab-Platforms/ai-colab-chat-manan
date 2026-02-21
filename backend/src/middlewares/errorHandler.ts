import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/responseUtils';
import STATUS_CODES from '../utils/statusCodes';

export const errorHandler = async (err: any, _req: Request, res: Response, _next: NextFunction): Promise<void> => {
  console.error("Error Handler Middleware:", err);
  sendResponse(res, false, err, err.message, STATUS_CODES.SERVER_ERROR);
};