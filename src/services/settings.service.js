import prisma from '../config/database.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Get website settings
 */
export const getSettings = async () => {
  let settings = await prisma.settings.findUnique({
    where: { id: 1 },
  });

  // If settings don't exist, create default settings
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 1,
        websiteName: 'Travel in a Click',
        contactEmail: 'contact@travelinaclick.com',
        defaultHomeAirport: 'DAC',
        aboutUsText:
          'Travel in a Click is a members only travel subscription with monthly giveaways, exclusive guides and personalised offers from your local airport.',
        requireEmailConfirm: true,
        allowPublicReg: true,
      },
    });
  }

  return settings;
};

/**
 * Update website settings
 */
export const updateSettings = async (data) => {
  const {
    websiteName,
    contactEmail,
    defaultHomeAirport,
    aboutUsText,
    requireEmailConfirm,
    allowPublicReg,
  } = data;

  // Validate required fields
  if (!websiteName || !contactEmail || !defaultHomeAirport || !aboutUsText) {
    throw new ApiError(
      400,
      'Website name, contact email, default home airport, and about us text are required'
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contactEmail)) {
    throw new ApiError(400, 'Invalid email format');
  }

  // Build update object
  const updateData = {
    websiteName,
    contactEmail,
    defaultHomeAirport,
    aboutUsText,
  };

  // Handle boolean fields
  if (requireEmailConfirm !== undefined) {
    updateData.requireEmailConfirm =
      requireEmailConfirm === true || requireEmailConfirm === 'true';
  }

  if (allowPublicReg !== undefined) {
    updateData.allowPublicReg =
      allowPublicReg === true || allowPublicReg === 'true';
  }

  // Upsert settings (update if exists, create if not)
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: updateData,
    create: {
      id: 1,
      ...updateData,
    },
  });

  return settings;
};
