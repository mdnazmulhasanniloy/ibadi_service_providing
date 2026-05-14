import { Router } from 'express';
import { homepageController } from './homepage.controller.js';

const router: Router = Router();

router.get('/', homepageController.getAllHomepage);

export const homepageRoutes = router;
