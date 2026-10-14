export const useAuth = () => ({
  user: { id: 'synthetic-preview', app_metadata: {} },
  profile: { display_name: 'Synthetic preview', username: 'synthetic_preview' },
  access: { admin_access: true, seller_status: 'draft', creator_status: 'draft' },
  loading: false, error: null, refreshProfile: async () => {}, signOut: async () => {},
})
