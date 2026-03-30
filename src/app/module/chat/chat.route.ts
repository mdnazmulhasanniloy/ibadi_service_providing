import { Router } from 'express';
import { chatController } from './chat.controller.js';

const router: Router = Router();

router.patch('/accept/:id', chatController.acceptChat);
router.patch('/block/:id', chatController.blockChat);

export const chatRoutes = router;
