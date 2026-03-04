import { Request, Response } from "express";
import prisma from "@root/prisma.js";

export async function getUserPreferences(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    let preference = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      preference = await prisma.userPreference.create({
        data: {
          userId,
          enableFollowUpQuestions: true,
        },
      });
    }

    res.json({ status: true, data: preference });
  } catch (error: any) {
    console.error("Error fetching user preferences:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}

export async function updateUserPreferences(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { enableFollowUpQuestions } = req.body;

    if (typeof enableFollowUpQuestions !== "boolean") {
      res.status(400).json({
        status: false,
        message: "enableFollowUpQuestions must be a boolean",
      });
      return;
    }

    const preference = await prisma.userPreference.upsert({
      where: { userId },
      update: { enableFollowUpQuestions },
      create: {
        userId,
        enableFollowUpQuestions,
      },
    });

    res.json({ status: true, data: preference });
  } catch (error: any) {
    console.error("Error updating user preferences:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}
