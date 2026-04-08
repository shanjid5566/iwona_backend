import prisma from '../config/database.js';
import { ApiError } from '../utils/apiError.js';
import config from '../config/index.js';

/**
 * Auto-update giveaway statuses based on dates
 * UPCOMING: startDate > now
 * ACTIVE: startDate <= now && endDate >= now
 * EXPIRED: endDate < now
 * Note: DRAFT status is manual and won't be auto-updated
 */
const autoUpdateGiveawayStatuses = async () => {
  const now = new Date();

  // Update to EXPIRED (endDate has passed)
  await prisma.giveaway.updateMany({
    where: {
      status: { in: ['ACTIVE', 'UPCOMING'] },
      endDate: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });

  // Update to ACTIVE (between start and end date)
  await prisma.giveaway.updateMany({
    where: {
      status: 'UPCOMING',
      startDate: { lte: now },
      endDate: { gte: now },
    },
    data: { status: 'ACTIVE' },
  });

  // Update to UPCOMING (start date is in the future)
  await prisma.giveaway.updateMany({
    where: {
      status: { not: 'DRAFT' },
      startDate: { gt: now },
    },
    data: { status: 'UPCOMING' },
  });
};

/**
 * Get all giveaways with pagination, filtering, and search
 */
export const getAllGiveaways = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Auto-update statuses before fetching
  await autoUpdateGiveawayStatuses();

  // Validate and limit page size
  const validLimit = Math.min(limit, config.maxPageSize || 50);
  const skip = (page - 1) * validLimit;

  // Build filter conditions
  const where = {};

  // Search in title or description
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter by status
  if (status) {
    const statusUpper = status.toUpperCase();
    if (['DRAFT', 'UPCOMING', 'ACTIVE', 'EXPIRED'].includes(statusUpper)) {
      where.status = statusUpper;
    }
  }

  // Build orderBy
  const orderBy = {};
  orderBy[sortBy] = sortOrder.toLowerCase();

  // Fetch giveaways with pagination
  const [giveaways, total] = await Promise.all([
    prisma.giveaway.findMany({
      where,
      skip,
      take: validLimit,
      orderBy,
      include: {
        _count: {
          select: { entries: true },
        },
      },
    }),
    prisma.giveaway.count({ where }),
  ]);

  return {
    giveaways,
    pagination: {
      total,
      page,
      limit: validLimit,
      totalPages: Math.ceil(total / validLimit),
    },
  };
};

/**
 * Get giveaway by ID
 */
export const getGiveawayById = async (id) => {
  // Auto-update statuses before fetching
  await autoUpdateGiveawayStatuses();

  const giveaway = await prisma.giveaway.findUnique({
    where: { id },
    include: {
      _count: {
        select: { entries: true },
      },
    },
  });

  if (!giveaway) {
    throw new ApiError(404, 'Giveaway not found');
  }

  return giveaway;
};

/**
 * Get currently active giveaway (Public API)
 * Returns the first active giveaway found
 */
export const getActiveGiveaway = async () => {
  // Auto-update statuses before fetching
  await autoUpdateGiveawayStatuses();

  const giveaway = await prisma.giveaway.findFirst({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      startDate: 'desc', // Get the most recently started active giveaway
    },
    include: {
      _count: {
        select: { entries: true },
      },
    },
  });

  // Return null if no active giveaway (don't throw error for public API)
  return giveaway;
};

/**
 * Create new giveaway
 */
export const createGiveaway = async (data) => {
  const {
    title,
    description,
    giveawayImage,
    startDate,
    endDate,
    isMonthlyActive = false,
  } = data;

  // Validate required fields
  if (!title || !description || !startDate || !endDate) {
    throw new ApiError(
      400,
      'Title, description, start date, and end date are required'
    );
  }

  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Validate dates
  if (end < start) {
    throw new ApiError(400, 'End date must be after start date');
  }

  // Auto-determine status based on dates
  let giveawayStatus = 'DRAFT';
  if (start > now) {
    giveawayStatus = 'UPCOMING';
  } else if (start <= now && end >= now) {
    giveawayStatus = 'ACTIVE';
  } else if (end < now) {
    giveawayStatus = 'EXPIRED';
  }

  // Prevent more than one giveaway overlapping the same month
  // Determine the month window for the provided start date
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const nextMonthStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  // Check for any existing giveaway that overlaps this month window
  const overlapping = await prisma.giveaway.findFirst({
    where: {
      AND: [
        {
          // existing.startDate < nextMonthStart
          startDate: { lt: nextMonthStart },
        },
        {
          // existing.endDate >= monthStart
          endDate: { gte: monthStart },
        },
      ],
    },
  });

  if (overlapping) {
    throw new ApiError(400, 'Only one giveaway is allowed per month. A giveaway already exists in this month.');
  }

  // Create giveaway
  const giveaway = await prisma.giveaway.create({
    data: {
      title,
      description,
      giveawayImage: giveawayImage || null,
      startDate: start,
      endDate: end,
      isMonthlyActive,
      status: giveawayStatus,
    },
  });

  return giveaway;
};

/**
 * Update giveaway
 */
export const updateGiveaway = async (id, data) => {
  // Check if giveaway exists
  const existingGiveaway = await prisma.giveaway.findUnique({
    where: { id },
  });

  if (!existingGiveaway) {
    throw new ApiError(404, 'Giveaway not found');
  }

  // Build update object
  const updateData = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.giveawayImage !== undefined)
    updateData.giveawayImage = data.giveawayImage;
  if (data.isMonthlyActive !== undefined)
    updateData.isMonthlyActive = data.isMonthlyActive;

  // Handle date updates
  if (data.startDate !== undefined) {
    updateData.startDate = new Date(data.startDate);
  }
  if (data.endDate !== undefined) {
    updateData.endDate = new Date(data.endDate);
  }

  // Validate dates if both are being updated
  if (updateData.startDate && updateData.endDate) {
    if (updateData.endDate < updateData.startDate) {
      throw new ApiError(400, 'End date must be after start date');
    }
  }

  // Auto-update status based on dates (if not manually setting to DRAFT)
  if (data.status !== 'DRAFT') {
    const finalStartDate =
      updateData.startDate !== undefined
        ? updateData.startDate
        : existingGiveaway.startDate;
    const finalEndDate =
      updateData.endDate !== undefined
        ? updateData.endDate
        : existingGiveaway.endDate;

    const now = new Date();
    if (finalStartDate > now) {
      updateData.status = 'UPCOMING';
    } else if (finalStartDate <= now && finalEndDate >= now) {
      updateData.status = 'ACTIVE';
    } else if (finalEndDate < now) {
      updateData.status = 'EXPIRED';
    }
  } else if (data.status === 'DRAFT') {
    updateData.status = 'DRAFT';
  }

  // Update giveaway
  const updatedGiveaway = await prisma.giveaway.update({
    where: { id },
    data: updateData,
  });

  return updatedGiveaway;
};

/**
 * Delete giveaway
 */
export const deleteGiveaway = async (id) => {
  const giveaway = await prisma.giveaway.findUnique({
    where: { id },
  });

  if (!giveaway) {
    throw new ApiError(404, 'Giveaway not found');
  }

  await prisma.giveaway.delete({
    where: { id },
  });
};

/**
 * Get all entries for a giveaway
 */
export const getGiveawayEntries = async (giveawayId, options = {}) => {
  const { page = 1, limit = 50 } = options;

  // Check if giveaway exists
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
  });

  if (!giveaway) {
    throw new ApiError(404, 'Giveaway not found');
  }

  const validLimit = Math.min(limit, 100);
  const skip = (page - 1) * validLimit;

  // Fetch entries with user details
  const [entries, total] = await Promise.all([
    prisma.giveawayEntry.findMany({
      where: { giveawayId },
      skip,
      take: validLimit,
      orderBy: { enteredAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
      },
    }),
    prisma.giveawayEntry.count({ where: { giveawayId } }),
  ]);

  return {
    entries,
    pagination: {
      total,
      page,
      limit: validLimit,
      totalPages: Math.ceil(total / validLimit),
    },
  };
};

/**
 * User enters a giveaway (participate)
 */
export const enterGiveaway = async (giveawayId, userId) => {
  // Check if giveaway exists
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
  });

  if (!giveaway) {
    throw new ApiError(404, 'Giveaway not found');
  }

  // Check if giveaway is active
  if (giveaway.status !== 'ACTIVE') {
    throw new ApiError(400, `Cannot enter ${giveaway.status.toLowerCase()} giveaway`);
  }

  // Check if user already entered
  const existingEntry = await prisma.giveawayEntry.findUnique({
    where: {
      giveawayId_userId: {
        giveawayId,
        userId,
      },
    },
  });

  if (existingEntry) {
    throw new ApiError(400, 'You have already entered this giveaway');
  }

  // Create entry
  const entry = await prisma.giveawayEntry.create({
    data: {
      giveawayId,
      userId,
    },
    include: {
      giveaway: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  return entry;
};

/**
 * Check user's entry status for the active giveaway
 */
export const checkUserGiveawayStatus = async (userId) => {
  // Auto-update statuses before fetching
  await autoUpdateGiveawayStatuses();

  // Get active giveaway
  const giveaway = await prisma.giveaway.findFirst({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      startDate: 'desc',
    },
    include: {
      _count: {
        select: { entries: true },
      },
    },
  });

  // If no active giveaway
  if (!giveaway) {
    return {
      giveaway: null,
      hasEntered: false,
      entryCount: 0,
    };
  }

  // Check if user has entered
  const userEntry = await prisma.giveawayEntry.findUnique({
    where: {
      giveawayId_userId: {
        giveawayId: giveaway.id,
        userId,
      },
    },
    select: {
      enteredAt: true,
    },
  });

  return {
    giveaway,
    hasEntered: !!userEntry,
    entryCount: giveaway._count.entries,
    userEnteredAt: userEntry?.enteredAt || null,
  };
};
