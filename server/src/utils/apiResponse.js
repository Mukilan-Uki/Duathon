export function successResponse(
  res,
  { statusCode = 200, message = 'Operation completed successfully', data = {} } = {},
) {
  return res.status(statusCode).json({ success: true, message, data });
}
