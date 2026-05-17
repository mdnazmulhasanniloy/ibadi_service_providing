import { Router } from 'express';
import { homepageController } from './homepage.controller.js';

const router: Router = Router();

router.get('/', homepageController.getAllHomepage);
router.post('/availability', homepageController.getAvailableSlots);

export const homepageRoutes = router;
