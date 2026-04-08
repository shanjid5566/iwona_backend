import PDFDocument from 'pdfkit';
import * as userService from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Get current user profile
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  
  res.status(200).json(
    ApiResponse.success('User profile retrieved successfully', { user })
  );
});

/**
 * Update current user profile
 */
const updateMe = asyncHandler(async (req, res) => {
  const { firstName, lastName, currentPassword, newPassword } = req.body;
  
  // Build update data object
  const updateData = {
    currentPassword,
    newPassword,
  };
  
  // Add optional fields if provided
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  
  const updatedUser = await userService.updateUser(req.user.id, updateData);
  
  res.status(200).json(
    ApiResponse.success('User profile updated successfully', { user: updatedUser })
  );
});

/**
 * Update user home airport
 */
const updateHomeAirport = asyncHandler(async (req, res) => {
  const { homeAirport } = req.body;
  
  const updatedUser = await userService.updateHomeAirport(req.user.id, homeAirport);
  
  res.status(200).json(
    ApiResponse.success('Home airport updated successfully', { user: updatedUser })
  );
});

/**
 * Delete current user account
 */
const deleteMe = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.user.id);
  
  res.status(200).json(
    ApiResponse.success('User account deleted successfully')
  );
});

/**
 * Get all users (Admin)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, status, sortBy, sortOrder } = req.query;
  
  const result = await userService.getAllUsers({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    search,
    status,
    sortBy,
    sortOrder,
  });
  
  res.status(200).json(
    ApiResponse.success('Users retrieved successfully', result)
  );
});

/**
 * Get user by ID (Admin)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  
  res.status(200).json(
    ApiResponse.success('User retrieved successfully', { user })
  );
});

/**
 * Update user by ID (Admin)
 */
const updateUserById = asyncHandler(async (req, res) => {
  const { firstName, lastName, homeAirport, status, role } = req.body;
  
  const updateData = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (homeAirport !== undefined) updateData.homeAirport = homeAirport;
  if (status !== undefined) updateData.status = status;
  if (role !== undefined) updateData.role = role;
  
  const updatedUser = await userService.updateUserByAdmin(req.params.id, updateData);
  
  res.status(200).json(
    ApiResponse.success('User updated successfully', { user: updatedUser })
  );
});

/**
 * Delete user by ID (Admin)
 */
const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  
  res.status(200).json(
    ApiResponse.success('User deleted successfully')
  );
});

/**
 * Export all members as PDF (Admin)
 */
const exportMembersPdf = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsersForExport();

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="members.pdf"');
  doc.pipe(res);

  // Title
  doc.fontSize(18).font('Helvetica-Bold').text('Members Report', { align: 'center' });
  doc.fontSize(10).font('Helvetica').fillColor('#666')
    .text(`Generated: ${new Date().toLocaleDateString('en-US')}  |  Total Members: ${users.length}`, { align: 'center' });
  doc.moveDown(1);

  // Column config
  const cols = [
    { label: 'Full Name',   width: 150 },
    { label: 'Email',       width: 210 },
    { label: 'Airport',     width: 70  },
    { label: 'Role',        width: 70  },
    { label: 'Status',      width: 70  },
    { label: 'Joined',      width: 90  },
  ];

  const tableTop = doc.y;
  let x = 40;

  // Header row
  doc.fillColor('#4a5568').fontSize(9).font('Helvetica-Bold');
  cols.forEach(col => {
    doc.text(col.label, x, tableTop, { width: col.width, align: 'left' });
    x += col.width;
  });

  doc.moveTo(40, tableTop + 14).lineTo(40 + cols.reduce((s, c) => s + c.width, 0), tableTop + 14)
    .strokeColor('#cbd5e0').stroke();

  // Rows
  let y = tableTop + 20;
  doc.font('Helvetica').fontSize(8).fillColor('#2d3748');

  users.forEach((user, i) => {
    if (y > 530) {
      doc.addPage();
      y = 40;
    }

    if (i % 2 === 0) {
      doc.rect(40, y - 3, cols.reduce((s, c) => s + c.width, 0), 16)
        .fill('#f7fafc').fillColor('#2d3748');
    }

    const row = [
      user.fullName || '-',
      user.email,
      user.homeAirport || 'N/A',
      user.role,
      user.status,
      new Date(user.createdAt).toLocaleDateString('en-US'),
    ];

    x = 40;
    row.forEach((val, idx) => {
      doc.text(val, x, y, { width: cols[idx].width, ellipsis: true });
      x += cols[idx].width;
    });

    y += 18;
  });

  doc.end();
});

export { getMe, updateMe, updateHomeAirport, getAllUsers, getUserById, updateUserById, deleteUser, exportMembersPdf };
