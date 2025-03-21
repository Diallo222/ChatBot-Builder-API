import { Request, Response } from "express";
import Ticket from "../models/Ticket";
import { uploadFiles } from "../utils/fileUpload";

export const createTicket = async (req: Request, res: Response) => {
  console.log("req.body", req.body);
  console.log("req.files", req.files);

  try {
    const { subject, description } = req.body;
    const files = req.files as Express.Multer.File[];

    const attachments = files ? await uploadFiles(files) : [];

    const ticket = await Ticket.create({
      user: req.user?._id,
      subject,
      description,
      attachments,
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.log("CREATE TICKET ERROR", error);

    res.status(500).json({ error: "Error creating ticket" });
  }
};

export const getUserTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find({ user: req.user?._id });
    console.log("tickets", tickets[1].attachments);

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ error: "Error fetching tickets" });
  }
};

export const getAdminTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find().populate("user", "email name");
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: "Error fetching tickets" });
  }
};

export const respondToTicket = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { response } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        supportResponse: response,
        status: "resolved",
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: "Error responding to ticket" });
  }
};
