import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool } = pg;

// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma Client
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('Iwonaiwona22', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'iwona.05.11@hotmail.com' },
    update: {},
    create: {
      email: 'iwona.05.11@hotmail.com',
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      homeAirport: 'DAC',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create Test User
  const userPassword = await bcrypt.hash('user123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      firstName: 'Demo',
      lastName: 'User',
      fullName: 'Demo User',
      password: userPassword,
      role: 'USER',
      status: 'ACTIVE',
      isEmailVerified: true,
      homeAirport: 'CGP',
    },
  });

  console.log('✅ Test user created:', user.email);

  // ===== CREATE USERS WITH SUBSCRIPTIONS FOR TESTING =====

  // 1. User with EXPIRED regular subscription (expired 2 months ago)
  const expiredUserPassword = await bcrypt.hash('expired123', 12);
  const expiredUser = await prisma.user.upsert({
    where: { email: 'expired@example.com' },
    update: {},
    create: {
      email: 'expired@example.com',
      firstName: 'Expired',
      lastName: 'User',
      fullName: 'Expired User',
      password: expiredUserPassword,
      role: 'USER',
      status: 'INACTIVE', // Marked as inactive due to expired subscription
      isEmailVerified: true,
      homeAirport: 'DUB',
    },
  });

  // Create expired subscription (ended 2 months ago)
  const expiredSubStartDate = new Date();
  expiredSubStartDate.setMonth(expiredSubStartDate.getMonth() - 14); // Started 14 months ago
  
  const expiredSubEndDate = new Date();
  expiredSubEndDate.setMonth(expiredSubEndDate.getMonth() - 2); // Ended 2 months ago

  await prisma.subscription.upsert({
    where: { stripeSubId: 'sub_test_expired_001' },
    update: {
      userId: expiredUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: expiredSubStartDate,
      endDate: expiredSubEndDate,
      isActive: false,
      isExpired: true,
      isRenewed: false,
      isGifted: false,
    },
    create: {
      userId: expiredUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: expiredSubStartDate,
      endDate: expiredSubEndDate,
      isActive: false,
      isExpired: true,
      isRenewed: false,
      stripeSubId: 'sub_test_expired_001',
      isGifted: false,
    },
  });

  console.log('✅ Expired user created:', expiredUser.email);

  // 2. User with EXPIRED gift subscription (expired 1 month ago, reminder was sent)
  const expiredGiftUserPassword = await bcrypt.hash('giftexpired123', 12);
  const expiredGiftUser = await prisma.user.upsert({
    where: { email: 'giftexpired@example.com' },
    update: {},
    create: {
      email: 'giftexpired@example.com',
      firstName: 'GiftExpired',
      lastName: 'User',
      fullName: 'GiftExpired User',
      password: expiredGiftUserPassword,
      role: 'USER',
      status: 'INACTIVE',
      isEmailVerified: true,
      homeAirport: 'ORK',
    },
  });

  const expiredGiftStartDate = new Date();
  expiredGiftStartDate.setMonth(expiredGiftStartDate.getMonth() - 13);
  
  const expiredGiftEndDate = new Date();
  expiredGiftEndDate.setMonth(expiredGiftEndDate.getMonth() - 1); // Ended 1 month ago

  const reminderDate = new Date(expiredGiftEndDate);
  reminderDate.setDate(reminderDate.getDate() - 30); // Reminder sent 1 month before expiry

  await prisma.subscription.upsert({
    where: { stripeSubId: 'sub_test_gift_expired_001' },
    update: {
      userId: expiredGiftUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: expiredGiftStartDate,
      endDate: expiredGiftEndDate,
      isActive: false,
      isExpired: true,
      isRenewed: false,
      isGifted: true,
      giftedBy: admin.id,
      reminderSent: true,
      reminderSentAt: reminderDate,
    },
    create: {
      userId: expiredGiftUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: expiredGiftStartDate,
      endDate: expiredGiftEndDate,
      isActive: false,
      isExpired: true,
      isRenewed: false,
      stripeSubId: 'sub_test_gift_expired_001',
      isGifted: true,
      giftedBy: admin.id,
      reminderSent: true,
      reminderSentAt: reminderDate,
    },
  });

  console.log('✅ Expired gift user created:', expiredGiftUser.email);

  // 3. User with ACTIVE subscription (for comparison)
  const activeUserPassword = await bcrypt.hash('active123', 12);
  const activeUser = await prisma.user.upsert({
    where: { email: 'active@example.com' },
    update: {},
    create: {
      email: 'active@example.com',
      firstName: 'Active',
      lastName: 'User',
      fullName: 'Active User',
      password: activeUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      isEmailVerified: true,
      homeAirport: 'LHR',
    },
  });

  const activeSubStartDate = new Date();
  activeSubStartDate.setMonth(activeSubStartDate.getMonth() - 2); // Started 2 months ago
  
  const activeSubEndDate = new Date();
  activeSubEndDate.setMonth(activeSubEndDate.getMonth() + 10); // Ends in 10 months

  await prisma.subscription.upsert({
    where: { stripeSubId: 'sub_test_active_001' },
    update: {
      userId: activeUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: activeSubStartDate,
      endDate: activeSubEndDate,
      isActive: true,
      isExpired: false,
      isRenewed: false,
      isGifted: false,
    },
    create: {
      userId: activeUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: activeSubStartDate,
      endDate: activeSubEndDate,
      isActive: true,
      isExpired: false,
      isRenewed: false,
      stripeSubId: 'sub_test_active_001',
      isGifted: false,
    },
  });

  console.log('✅ Active user created:', activeUser.email);

  // 4. User who RENEWED after expiry (has both expired and active subscriptions)
  const renewedUserPassword = await bcrypt.hash('renewed123', 12);
  const renewedUser = await prisma.user.upsert({
    where: { email: 'renewed@example.com' },
    update: {},
    create: {
      email: 'renewed@example.com',
      firstName: 'Renewed',
      lastName: 'User',
      fullName: 'Renewed User',
      password: renewedUserPassword,
      role: 'USER',
      status: 'ACTIVE',
      isEmailVerified: true,
      homeAirport: 'SNN',
    },
  });

  // Old expired subscription
  const oldSubStartDate = new Date();
  oldSubStartDate.setMonth(oldSubStartDate.getMonth() - 16);
  
  const oldSubEndDate = new Date();
  oldSubEndDate.setMonth(oldSubEndDate.getMonth() - 4); // Expired 4 months ago

  await prisma.subscription.upsert({
    where: { stripeSubId: 'sub_test_renewed_old_001' },
    update: {
      userId: renewedUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: oldSubStartDate,
      endDate: oldSubEndDate,
      isActive: false,
      isExpired: true,
      isRenewed: true,
      isGifted: false,
    },
    create: {
      userId: renewedUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: oldSubStartDate,
      endDate: oldSubEndDate,
      isActive: false,
      isExpired: true,
      isRenewed: true,
      stripeSubId: 'sub_test_renewed_old_001',
      isGifted: false,
    },
  });

  // New active subscription after renewal
  const newSubStartDate = new Date();
  newSubStartDate.setMonth(newSubStartDate.getMonth() - 1); // Started 1 month ago
  
  const newSubEndDate = new Date();
  newSubEndDate.setMonth(newSubEndDate.getMonth() + 11); // Ends in 11 months

  await prisma.subscription.upsert({
    where: { stripeSubId: 'sub_test_renewed_new_001' },
    update: {
      userId: renewedUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: newSubStartDate,
      endDate: newSubEndDate,
      isActive: true,
      isExpired: false,
      isRenewed: false,
      isGifted: false,
    },
    create: {
      userId: renewedUser.id,
      planName: 'Annual Membership',
      amount: 9.99,
      startDate: newSubStartDate,
      endDate: newSubEndDate,
      isActive: true,
      isExpired: false,
      isRenewed: false,
      stripeSubId: 'sub_test_renewed_new_001',
      isGifted: false,
    },
  });

  console.log('✅ Renewed user created:', renewedUser.email);

  console.log('\n📋 Login Credentials:');
  console.log('Admin:          iwona.05.11@hotmail.com / Iwonaiwona22');
  console.log('User:           user@example.com / user123');
  console.log('Expired User:   expired@example.com / expired123');
  console.log('Gift Expired:   giftexpired@example.com / giftexpired123');
  console.log('Active User:    active@example.com / active123');
  console.log('Renewed User:   renewed@example.com / renewed123');

  // Refresh portfolio content on every run to keep seed deterministic.
  await prisma.giveawayEntry.deleteMany();
  await prisma.giveaway.deleteMany();
  await prisma.travelDeal.deleteMany();
  await prisma.travelGuide.deleteMany();

  const now = new Date();

  const expiredDealStart = new Date(now);
  expiredDealStart.setMonth(expiredDealStart.getMonth() - 3);
  const expiredDealEnd = new Date(now);
  expiredDealEnd.setMonth(expiredDealEnd.getMonth() - 2);

  const springDealStart = new Date(now);
  springDealStart.setMonth(springDealStart.getMonth() + 1);
  const springDealEnd = new Date(now);
  springDealEnd.setMonth(springDealEnd.getMonth() + 2);

  const summerDealStart = new Date(now);
  summerDealStart.setMonth(summerDealStart.getMonth() + 2);
  const summerDealEnd = new Date(now);
  summerDealEnd.setMonth(summerDealEnd.getMonth() + 4);

  const shortBreakStart = new Date(now);
  shortBreakStart.setDate(shortBreakStart.getDate() + 20);
  const shortBreakEnd = new Date(now);
  shortBreakEnd.setDate(shortBreakEnd.getDate() + 26);

  const nordicDealStart = new Date(now);
  nordicDealStart.setMonth(nordicDealStart.getMonth() + 1);
  nordicDealStart.setDate(nordicDealStart.getDate() + 10);
  const nordicDealEnd = new Date(now);
  nordicDealEnd.setMonth(nordicDealEnd.getMonth() + 2);
  nordicDealEnd.setDate(nordicDealEnd.getDate() + 5);

  const japanDealStart = new Date(now);
  japanDealStart.setMonth(japanDealStart.getMonth() + 3);
  const japanDealEnd = new Date(now);
  japanDealEnd.setMonth(japanDealEnd.getMonth() + 4);
  japanDealEnd.setDate(japanDealEnd.getDate() + 10);

  const dubaiDealStart = new Date(now);
  dubaiDealStart.setDate(dubaiDealStart.getDate() + 35);
  const dubaiDealEnd = new Date(now);
  dubaiDealEnd.setDate(dubaiDealEnd.getDate() + 41);

  const kenyaDealStart = new Date(now);
  kenyaDealStart.setMonth(kenyaDealStart.getMonth() + 2);
  kenyaDealStart.setDate(kenyaDealStart.getDate() + 7);
  const kenyaDealEnd = new Date(now);
  kenyaDealEnd.setMonth(kenyaDealEnd.getMonth() + 3);
  kenyaDealEnd.setDate(kenyaDealEnd.getDate() + 2);

  const baliDealStart = new Date(now);
  baliDealStart.setMonth(baliDealStart.getMonth() + 4);
  const baliDealEnd = new Date(now);
  baliDealEnd.setMonth(baliDealEnd.getMonth() + 5);

  await prisma.travelDeal.createMany({
    data: [
      {
        title: 'Lisbon Spring Escape with Old Town Hotel',
        description:
          'Round-trip fare plus 4 nights in central Lisbon. Includes airport transfer, breakfast, and a 24-hour public transport pass for easy sightseeing.',
        price: 549.0,
        discount: 22,
        destination: 'Lisbon, Portugal',
        airport: 'DUB',
        dealImage: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8',
        travelStartDate: springDealStart,
        travelEndDate: springDealEnd,
        flightBookingLink: 'https://www.skyscanner.net',
        hotelBookingLink: 'https://www.booking.com',
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        title: 'Bangkok and Chiang Mai Cultural Journey',
        description:
          'A two-city Thailand package with internal flight included. Perfect for first-time visitors who want temples, street food, and mountain views in one itinerary.',
        price: 899.0,
        discount: 18,
        destination: 'Bangkok and Chiang Mai, Thailand',
        airport: 'DAC',
        dealImage: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365',
        travelStartDate: summerDealStart,
        travelEndDate: summerDealEnd,
        flightBookingLink: 'https://www.qatarairways.com',
        hotelBookingLink: 'https://www.agoda.com',
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        title: 'Istanbul Weekend City Break',
        description:
          'A compact and affordable city break with handpicked boutique accommodation near Sultanahmet and discounted Bosphorus night cruise access.',
        price: 399.0,
        discount: 15,
        destination: 'Istanbul, Turkiye',
        airport: 'CGP',
        dealImage: 'https://images.unsplash.com/photo-1527838832700-5059252407fa',
        travelStartDate: shortBreakStart,
        travelEndDate: shortBreakEnd,
        flightBookingLink: 'https://www.turkishairlines.com',
        hotelBookingLink: 'https://www.hotels.com',
        status: 'ACTIVE',
        isFeatured: false,
      },
      {
        title: 'Paris Autumn Offer - Last Season Campaign',
        description:
          'A previous seasonal deal kept for portfolio history. Includes flights and a Left Bank hotel, now marked expired for realistic timeline data.',
        price: 629.0,
        discount: 30,
        destination: 'Paris, France',
        airport: 'LHR',
        dealImage: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a',
        travelStartDate: expiredDealStart,
        travelEndDate: expiredDealEnd,
        flightBookingLink: 'https://www.britishairways.com',
        hotelBookingLink: 'https://www.accor.com',
        status: 'EXPIRED',
        isFeatured: false,
      },
      {
        title: 'Reykjavik Northern Lights and Lagoon Package',
        description:
          'Winter-ready Iceland package with direct return flights, 3 nights in Reykjavik, Blue Lagoon comfort entry, and optional Northern Lights coach tour.',
        price: 979.0,
        discount: 14,
        destination: 'Reykjavik, Iceland',
        airport: 'DUB',
        dealImage: 'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b',
        travelStartDate: nordicDealStart,
        travelEndDate: nordicDealEnd,
        flightBookingLink: 'https://www.icelandair.com',
        hotelBookingLink: 'https://www.booking.com',
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        title: 'Tokyo and Kyoto Rail Explorer',
        description:
          'A curated Japan route for food and culture lovers including airport transfer card, intercity bullet train segment, and centrally located hotels.',
        price: 1399.0,
        discount: 12,
        destination: 'Tokyo and Kyoto, Japan',
        airport: 'LHR',
        dealImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
        travelStartDate: japanDealStart,
        travelEndDate: japanDealEnd,
        flightBookingLink: 'https://www.jal.co.jp',
        hotelBookingLink: 'https://www.expedia.com',
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        title: 'Dubai Luxury Stopover Special',
        description:
          'A premium short stay with skyline-view room, desert safari with dinner, and airport pickup ideal for a celebratory long weekend.',
        price: 699.0,
        discount: 20,
        destination: 'Dubai, UAE',
        airport: 'DAC',
        dealImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
        travelStartDate: dubaiDealStart,
        travelEndDate: dubaiDealEnd,
        flightBookingLink: 'https://www.emirates.com',
        hotelBookingLink: 'https://www.marriott.com',
        status: 'ACTIVE',
        isFeatured: false,
      },
      {
        title: 'Nairobi and Maasai Mara Safari Week',
        description:
          'Includes domestic transfer, guided game drives, and full-board safari lodge stay. Built for first-time East Africa wildlife experiences.',
        price: 1749.0,
        discount: 10,
        destination: 'Nairobi and Maasai Mara, Kenya',
        airport: 'LHR',
        dealImage: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e',
        travelStartDate: kenyaDealStart,
        travelEndDate: kenyaDealEnd,
        flightBookingLink: 'https://www.kenya-airways.com',
        hotelBookingLink: 'https://www.safaribookings.com',
        status: 'ACTIVE',
        isFeatured: false,
      },
      {
        title: 'Bali Wellness and Beach Retreat',
        description:
          'A relaxed island package with 5 nights in Seminyak, one spa treatment, yoga class access, and private airport-hotel transfer included.',
        price: 1049.0,
        discount: 17,
        destination: 'Bali, Indonesia',
        airport: 'CGP',
        dealImage: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1',
        travelStartDate: baliDealStart,
        travelEndDate: baliDealEnd,
        flightBookingLink: 'https://www.singaporeair.com',
        hotelBookingLink: 'https://www.agoda.com',
        status: 'ACTIVE',
        isFeatured: true,
      },
    ],
  });

  await prisma.travelGuide.createMany({
    data: [
      {
        title: '48 Hours in Lisbon: Neighborhood-by-Neighborhood Plan',
        description:
          'A practical weekend plan covering Alfama, Baixa, and Belem with timing tips, budget ranges, and where to watch sunset over the Tagus.',
        category: 'Cultural',
        heroImage: 'https://images.unsplash.com/photo-1513735492246-483525079686',
        readTime: '9 min',
        location: 'Lisbon, Portugal',
        content: [
          {
            section: 'Morning in Alfama',
            body: 'Start at Miradouro das Portas do Sol, then walk downhill to Lisbon Cathedral. Keep cash for local bakeries and ride Tram 28 before 10am to avoid queues.',
          },
          {
            section: 'Afternoon in Belem',
            body: 'Visit Jeronimos Monastery and the Monument to the Discoveries, then stop at Pasteis de Belem. Reserve at least 2 hours for riverside walking and photos.',
          },
          {
            section: 'Dinner and Fado',
            body: 'Book a small Fado venue in Alfama and choose a set menu with codfish, green wine, and custard tart. Most venues begin performances after 8:30 PM.',
          },
        ],
      },
      {
        title: 'Bangkok Street Food Map for First-Time Visitors',
        description:
          'A food-focused guide with trusted night markets, halal-friendly options, transit directions, and what to order if you are new to Thai flavors.',
        category: 'Food',
        heroImage: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed',
        readTime: '11 min',
        location: 'Bangkok, Thailand',
        content: [
          {
            section: 'Best Areas to Start',
            body: 'Begin at Yaowarat for seafood and noodles, then move to Ratchada for dessert and grilled snacks. Arrive before peak dinner hours to secure seats.',
          },
          {
            section: 'How to Order',
            body: 'Use simple phrases and point at menu photos. Ask for spice level as mild, medium, or hot. Carry tissues and small cash notes for stalls.',
          },
          {
            section: 'Safety and Comfort',
            body: 'Prefer high-turnover stalls, drink bottled water, and use app-based rides at night. Keep hand sanitizer and avoid raw seafood if sensitive.',
          },
        ],
      },
      {
        title: 'Istanbul in 3 Days: Mosques, Markets, and Ferry Views',
        description:
          'An efficient cultural route blending iconic landmarks with local neighborhoods so travelers can experience both historical Istanbul and modern city life.',
        category: 'Adventure',
        heroImage: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b',
        readTime: '10 min',
        location: 'Istanbul, Turkiye',
        content: [
          {
            section: 'Historic Core Day',
            body: 'Cover Hagia Sophia, Blue Mosque, and Basilica Cistern in one loop. Buy museum tickets online to save time and carry a scarf for mosque entry.',
          },
          {
            section: 'Local Market Day',
            body: 'Explore the Grand Bazaar first, then finish in Spice Bazaar for tea and sweets. Bargain politely and compare prices at three shops before buying.',
          },
          {
            section: 'Ferry and Sunset Day',
            body: 'Take a Kadikoy ferry in late afternoon and return by sunset. Waterfront tea gardens on the Asian side offer a calmer pace and great skyline views.',
          },
        ],
      },
      {
        title: 'Tokyo Metro Survival Guide for First-Time Travelers',
        description:
          'A practical route guide to mastering Tokyo transport, station exits, IC cards, and neighborhood planning without wasting time in transit.',
        category: 'Cultural',
        heroImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26',
        readTime: '12 min',
        location: 'Tokyo, Japan',
        content: [
          {
            section: 'IC Card Setup in 10 Minutes',
            body: 'Buy Suica or Pasmo at the airport and top up enough for two days. It works on most rail and subway lines and avoids single-ticket confusion.',
          },
          {
            section: 'Station Exit Strategy',
            body: 'Large stations like Shinjuku have dozens of exits. Save your destination exit number before arriving, especially at rush hour.',
          },
          {
            section: 'When to Use Taxis',
            body: 'Late-night taxis are expensive but useful when trains stop after midnight. Keep your hotel address in Japanese on your phone for easy navigation.',
          },
        ],
      },
      {
        title: 'Bali for Couples: 5-Day Balanced Itinerary',
        description:
          'Combines beach downtime, light adventure, and scenic dining spots across Seminyak and Ubud while avoiding overpacked daily schedules.',
        category: 'Nature',
        heroImage: 'https://images.unsplash.com/photo-1518544866330-95a2f6f1f1fb',
        readTime: '8 min',
        location: 'Bali, Indonesia',
        content: [
          {
            section: 'Seminyak Base Plan',
            body: 'Use Seminyak as a base for beach clubs, cafes, and sunset dinners. Book a scooter or driver one day ahead for better pricing.',
          },
          {
            section: 'Ubud Day Trip',
            body: 'Start early for rice terraces and waterfall visits, then include a coffee plantation stop. Return before evening traffic builds up.',
          },
          {
            section: 'Smart Budget Split',
            body: 'Spend more on one premium dinner and one private tour, then keep lunches and local transport simple to balance total trip cost.',
          },
        ],
      },
      {
        title: 'Dubai on a Mid-Range Budget: What Is Worth Paying For',
        description:
          'A guide for balancing premium experiences with affordable local dining and transit so visitors enjoy Dubai without overspending.',
        category: 'Adventure',
        heroImage: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8a4',
        readTime: '9 min',
        location: 'Dubai, UAE',
        content: [
          {
            section: 'Best Value Experiences',
            body: 'Choose one headline activity such as Burj Khalifa at sunset or a desert safari, then fill remaining days with free beach and old Dubai walks.',
          },
          {
            section: 'Transport Basics',
            body: 'Nol cards keep metro and tram costs low. Taxis are safe and fast but become expensive over multiple short rides each day.',
          },
          {
            section: 'Where to Eat Smart',
            body: 'Explore Deira and Al Karama for excellent value meals. Reserve rooftop dining for one evening and use lunch specials elsewhere.',
          },
        ],
      },
      {
        title: 'Kenya Safari Preparation Checklist for New Travelers',
        description:
          'Essential pre-trip planning for first safari visitors including packing, vaccination reminders, camera gear, and game-drive etiquette.',
        category: 'Nature',
        heroImage: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53',
        readTime: '13 min',
        location: 'Maasai Mara, Kenya',
        content: [
          {
            section: 'Packing Priorities',
            body: 'Choose neutral clothing, light layers, sunscreen, and closed shoes. Bring binoculars and a spare battery because charging can be limited.',
          },
          {
            section: 'Health and Documents',
            body: 'Confirm entry requirements and recommended vaccines well in advance. Carry digital and printed copies of insurance and itinerary details.',
          },
          {
            section: 'Game Drive Etiquette',
            body: 'Keep voices low, stay seated, and avoid sudden movement near animals. Respect guide instructions at all times for safety.',
          },
        ],
      },
      {
        title: 'Reykjavik Winter Guide: Lights, Weather, and Road Safety',
        description:
          'Designed for winter visitors who want realistic expectations around daylight hours, weather changes, and safe self-drive planning in Iceland.',
        category: 'Nature',
        heroImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8',
        readTime: '10 min',
        location: 'Reykjavik, Iceland',
        content: [
          {
            section: 'Daylight Planning',
            body: 'In winter, daylight is short. Prioritize outdoor tours in the middle of the day and leave indoor museums for evening hours.',
          },
          {
            section: 'Road and Car Advice',
            body: 'Check daily road conditions and rent a properly equipped vehicle. If weather warnings are issued, avoid long-distance drives.',
          },
          {
            section: 'Aurora Strategy',
            body: 'Book one guided Northern Lights night early in your trip so you have fallback nights if cloud cover is heavy.',
          },
        ],
      },
    ],
  });

  const expiredGiveawayStart = new Date(now);
  expiredGiveawayStart.setMonth(expiredGiveawayStart.getMonth() - 2);
  const expiredGiveawayEnd = new Date(now);
  expiredGiveawayEnd.setMonth(expiredGiveawayEnd.getMonth() - 1);

  const activeGiveawayStart = new Date(now);
  activeGiveawayStart.setDate(activeGiveawayStart.getDate() - 5);
  const activeGiveawayEnd = new Date(now);
  activeGiveawayEnd.setDate(activeGiveawayEnd.getDate() + 20);

  const upcomingGiveawayStart = new Date(now);
  upcomingGiveawayStart.setMonth(upcomingGiveawayStart.getMonth() + 1);
  const upcomingGiveawayEnd = new Date(now);
  upcomingGiveawayEnd.setMonth(upcomingGiveawayEnd.getMonth() + 1);
  upcomingGiveawayEnd.setDate(upcomingGiveawayEnd.getDate() + 20);

  const expiredGiveaway = await prisma.giveaway.create({
    data: {
      title: 'March Giveaway - Weekend in Prague',
      description:
        'Winner received return flights plus 2 hotel nights in Prague Old Town. This record remains for historical showcase of previous campaigns.',
      giveawayImage: 'https://images.unsplash.com/photo-1541849546-216549ae216d',
      status: 'EXPIRED',
      isMonthlyActive: false,
      startDate: expiredGiveawayStart,
      endDate: expiredGiveawayEnd,
    },
  });

  const activeGiveaway = await prisma.giveaway.create({
    data: {
      title: 'This Month Giveaway - Maldives Beach Escape',
      description:
        'One winner gets a 3-night island resort stay with breakfast and airport speedboat transfer. Open to all active members this month.',
      giveawayImage: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd',
      status: 'ACTIVE',
      isMonthlyActive: true,
      startDate: activeGiveawayStart,
      endDate: activeGiveawayEnd,
    },
  });

  const upcomingGiveaway = await prisma.giveaway.create({
    data: {
      title: 'Next Month Giveaway - Cappadocia Balloon Trip',
      description:
        'Upcoming campaign featuring sunrise hot-air balloon tickets for two and a cave hotel stay in Goreme.',
      giveawayImage: 'https://images.unsplash.com/photo-1641732684581-6f1d8d8f9d79',
      status: 'UPCOMING',
      isMonthlyActive: false,
      startDate: upcomingGiveawayStart,
      endDate: upcomingGiveawayEnd,
    },
  });

  await prisma.giveawayEntry.createMany({
    data: [
      { giveawayId: expiredGiveaway.id, userId: user.id },
      { giveawayId: expiredGiveaway.id, userId: activeUser.id },
      { giveawayId: activeGiveaway.id, userId: user.id },
      { giveawayId: activeGiveaway.id, userId: activeUser.id },
      { giveawayId: activeGiveaway.id, userId: renewedUser.id },
      { giveawayId: upcomingGiveaway.id, userId: user.id },
    ],
  });

  console.log('✅ Portfolio travel deals created');
  console.log('✅ Portfolio travel guides created');
  console.log('✅ Portfolio giveaways and entries created');

  // Create default settings
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
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

  console.log('✅ Default settings created');

  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
