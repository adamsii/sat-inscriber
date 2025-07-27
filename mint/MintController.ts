import express, { Router, Request, Response } from "express";
import { SERVICE_FEE } from "../config";
import FundingManager from "../funding/FundingManager";
import TransactionManager from "../transaction/TransactionManager";
import MintManager from "./MintManager";
import MintRequest from "./models/MintRequest";
import MintResponse from "./models/MintResponse";
let router = express.Router();

export default class MintController {
  fundingManager: FundingManager;
  mintManager: MintManager;
  transactionManager: TransactionManager;

  constructor(
    mintManager: MintManager,
    fundingManager: FundingManager,
    transactionManager: TransactionManager
  ) {
    this.mintManager = mintManager;
    this.fundingManager = fundingManager;
    this.transactionManager = transactionManager;
  }

  configureRoutes(): Router {
    router.get("/ping", this.ping.bind(this));
    router.post("/", this.createMintRequest.bind(this));
    router.get("/sub/:sub/:mintId", this.getMintBySubAndMintId.bind(this));
    router.get(
      "/sub/:sub/:mintId/commit/hex",
      this.getUnfundedCommitTxHexBySubAndMintId.bind(this)
    );
    router.get("/sub/:sub", this.getMintRequestsBySub.bind(this));
    return router;
  }

  ping(req: Request, res: Response) {
    return res.status(200).send();
  }

  async getAllMintRequests(req: Request, res: Response) {
    let mintRequests = await this.mintManager.getAllMintRequests();
    res.json(mintRequests);
  }

  async getMintBySubAndMintId(req: Request, res: Response) {
    try {
      let mintId = parseInt(req.params.mintId);

      if (isNaN(mintId)) {
        return res.status(400).send();
      }

      let { sub } = req.params;

      if (!sub) {
        return res.status(400).send("Sub is invalid");
      }

      let mintResponse: MintResponse | null =
        await this.mintManager.getMintBySubAndMintId(sub, mintId);

      res.json(mintResponse);
    } catch (e: any) {
      console.log(e);
      res.status(400).send(e.message);
    }
  }

  async getUnfundedCommitTxHexBySubAndMintId(req: Request, res: Response) {
    try {
      let mintId = parseInt(req.params.mintId);

      if (isNaN(mintId)) {
        return res.status(400).send();
      }

      let { sub } = req.params;

      if (!sub) {
        return res.status(400).send("Sub is invalid");
      }

      let mintResponse: MintResponse | null =
        await this.mintManager.getMintBySubAndMintId(sub, mintId);

      if (mintResponse == null) {
        console.log("An error occurred while generating mint response");
        return res.status(500).send();
      }

      let unfundedCommitPsbt = this.transactionManager.createUnfundedCommitPsbt(
        mintResponse.fundingAddress,
        [mintResponse.amount, SERVICE_FEE]
      );

      res.json((unfundedCommitPsbt as any).__CACHE.__TX.toHex());
    } catch (e: any) {
      console.log(e);
      res.status(400).send(e.message);
    }
  }

  async getMintRequestsBySub(req: Request, res: Response) {
    try {
      let sub = req.params.sub;
      if (!sub) {
        return res.status(400).send("sub must be defined");
      }

      let mints = await this.mintManager.getMintsBySub(sub);
      res.json(mints);
    } catch (e: any) {
      console.log(e);
      res.status(400).send(e.message);
    }
  }

  async createMintRequest(req: Request, res: Response) {
    try {
      let mintRequest: MintRequest = new MintRequest(req.body);
      await this.mintManager.storeMintRequest(mintRequest);
      let fundingRequest = await this.fundingManager.createFundingRequest(
        mintRequest
      );
      let mintResponse = new MintResponse(mintRequest, fundingRequest);
      return res.json(mintResponse);
    } catch (e: any) {
      console.log(e);
      res.status(400).send(e.message);
    }
  }
}
