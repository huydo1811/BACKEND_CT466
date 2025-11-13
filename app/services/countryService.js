import Country from '../models/Country.js';
import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads', 'countries');

const getAllCountries = async ({ page = 1, limit = 20, search } = {}) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, parseInt(limit, 10) || 20);
  const filter = {};
  if (search) {
    const re = new RegExp(search, 'i');
    filter.$or = [{ name: re }, { code: re }, { slug: re }];
  }

  const totalItems = await Country.countDocuments(filter);
  const countries = await Country.find(filter)
    .sort({ createdAt: -1 })
    .skip((p - 1) * l)
    .limit(l)
    .lean();

  const pagination = {
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / l)),
    page: p,
    limit: l
  };

  return { countries, pagination };
};

const getCountryById = async (id) => {
  return Country.findById(id).lean();
};

const createCountry = async (data) => {
  // data.flag expected to be public URL or empty
  const country = await Country.create(data);
  return country;
};

const _deleteFileIfLocal = (flagUrl) => {
  if (!flagUrl) return;
  try {
    // detect local uploads path segment
    const segment = '/uploads/countries/';
    const idx = flagUrl.indexOf(segment);
    if (idx === -1) return;
    const filename = flagUrl.slice(idx + segment.length);
    const fp = path.join(uploadsDir, filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch (err) {
    // swallow errors but log
    console.warn('delete file error', err);
  }
};

const updateCountry = async (id, data) => {
  const existing = await Country.findById(id).lean();
  if (!existing) throw new Error('Country not found');

  // if incoming data has flag that is a new uploaded URL (starts with http and contains /uploads/countries/)
  if (data.flag && existing.flag && data.flag !== existing.flag) {
    _deleteFileIfLocal(existing.flag);
  }

  const updated = await Country.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  return updated;
};

const deleteCountry = async (id) => {
  const existing = await Country.findById(id);
  if (!existing) throw new Error('Country not found');

  // delete file if stored locally
  if (existing.flag) _deleteFileIfLocal(existing.flag);

  await Country.findByIdAndDelete(id);
  return true;
};

const searchCountries = async (q) => {
  const re = new RegExp(q, 'i');
  return Country.find({ $or: [{ name: re }, { code: re }, { slug: re }] }).limit(50).lean();
};

export default {
  getAllCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
  searchCountries
};