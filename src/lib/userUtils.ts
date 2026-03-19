
export const getTimestamp = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val.toMillis) return val.toMillis();
  if (val instanceof Date) return val.getTime();
  return 0;
};

export const isUserApproved = (user: any): boolean => {
  if (!user) return false;
  // Admin is always approved
  if (user.role === 'admin' || user.email === 'yousef1mahmoud2@gmail.com') return true;
  
  // Check explicit approval
  if (!user.isApproved) return false;
  
  // Check trial expiration
  const expiresAt = getTimestamp(user.trialExpiresAt);
  if (expiresAt && Date.now() > expiresAt) {
    return false;
  }
  
  return true;
};
