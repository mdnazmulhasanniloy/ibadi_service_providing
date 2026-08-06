export interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  new_product_id?: string;
  entitlement_ids?: string[];
  transaction_id?: string;
  original_transaction_id?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  environment?: 'SANDBOX' | 'PRODUCTION';
  store?: string;
  period_type?: string;
  cancel_reason?: string;
  expiration_reason?: string;
  event_timestamp_ms: number;
  transferred_from?: string[];
  transferred_to?: string[];
}

export interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}
