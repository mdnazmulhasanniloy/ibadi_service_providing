import { Router } from 'express';
import { contentController } from './content.controller.js';

const router:Router = Router();

router.patch('/:id', contentController.updateContents);
router.get('/', contentController.getContents);

export const contentsRoutes = router;
