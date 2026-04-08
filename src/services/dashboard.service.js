import prisma from '../config/database.js';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  // Get total members (users with role USER)
  const totalMembers = await prisma.user.count({
    where: {
      role: 'USER',
    },
  });

  // Get active deals count
  const activeDeals = await prisma.travelDeal.count({
    where: {
      status: 'ACTIVE',
    },
  });

  // Get current active giveaways count
  const currentGiveaways = await prisma.giveaway.count({
    where: {
      status: 'ACTIVE',
    },
  });

  // Get recent sign-ups (last 5 users)
  const recentSignups = await prisma.user.findMany({
    where: {
      role: 'USER',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      createdAt: true,
    },
  });

  return {
    totalMembers,
    activeDeals,
    currentGiveaways,
    recentSignups,
  };
};
