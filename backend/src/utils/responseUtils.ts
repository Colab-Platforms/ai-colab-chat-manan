import { Response } from 'express';
import STATUS_CODES from "./statusCodes.js";

export const sendResponse = (
  res: Response,
  status: boolean,
  data: unknown,
  message = "",
  statusCode = STATUS_CODES.OK
) => {
  return res.status(statusCode).json({ status, data, message });
};