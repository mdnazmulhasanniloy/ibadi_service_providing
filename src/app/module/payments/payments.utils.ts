import type { Request } from 'express';
import config from '@app/config/index.js';

export const verifyRevenueCatWebhook = (req: Request) => {
  const expectedSecret = config.revenuecat_webhook_secret;
  return Boolean(expectedSecret && req.get('authorization') === expectedSecret);
};
