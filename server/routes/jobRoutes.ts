import { Router } from "express";
import { JobController } from "../controllers/jobController";
import { authenticate, authorize, addCorrelationId } from "../middlewares/auth";

const router = Router();

router.use(addCorrelationId);

router.get("/", JobController.list);
router.get("/:id", JobController.getById);

router.post("/", authenticate, authorize(['recruiter', 'admin']), JobController.create);

export default router;
