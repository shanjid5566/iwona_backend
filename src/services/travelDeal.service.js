import prisma from '../config/database.js';
import { ApiError } from '../utils/apiError.js';
import config from '../config/index.js';

/**
 * Auto-update expired deals based on travelEndDate
 * This function runs automatically when fetching deals
 */
const autoUpdateExpiredDeals = async () => {
  const now = new Date();
  
  // Find and update all ACTIVE deals where travelEndDate has passed
  await prisma.travelDeal.updateMany({
    where: {
      status: 'ACTIVE',
      travelEndDate: {
        not: null,
        lt: now, // less than current date/time
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });
};

/**
 * Get all travel deals with pagination, filtering, and search
 */
export const getAllDeals = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    airport = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Auto-update expired deals before fetching
  await autoUpdateExpiredDeals();

  // Validate and limit page size
  const validLimit = Math.min(limit, config.maxPageSize || 50);
  const skip = (page - 1) * validLimit;

  // Build filter conditions
  const where = {};

  // Search in title, destination, or airport
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { destination: { contains: search, mode: 'insensitive' } },
      { airport: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter by status (ACTIVE, EXPIRED, or FEATURED)
  if (status) {
    const statusUpper = status.toUpperCase();
    if (statusUpper === 'FEATURED') {
      where.isFeatured = true;
    } else if (['ACTIVE', 'EXPIRED'].includes(statusUpper)) {
      where.status = statusUpper;
    }
  }

  // Filter by airport
  if (airport) {
    where.airport = { equals: airport, mode: 'insensitive' };
  }

  // Build orderBy
  const orderBy = {};
  orderBy[sortBy] = sortOrder.toLowerCase();

  // Execute query
  const [deals, total] = await Promise.all([
    prisma.travelDeal.findMany({
      where,
      skip,
      take: validLimit,
      orderBy,
    }),
    prisma.travelDeal.count({ where }),
  ]);

  return {
    deals,
    pagination: {
      page,
      limit: validLimit,
      total,
      totalPages: Math.ceil(total / validLimit),
    },
  };
};

/**
 * Get single travel deal by ID
 */
export const getDealById = async (id) => {
  // Auto-update expired deals before fetching
  await autoUpdateExpiredDeals();
  
  const deal = await prisma.travelDeal.findUnique({
    where: { id },
  });

  if (!deal) {
    throw new ApiError(404, 'Travel deal not found');
  }

  return deal;
};

/**
 * Create new travel deal
 */
export const createDeal = async (data) => {
  // Validate required fields
  if (!data.title || !data.description || !data.price || !data.destination || !data.airport) {
    throw new ApiError(400, 'Missing required fields: title, description, price, destination, airport');
  }

  // Validate price
  if (data.price < 0) {
    throw new ApiError(400, 'Price must be a positive number');
  }

  // Validate discount if provided
  if (data.discount !== undefined && data.discount !== null) {
    if (data.discount < 0 || data.discount > 100) {
      throw new ApiError(400, 'Discount must be between 0 and 100');
    }
  }

  // Validate dates if provided
  if (data.travelStartDate && data.travelEndDate) {
    const startDate = new Date(data.travelStartDate);
    const endDate = new Date(data.travelEndDate);
    
    if (endDate < startDate) {
      throw new ApiError(400, 'Travel end date must be after start date');
    }
  }

  // Auto-determine status based on travelEndDate
  let dealStatus = data.status || 'ACTIVE';
  if (data.travelEndDate) {
    const endDate = new Date(data.travelEndDate);
    const now = new Date();
    if (endDate < now) {
      dealStatus = 'EXPIRED';
    }
  }

  // Create deal
  const deal = await prisma.travelDeal.create({
    data: {
      title: data.title,
      description: data.description,
      price: parseFloat(data.price),
      discount: data.discount ? parseFloat(data.discount) : null,
      destination: data.destination,
      airport: data.airport,
      dealImage: data.dealImage || null,
      travelStartDate: data.travelStartDate ? new Date(data.travelStartDate) : null,
      travelEndDate: data.travelEndDate ? new Date(data.travelEndDate) : null,
      flightBookingLink: data.flightBookingLink || null,
      hotelBookingLink: data.hotelBookingLink || null,
      status: dealStatus,
      isFeatured: data.isFeatured === true || data.isFeatured === 'true',
    },
  });

  return deal;
};

/**
 * Update travel deal
 */
export const updateDeal = async (id, data) => {
  // Check if deal exists
  const existingDeal = await prisma.travelDeal.findUnique({
    where: { id },
  });

  if (!existingDeal) {
    throw new ApiError(404, 'Travel deal not found');
  }

  // Prepare update data
  const updateData = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) {
    if (data.price < 0) {
      throw new ApiError(400, 'Price must be a positive number');
    }
    updateData.price = parseFloat(data.price);
  }
  if (data.discount !== undefined) {
    if (data.discount !== null && (data.discount < 0 || data.discount > 100)) {
      throw new ApiError(400, 'Discount must be between 0 and 100');
    }
    updateData.discount = data.discount ? parseFloat(data.discount) : null;
  }
  if (data.destination !== undefined) updateData.destination = data.destination;
  if (data.airport !== undefined) updateData.airport = data.airport;
  if (data.dealImage !== undefined) updateData.dealImage = data.dealImage;
  if (data.travelStartDate !== undefined) {
    updateData.travelStartDate = data.travelStartDate ? new Date(data.travelStartDate) : null;
  }
  if (data.travelEndDate !== undefined) {
    updateData.travelEndDate = data.travelEndDate ? new Date(data.travelEndDate) : null;
  }
  if (data.flightBookingLink !== undefined) updateData.flightBookingLink = data.flightBookingLink;
  if (data.hotelBookingLink !== undefined) updateData.hotelBookingLink = data.hotelBookingLink;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.isFeatured !== undefined) {
    updateData.isFeatured = data.isFeatured === true || data.isFeatured === 'true';
  }

  // Validate dates if both are being updated
  if (updateData.travelStartDate && updateData.travelEndDate) {
    if (updateData.travelEndDate < updateData.travelStartDate) {
      throw new ApiError(400, 'Travel end date must be after start date');
    }
  }

  // Auto-update status based on travelEndDate
  const finalEndDate = updateData.travelEndDate !== undefined 
    ? updateData.travelEndDate 
    : existingDeal.travelEndDate;
    
  if (finalEndDate && data.status === undefined) {
    const now = new Date();
    if (finalEndDate < now) {
      updateData.status = 'EXPIRED';
    }
  }

  // Update deal
  const updatedDeal = await prisma.travelDeal.update({
    where: { id },
    data: updateData,
  });

  return updatedDeal;
};

/**
 * Delete travel deal
 */
export const deleteDeal = async (id) => {
  // Check if deal exists
  const existingDeal = await prisma.travelDeal.findUnique({
    where: { id },
  });

  if (!existingDeal) {
    throw new ApiError(404, 'Travel deal not found');
  }

  // Delete deal
  await prisma.travelDeal.delete({
    where: { id },
  });

  return { message: 'Travel deal deleted successfully' };
};

/**
 * Update deal status (ACTIVE/EXPIRED)
 */
export const updateDealStatus = async (id, status) => {
  if (!['ACTIVE', 'EXPIRED'].includes(status)) {
    throw new ApiError(400, 'Invalid status. Must be ACTIVE or EXPIRED');
  }

  const deal = await prisma.travelDeal.update({
    where: { id },
    data: { status },
  });

  return deal;
};

/**
 * Toggle featured status
 */
export const toggleFeatured = async (id) => {
  const deal = await getDealById(id);

  const updatedDeal = await prisma.travelDeal.update({
    where: { id },
    data: { isFeatured: !deal.isFeatured },
  });

  return updatedDeal;
};
