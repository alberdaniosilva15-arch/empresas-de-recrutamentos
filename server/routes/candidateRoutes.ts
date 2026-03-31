import { Router } from "express";
import { CandidateController } from "../controllers/candidateController";
import { authenticate, authorize, addCorrelationId } from "../middlewares/auth";

const router = Router();

router.use(addCorrelationId);
router.use(authenticate);

router.post("/", authorize(['recruiter', 'candidate']), CandidateController.create);
router.get("/", authorize(['recruiter']), CandidateController.list);
router.patch("/:id/status", authorize(['recruiter']), CandidateController.updateStatus);

export default router;
