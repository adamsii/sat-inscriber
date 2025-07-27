import { Router, Request, Response } from "express";
import { getFeerate } from "../clients/EsploraClient";
let router = Router();

export default class FeeController {
  configureRoutes() {
    router.get("/", this.getFeeRates.bind(this));
    return router;
  }

  async getFeeRates(req: Request, res: Response) {
    try {
      let feerate = await getFeerate([1, 3, 6]);
      return res.json(feerate);
    } catch (e) {
      console.log(e);
      return res.status(400).send();
    }
  }
}
