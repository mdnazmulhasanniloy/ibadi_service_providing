export interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id: string;
  new_product_id?: string;
  entitlement_ids: string[];
  transaction_id: string;
  original_transaction_id: string;
  price: number;
  price_in_purchased_currency: number;
  currency: string;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  environment: 'SANDBOX' | 'PRODUCTION';
  store: string;
  period_type: string;
}
