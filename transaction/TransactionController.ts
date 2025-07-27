import express, { Router, Request, Response } from "express";
import TransactionManager from "./TransactionManager";

let router = express.Router();

export default class TransactionController {
  transactionManager: TransactionManager;

  constructor(transactionManager: TransactionManager) {
    this.transactionManager = transactionManager;
  }

  configureRoutes(): Router {
    router.get("/ping", this.ping.bind(this));
    return router;
  }

  ping(req: Request, res: Response) {
    return res.status(200).send();
  }

  async getAllTransactions(req: Request, res: Response) {
    let transactions = this.transactionManager.getAllTransactions();
    return res.json(transactions);
  }
}
