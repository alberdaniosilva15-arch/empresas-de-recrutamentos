import { Router } from "express";
import { ApplicationController } from "../controllers/applicationController";
import { authenticate, authorize, addCorrelationId } from "../middlewares/auth";

const router = Router();

router.use(addCorrelationId);
router.use(authenticate);

router.post("/", authorize(['candidate', 'recruiter']), ApplicationController.create);
router.get("/job/:jobId", authorize(['recruiter']), ApplicationController.listByJob);

export default router;
