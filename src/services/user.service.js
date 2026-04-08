import prisma from '../config/database.js';
import { ApiError } from '../utils/apiError.js';
import config from '../config/index.js';
import bcrypt from 'bcryptjs';

/**
 * Get user by ID
 */
const getUserById = async (id) => {

  
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      role: true,
      homeAirport: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  return user;
};

/**
 * Update user
 */
const updateUser = async (id, data) => {
  const { currentPassword, newPassword, ...updateData } = data;
  
  // Get user with password for verification
  const user = await prisma.user.findUnique({
    where: { id },
  });
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  // If password change is requested, verify current password and set new password
  if (currentPassword !== undefined || newPassword !== undefined) {
    // Both currentPassword and newPassword must be provided to change password
    if (!currentPassword) {
      throw new ApiError(400, 'Current password is required to change password');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    if (!newPassword) {
      throw new ApiError(400, 'New password is required');
    }

    // NOTE: password strength validation intentionally omitted per request
    updateData.password = await bcrypt.hash(newPassword, 10);
  }
  
  // Update fullName if firstName or lastName changed
  if (updateData.firstName || updateData.lastName) {
    const firstName = updateData.firstName || user.firstName;
    const lastName = updateData.lastName || user.lastName;
    updateData.fullName = `${firstName} ${lastName}`.trim();
  }
  
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      role: true,
      homeAirport: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  return updatedUser;
};

/**
 * Update user home airport
 */
const updateHomeAirport = async (id, homeAirport) => {
  if (!homeAirport || homeAirport.trim() === '') {
    throw new ApiError(400, 'Home airport is required');
  }
  
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { homeAirport },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      role: true,
      homeAirport: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  return updatedUser;
};

/**
 * Update user by admin (no password verification required)
 */
const updateUserByAdmin = async (id, data) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
  });
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  // Update fullName if firstName or lastName changed
  if (data.firstName || data.lastName) {
    const firstName = data.firstName || user.firstName;
    const lastName = data.lastName || user.lastName;
    data.fullName = `${firstName} ${lastName}`.trim();
  }
  
  const updatedUser = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      role: true,
      homeAirport: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  return updatedUser;
};

/**
 * Delete user
 */
const deleteUser = async (id) => {
  // Check if user exists
  await getUserById(id);
  
  await prisma.user.delete({
    where: { id },
  });
  
  return true;
};

/**
 * Get all users with pagination, filtering, and sorting
 */
const getAllUsers = async ({ page, limit, search, status, sortBy, sortOrder }) => {
  const take = Math.min(limit, config.maxPageSize);
  const skip = (page - 1) * take;
  
  // Build where clause
  const where = {};
  
  // Add search filter
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  // Add status filter
  if (status) {
    where.status = status.toUpperCase();
  }
  
  // Build orderBy clause
  const orderBy = sortBy
    ? { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }
    : { createdAt: 'desc' };
  
  // Execute queries in parallel
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        fullName: true,
        role: true,
        homeAirport: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
  
  return {
    users,
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
 * Get all users for PDF export (no pagination)
 */
const getAllUsersForExport = async () => {
  return prisma.user.findMany({
    select: {
      fullName: true,
      email: true,
      homeAirport: true,
      status: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export { getUserById, updateUser, updateHomeAirport, updateUserByAdmin, deleteUser, getAllUsers, getAllUsersForExport };
