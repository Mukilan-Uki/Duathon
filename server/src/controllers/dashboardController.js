import {
  getAdminDashboard,
  getCustomerDashboard,
  getEmployeeDashboard,
} from '../services/dashboardService.js';
import { successResponse } from '../utils/apiResponse.js';

export async function customerDashboard(req, res) {
  const dashboard = await getCustomerDashboard(req.user._id);
  return successResponse(res, { data: dashboard });
}

export async function employeeDashboard(req, res) {
  const dashboard = await getEmployeeDashboard(req.user._id);
  return successResponse(res, { data: dashboard });
}

export async function adminDashboard(_req, res) {
  const dashboard = await getAdminDashboard();
  return successResponse(res, { data: dashboard });
}
