import prisma from '../config/database.js';
import { ApiError } from '../utils/apiError.js';
import config from '../config/index.js';

/**
 * Get all travel guides with pagination and search
 */
const getAllGuides = async ({ page, limit, search, category, sortBy, sortOrder }) => {
  const take = Math.min(limit, config.maxPageSize);
  const skip = (page - 1) * take;

  // Build where clause
  const where = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = { equals: category, mode: 'insensitive' };
  }

  // Build orderBy clause
  const allowedSortFields = ['title', 'createdAt', 'updatedAt', 'category', 'location', 'readTime'];
  const normalizedSortField = allowedSortFields.includes(sortBy) ? sortBy : 'title';
  const normalizedSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
  const orderBy = { [normalizedSortField]: normalizedSortOrder };

  // Execute queries in parallel
  const [guides, total] = await Promise.all([
    prisma.travelGuide.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    prisma.travelGuide.count({ where }),
  ]);

  return {
    guides,
    pagination: {
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasNext: page * take < total,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get travel guide by ID
 */
const getGuideById = async (id) => {
  const guide = await prisma.travelGuide.findUnique({
    where: { id },
  });

  if (!guide) {
    throw new ApiError(404, 'Travel guide not found');
  }

  return guide;
};

/**
 * Create new travel guide
 */
const createGuide = async (data) => {
  const { title, description, category, heroImage, location, readTime, content } = data;

  // Validate required fields
  if (!title || !description || !category || !location || !readTime || !content) {
    throw new ApiError(400, 'Title, description, category, location, readTime, and content are required');
  }

  // Validate content structure
  if (!Array.isArray(content) || content.length === 0) {
    throw new ApiError(400, 'Content must be a non-empty array');
  }

  const newGuide = await prisma.travelGuide.create({
    data: {
      title,
      description,
      category,
      heroImage: heroImage || '',
      location,
      readTime,
      content,
    },
  });

  return newGuide;
};

/**
 * Update travel guide
 */
const updateGuide = async (id, data) => {
  // Check if guide exists
  await getGuideById(id);

  const { title, description, category, heroImage, location, readTime, content } = data;

  // Validate content if provided
  if (content !== undefined) {
    if (!Array.isArray(content) || content.length === 0) {
      throw new ApiError(400, 'Content must be a non-empty array');
    }
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (heroImage !== undefined) updateData.heroImage = heroImage;
  if (location !== undefined) updateData.location = location;
  if (readTime !== undefined) updateData.readTime = readTime;
  if (content !== undefined) updateData.content = content;

  const updatedGuide = await prisma.travelGuide.update({
    where: { id },
    data: updateData,
  });

  return updatedGuide;
};

/**
 * Delete travel guide
 */
const deleteGuide = async (id) => {
  // Check if guide exists
  await getGuideById(id);

  await prisma.travelGuide.delete({
    where: { id },
  });

  return true;
};

export { getAllGuides, getGuideById, createGuide, updateGuide, deleteGuide };
