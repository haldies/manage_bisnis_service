export type Application = {
  id: string;
  name: string;
  package_name: string;
  service_account_json?: string;
  created_at: string;
  status: 'pending' | 'active' | 'inactive';
};
