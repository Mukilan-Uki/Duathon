import SystemSetting from '../models/SystemSetting.js';

export async function getNumericSetting(key, fallback) {
  const setting = await SystemSetting.findOne({ key }).select('value').lean();
  return Number.isSafeInteger(setting?.value) ? setting.value : fallback;
}
