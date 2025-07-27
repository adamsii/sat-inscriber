import express, { Router, Request, Response } from "express";
import FundingManager from "../funding/FundingManager";
import InscriptionWorker from "../InscriptionWorker";
let router = express.Router();

function checkApiKey(req: Request) {
  let { apiKey }: { apiKey: string } = req.query as any;
  return apiKey === "709c19d6-20a3-4e1e-96c8-5abe069a0238";
}

export default class FundingController {
  fundingManager: FundingManager;
  inscriptionWorker: InscriptionWorker;

  constructor(
    fundingManager: FundingManager,
    inscriptionWorker: InscriptionWorker
  ) {
    this.fundingManager = fundingManager;
    this.inscriptionWorker = inscriptionWorker;
  }

  configureRoutes(): Router {
    router.get("/ping", this.ping.bind(this));
    router.get("/", this.getAllFundingRequests.bind(this));
    router.get("/inscription", this.createInscription.bind(this));
    router.post("/update/inputs", this.updateFundingInputs.bind(this));
    router.post("/update/:fundingId", this.updateFunding.bind(this));

    return router;
  }

  ping(req: Request, res: Response) {
    return res.status(200).send();
  }

  async getAllFundingRequests(req: Request, res: Response) {
    try {
      if (!checkApiKey(req)) {
        return res.status(401).send();
      }

      let fromDateStr: string = req.query.fromDate as string;
      let fromDate: Date | undefined = undefined;

      if (!!fromDateStr) {
        fromDate = new Date(fromDateStr);

        if ((fromDate as any) == "Invalid Date") {
          return res.status(400).send();
        }
      }

      let fundingRequests = await this.fundingManager.getAllFundingRequests(
        fromDate
      );

      return res.json(fundingRequests);
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  }

  async createInscription(req: Request, res: Response) {
    try {
      if (!checkApiKey(req)) {
        return res.status(401).send();
      }

      let fundingId: number = parseInt(req.query.fundingId as string);

      if (isNaN(fundingId)) {
        return res.status(400).send(`Funding id ${fundingId} is not valid`);
      }

      let fundingRequest = await this.fundingManager.getFundingById(fundingId);

      if (!fundingRequest) {
        return res.status(400).send(`Funding id ${fundingId} not found`);
      }

      await this.inscriptionWorker.createInscription(fundingRequest);
      return res.json(true);
    } catch (e) {
      console.log(e);
      res.status(500).send();
    }
  }

  async updateFunding(req: Request, res: Response) {
    if (!checkApiKey(req)) {
      return res.status(401).send();
    }

    let fundingId = req.params.fundingId;

    if (!fundingId) {
      return res.status(400).send(`Funding id ${fundingId} is invalid`);
    }

    this.fundingManager.updateFundingById(fundingId as any, req.body);
    return res.status(200).send();
  }

  async updateFundingInputs(req: Request, res: Response) {
    if (!checkApiKey(req)) {
      return res.status(401).send();
    }

    this.inscriptionWorker.updateFundingWithMoreInputs(
      req.body.utxos,
      req.body.f,
      req.body.utxoValueSum
    );

    return res.status(200).send();
  }
}
