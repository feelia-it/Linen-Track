const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
};

const fetchWithAuth = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return handleResponse(response);
};

// Auth
export const exchangeSession = async (sessionId) => {
  return fetchWithAuth('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
};

export const getGoogleAuthUrl = () => fetchWithAuth('/auth/google/url');

export const handleGoogleCallback = (code, redirectUri) => fetchWithAuth('/auth/google/callback', {
  method: 'POST',
  body: JSON.stringify({ code, redirect_uri: redirectUri }),
});

export const googleTokenLogin = (credential) => fetchWithAuth('/auth/google/token', {
  method: 'POST',
  body: JSON.stringify({ credential }),
});

export const getMe = () => fetchWithAuth('/auth/me');
export const logout = () => fetchWithAuth('/auth/logout', { method: 'POST' });

// Companies
export const getCompanies = () => fetchWithAuth('/companies');
export const getCompany = (id) => fetchWithAuth(`/companies/${id}`);
export const createCompany = (data) => fetchWithAuth('/companies', { method: 'POST', body: JSON.stringify(data) });
export const updateCompany = (id, data) => fetchWithAuth(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCompany = (id) => fetchWithAuth(`/companies/${id}`, { method: 'DELETE' });

// Outlets
export const getOutlets = (companyId) => fetchWithAuth(`/outlets${companyId ? `?company_id=${companyId}` : ''}`);
export const getOutlet = (id) => fetchWithAuth(`/outlets/${id}`);
export const createOutlet = (data) => fetchWithAuth('/outlets', { method: 'POST', body: JSON.stringify(data) });
export const updateOutlet = (id, data) => fetchWithAuth(`/outlets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteOutlet = (id) => fetchWithAuth(`/outlets/${id}`, { method: 'DELETE' });

// Users
export const getUsers = (companyId) => fetchWithAuth(`/users${companyId ? `?company_id=${companyId}` : ''}`);
export const updateUser = (id, data) => fetchWithAuth(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Items
export const getItems = (companyId) => fetchWithAuth(`/items${companyId ? `?company_id=${companyId}` : ''}`);
export const getItem = (id) => fetchWithAuth(`/items/${id}`);
export const createItem = (data) => fetchWithAuth('/items', { method: 'POST', body: JSON.stringify(data) });
export const updateItem = (id, data) => fetchWithAuth(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteItem = (id) => fetchWithAuth(`/items/${id}`, { method: 'DELETE' });

// Categories
export const getCategories = (companyId) => fetchWithAuth(`/categories${companyId ? `?company_id=${companyId}` : ''}`);
export const createCategory = (data) => fetchWithAuth('/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory = (id, data) => fetchWithAuth(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory = (id) => fetchWithAuth(`/categories/${id}`, { method: 'DELETE' });

// Departments
export const getDepartments = (companyId) => fetchWithAuth(`/departments${companyId ? `?company_id=${companyId}` : ''}`);
export const createDepartment = (data) => fetchWithAuth('/departments', { method: 'POST', body: JSON.stringify(data) });
export const updateDepartment = (id, data) => fetchWithAuth(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDepartment = (id) => fetchWithAuth(`/departments/${id}`, { method: 'DELETE' });

// Vendors
export const getVendors = (companyId) => fetchWithAuth(`/vendors${companyId ? `?company_id=${companyId}` : ''}`);
export const createVendor = (data) => fetchWithAuth('/vendors', { method: 'POST', body: JSON.stringify(data) });
export const updateVendor = (id, data) => fetchWithAuth(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteVendor = (id) => fetchWithAuth(`/vendors/${id}`, { method: 'DELETE' });

// Staff
export const getStaff = (companyId, outletId) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  return fetchWithAuth(`/staff${query ? `?${query}` : ''}`);
};
export const getStaffMember = (id) => fetchWithAuth(`/staff/${id}`);
export const createStaff = (data) => fetchWithAuth('/staff', { method: 'POST', body: JSON.stringify(data) });
export const updateStaff = (id, data) => fetchWithAuth(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStaff = (id) => fetchWithAuth(`/staff/${id}`, { method: 'DELETE' });

// Inventory
export const getInventory = (companyId, outletId, itemId) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  if (itemId) query += `${query ? '&' : ''}item_id=${itemId}`;
  return fetchWithAuth(`/inventory${query ? `?${query}` : ''}`);
};
export const setOpeningStock = (data) => fetchWithAuth('/inventory/opening-stock', { method: 'POST', body: JSON.stringify(data) });

// GRN
export const getGRNList = (companyId, outletId) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  return fetchWithAuth(`/grn${query ? `?${query}` : ''}`);
};
export const getGRN = (id) => fetchWithAuth(`/grn/${id}`);
export const createGRN = (data) => fetchWithAuth('/grn', { method: 'POST', body: JSON.stringify(data) });

// Issues
export const getIssues = (companyId, outletId, staffId) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  if (staffId) query += `${query ? '&' : ''}staff_id=${staffId}`;
  return fetchWithAuth(`/issues${query ? `?${query}` : ''}`);
};
export const getIssue = (id) => fetchWithAuth(`/issues/${id}`);
export const createIssue = (data) => fetchWithAuth('/issues', { method: 'POST', body: JSON.stringify(data) });

// Returns
export const getReturns = (companyId, outletId) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  return fetchWithAuth(`/returns${query ? `?${query}` : ''}`);
};
export const createReturn = (data) => fetchWithAuth('/returns', { method: 'POST', body: JSON.stringify(data) });

// Discard/Lost
export const getDiscardLost = (companyId, outletId, type) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  if (type) query += `${query ? '&' : ''}record_type=${type}`;
  return fetchWithAuth(`/discard-lost${query ? `?${query}` : ''}`);
};
export const createDiscardLost = (data) => fetchWithAuth('/discard-lost', { method: 'POST', body: JSON.stringify(data) });

// Templates
export const getTemplates = (scope, companyId, outletId) => {
  let query = '';
  if (scope) query += `scope=${scope}`;
  if (companyId) query += `${query ? '&' : ''}company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  return fetchWithAuth(`/templates${query ? `?${query}` : ''}`);
};
export const getTemplate = (id) => fetchWithAuth(`/templates/${id}`);
export const createTemplate = (data) => fetchWithAuth('/templates', { method: 'POST', body: JSON.stringify(data) });
export const updateTemplate = (id, data) => fetchWithAuth(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTemplate = (id) => fetchWithAuth(`/templates/${id}`, { method: 'DELETE' });

// Activity Logs
export const getActivityLogs = (companyId, outletId, entityType, limit = 100) => {
  let query = `limit=${limit}`;
  if (companyId) query += `&company_id=${companyId}`;
  if (outletId) query += `&outlet_id=${outletId}`;
  if (entityType) query += `&entity_type=${entityType}`;
  return fetchWithAuth(`/activity-logs?${query}`);
};

// Dashboards
export const getSuperAdminDashboard = () => fetchWithAuth('/dashboard/super-admin');
export const getCompanyAdminDashboard = () => fetchWithAuth('/dashboard/company-admin');
export const getIssuerDashboard = () => fetchWithAuth('/dashboard/issuer');

// Reports
export const getStockSummaryReport = (companyId, outletId) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  return fetchWithAuth(`/reports/stock-summary${query ? `?${query}` : ''}`);
};

export const getIssueReturnReport = (companyId, outletId, startDate, endDate) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  if (startDate) query += `${query ? '&' : ''}start_date=${startDate}`;
  if (endDate) query += `${query ? '&' : ''}end_date=${endDate}`;
  return fetchWithAuth(`/reports/issue-return${query ? `?${query}` : ''}`);
};

export const getStaffOutstandingReport = (companyId, outletId) => {
  let query = '';
  if (companyId) query += `company_id=${companyId}`;
  if (outletId) query += `${query ? '&' : ''}outlet_id=${outletId}`;
  return fetchWithAuth(`/reports/staff-outstanding${query ? `?${query}` : ''}`);
};

// Health
export const healthCheck = () => fetchWithAuth('/health');
