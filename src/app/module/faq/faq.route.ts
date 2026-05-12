
import { Router } from 'express';
import { faqController } from './faq.controller.js';

const router: Router = Router();

router.post('/', faqController.createFaq);
router.patch('/:id', faqController.updateFaq);
router.delete('/:id', faqController.deleteFaq);
router.get('/:id', faqController.getFaqById);
router.get('/', faqController.getAllFaq);

export const faqRoutes = router;