import { Router } from "express";
import { rubyDemoController } from "../controllers/rubyDemo.controller";

const router = Router();

router.get("/travel-tips", rubyDemoController.travelTips);

export { router as rubyDemoRouter };
