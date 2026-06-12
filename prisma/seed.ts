import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding SkillSats database...");

  // Clear existing data (order matters for FK constraints)
  await prisma.adWatch.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.video.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  // --- USERS ---
  const learner = await prisma.user.create({
    data: {
      email: "learner@test.com",
      username: "satoshi_student",
      password,
      role: "LEARNER",
      balanceSats: 500,
    },
  });
  const creator = await prisma.user.create({
    data: {
      email: "creator@test.com",
      username: "lightning_teacher",
      password,
      role: "CREATOR",
      balanceSats: 1200,
    },
  });
  const advertiser = await prisma.user.create({
    data: {
      email: "advertiser@test.com",
      username: "btc_advertiser",
      password,
      role: "ADVERTISER",
      balanceSats: 0,
    },
  });

  // --- VIDEOS ---
  // Use a real public MP4 for the demo. Replace these URLs with your local files if needed.
  const freeSample = await prisma.video.create({
    data: {
      title: "What is the Lightning Network? (Free Preview)",
      description: "A beginner-friendly overview of Bitcoin's Layer 2 payment network.",
      url: "https://www.w3schools.com/html/mov_bbb.mp4", // replace with real content
      priceSats: 0,
      isFree: true,
      courseId: "course-lightning-basics",
      creatorId: creator.id,
    },
  });

  const paidVideo1 = await prisma.video.create({
    data: {
      title: "Setting Up a Lightning Node with Polar",
      description: "Step-by-step guide to running your own Lightning node locally.",
      url: "https://www.w3schools.com/html/mov_bbb.mp4", // replace with real content
      priceSats: 100,
      isFree: false,
      courseId: "course-lightning-basics",
      creatorId: creator.id,
    },
  });

  const paidVideo2 = await prisma.video.create({
    data: {
      title: "Building BOLT11 Invoice Integrations",
      description: "Code along as we integrate LND REST API into a real web app.",
      url: "https://www.w3schools.com/html/mov_bbb.mp4", // replace with real content
      priceSats: 200,
      isFree: false,
      courseId: "course-lightning-dev",
      creatorId: creator.id,
    },
  });

  // --- ADS ---
  await prisma.ad.createMany({
    data: [
      {
        title: "Stack Sats with Bitrefill - Pay Bills with Bitcoin",
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        budgetSats: 10000,
        rewardSats: 50, // user earns 60% = 30 sats per view
        spentSats: 0,
        active: true,
      },
      {
        title: "Lightning Payments in Everyday Commerce",
        videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        budgetSats: 12000,
        rewardSats: 75, // user earns 60% = 45 sats per view
        spentSats: 0,
        active: true,
      },
      {
        title: "Build on Bitcoin: A Developer Story",
        videoUrl: "https://media.w3.org/2010/05/sintel/trailer.mp4",
        budgetSats: 15000,
        rewardSats: 100, // user earns 60% = 60 sats per view
        spentSats: 0,
        active: true,
      },
    ],
  });

  console.log("✅ Seeded:");
  console.log(
    `   3 users (learner@test.com, creator@test.com, advertiser@test.com) — password: password123`,
  );
  console.log(`   3 videos (1 free, 2 paid at 100 and 200 sats)`);
  console.log(`   3 watch-to-earn videos (30, 45, and 60 sats per completed view)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
