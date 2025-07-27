import express, { Request, Response, NextFunction, json } from "express";
var https = require("https");
import FundingController from "./funding/FundingController";
import FundingManager from "./funding/FundingManager";
import MintController from "./mint/MintController";
import * as fs from "fs";
import FeeController from "./fees/FeeController";
import MintManager from "./mint/MintManager";
import MintStorage from "./mint/MintStorage";
import InscriptionWorker from "./InscriptionWorker";
import TransactionManager from "./transaction/TransactionManager";
import TransactionStorage from "./transaction/TransactionStorage";
import FundingStorage from "./funding/FundingStorage";
import { NETWORK_NAME } from "./config";
import OutdatedFundingManager from "./outdated-funding/OutdatedFundingManager";
import OutdatedFundingStorage from "./outdated-funding/OutdatedFundingStorage";
import PaymentManager from "./payment/PaymentManager";
import PaymentStorage from "./payment/PaymentStorage";

let app = express();
app.use(
  express.json({
    limit: "200kb",
  })
);

async function startApplication() {
  //Storage
  let mintStorage = new MintStorage();
  let transactionStorage = new TransactionStorage();
  let fundingStorage = new FundingStorage();
  let outdatedFundingStorage = new OutdatedFundingStorage();
  let paymentStorage = new PaymentStorage();

  //Managers
  let fundingManager = new FundingManager(fundingStorage);
  let transactionManager = new TransactionManager(transactionStorage);
  let paymentManager = new PaymentManager(paymentStorage, fundingManager);

  let mintManager = new MintManager(
    mintStorage,
    fundingManager,
    transactionManager,
    paymentManager
  );

  let outdatedFundingManager = new OutdatedFundingManager(
    outdatedFundingStorage
  );

  let worker = new InscriptionWorker(
    mintStorage,
    fundingManager,
    transactionManager,
    outdatedFundingManager,
    paymentManager
  );

  //Controllers
  let mintController = new MintController(
    mintManager,
    fundingManager,
    transactionManager
  );
  let fundingController = new FundingController(fundingManager, worker);
  let feeController = new FeeController();

  app.use("/mint", mintController.configureRoutes());
  app.use("/funding", fundingController.configureRoutes());
  app.use("/fee", feeController.configureRoutes());

  //Start worker
}

async function main() {
  try {
    startApplication();
  } catch (e) {
    console.log(
      "An error occurred while starting up the application:",
      JSON.stringify(e)
    );
  }

  app.use(function (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    console.error(err.stack);
    return res.status(500);
  });

  app.get("/ordinal-explorer*", (req: Request, res: Response) => {
    let ORDINAL_EXPLORER_DOMAIN: string | undefined = {
      regtest: "localhost:80",
      testnet: "testnet.ordinals.com",
      mainnet: "ordinals.com",
    }[NETWORK_NAME];

    console.log(`${req.protocol}://${ORDINAL_EXPLORER_DOMAIN}/${req.path}`);

    let path = req.path.substring("ordinal-explorer".length + 1);
    res.redirect(`${req.protocol}://${ORDINAL_EXPLORER_DOMAIN}${path}`);
  });

  // This handler must always be registered before the handler for "/bitcoin-explorer*"
  app.get("/bitcoin-explorer-api*", async (req: Request, res: Response) => {
    let BITCOIN_EXPLORER_API_DOMAIN: string | undefined = {
      regtest: "http://localhost:3000",
      testnet: "https://blockstream.info/testnet/api",
      mainnet: "https://blockstream.info/api",
    }[NETWORK_NAME];

    let path = req.path.substring("bitcoin-explorer-api".length + 1);
    return res.redirect(`${BITCOIN_EXPLORER_API_DOMAIN}${path}`);
  });

  app.get("/bitcoin-explorer*", (req: Request, res: Response) => {
    let ORDINAL_EXPLORER_DOMAIN: string | undefined = {
      regtest: "localhost:5000",
      testnet: "blockstream.info/testnet",
      mainnet: "blockstream.info",
    }[NETWORK_NAME];

    let path = req.path.substring("bitcoin-explorer".length + 1);
    res.redirect(`${req.protocol}://${ORDINAL_EXPLORER_DOMAIN}${path}`);
  });

  app.get("/", (req, res) => {
    return res.status(200).sendFile(`${__dirname}/views/index.html`);
  });

  app.get("/my-inscription", (req, res) => {
    return res.status(200).sendFile(`${__dirname}/views/my-inscription.html`);
  });

  app.get("/mint/:mintId/details", (req, res) => {
    return res.status(200).sendFile(`${__dirname}/views/mint-details.html`);
  });

  app.get("/:file", (req, res) => {
    let ext = __dirname + "/views/";

    let filePath = ext + req.params.file;

    console.log(filePath);

    if (!fs.existsSync(filePath)) {
      let referer = req.header("Referer");
      console.log(referer);
      return res.sendStatus(404);
    }

    res.sendFile(filePath);
  });

  app.get("/css/:file", (req, res) => {
    let ext = __dirname + "/views/css/";

    let filePath = ext + req.params.file;

    console.log(filePath);

    if (!fs.existsSync(filePath)) {
      return res.sendStatus(404);
    }

    res.sendFile(filePath);
  });

  app.get("/js/:file", (req, res) => {
    let ext = __dirname + "/views/js/";

    let filePath = ext + req.params.file;

    console.log(filePath);

    if (!fs.existsSync(filePath)) {
      return res.sendStatus(404);
    }

    res.sendFile(filePath);
  });

  app.get("/favicon/:file", (req, res) => {
    let ext = __dirname + "/views/favicon/";

    let filePath = ext + req.params.file;

    console.log(filePath);

    if (!fs.existsSync(filePath)) {
      return res.sendStatus(404);
    }

    res.sendFile(filePath);
  });

  if (process.env.production) {
    var privateKey = fs.readFileSync("./privkey.pem", "utf8");
    var certificate = fs.readFileSync("./fullchain.pem", "utf8");
    var credentials = { key: privateKey, cert: certificate };
    var httpsServer = https.createServer(credentials, app);

    const port = process.env.PORT || 9999;

    httpsServer.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } else {
    app.listen(9999, () => {
      console.log("Listening");
      console.log(`Network is on ${NETWORK_NAME}`);
    });
  }
}

main();
