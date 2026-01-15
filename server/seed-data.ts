import { db } from "./db";
import { programs, workshops, opportunities } from "@shared/schema";
import { randomUUID } from "crypto";

/**
 * Seed real data based on SignUpGenius examples
 * This creates programs, workshops, and opportunities matching the actual data structure
 */

export async function seedRealData() {
  console.log("Seeding real program data...");

  // Create Programs
  const financialFuturesProgram = await db.insert(programs).values({
    id: randomUUID(),
    name: "Financial Futures Collective",
    description: "Financial coaching program for women ages 22+",
    duration: "8-9 weekly workshops",
    ageRange: "ages 22+",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  const lifeLaunchProgram = await db.insert(programs).values({
    id: randomUUID(),
    name: "Life Launch Collective",
    description: "Financial literacy program for young women ages 16-22",
    duration: "12 weekly workshops",
    ageRange: "ages 16-22",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  const financialFuturesESP = await db.insert(programs).values({
    id: randomUUID(),
    name: "Financial Futures ESP",
    description: "Financial Futures program variant",
    duration: "8 weekly workshops",
    ageRange: "ages 22+",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  const resilienceCenterProgram = await db.insert(programs).values({
    id: randomUUID(),
    name: "Resilience Center of Franklin County",
    description: "Financial Futures program at Resilience Center",
    duration: "8 weekly workshops",
    ageRange: "ages 22+",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  const financialFuturesDay = await db.insert(programs).values({
    id: randomUUID(),
    name: "Financial Futures Collective DAY",
    description: "Daytime Financial Futures program",
    duration: "8-9 weekly workshops",
    ageRange: "ages 22+",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  const programIds = {
    ffCollective: financialFuturesProgram[0].id,
    lifeLaunch: lifeLaunchProgram[0].id,
    ffESP: financialFuturesESP[0].id,
    resilienceCenter: resilienceCenterProgram[0].id,
    ffDay: financialFuturesDay[0].id,
  };

  // Create Opportunities based on SignUpGenius data
  const opportunitiesData = [
    // November 15, 2025 - Financial Futures Collective DAY
    {
      programId: programIds.ffDay,
      title: "Financial Futures Collective DAY - Coach",
      description: "Coach - 8 weekly workshops (virtual). Start Date: 11/15/2025",
      organization: "Women's Money Matters",
      category: "Financial Coaching",
      date: new Date("2025-11-15T09:30:00"),
      startTime: "9:30am",
      endTime: "11:00am",
      location: "Virtual Zoom Meeting",
      totalSpots: 20,
      filledSpots: 6,
      status: "active",
      displayOnWebsite: true,
    },
    // November 18, 2025 - Life Launch Collective
    {
      programId: programIds.lifeLaunch,
      title: "Life Launch Collective - Coach",
      description: "Coach - 12 weekly workshops (virtual). Start Date: 11/18/2025",
      organization: "Women's Money Matters",
      category: "Financial Coaching",
      date: new Date("2025-11-18T18:00:00"),
      startTime: "6:00pm",
      endTime: "7:00pm",
      location: "Virtual Zoom Meeting",
      totalSpots: 4,
      filledSpots: 4,
      status: "active",
      displayOnWebsite: true,
    },
    // November 18, 2025 - Financial Futures Collective Evening
    {
      programId: programIds.ffCollective,
      title: "Financial Futures Collective - Coach",
      description: "Coach - 9 weekly workshops (virtual). Start Date: 11/18/2025",
      organization: "Women's Money Matters",
      category: "Financial Coaching",
      date: new Date("2025-11-18T18:30:00"),
      startTime: "6:30pm",
      endTime: "8:00pm",
      location: "Virtual Zoom Meeting",
      totalSpots: 20,
      filledSpots: 10,
      status: "active",
      displayOnWebsite: true,
    },
    // November 24, 2025 - Financial Futures Collective DAY
    {
      programId: programIds.ffDay,
      title: "Financial Futures Collective DAY - Coach",
      description: "Coach - 9 weekly workshops (virtual). Start Date: 11/24/2025",
      organization: "Women's Money Matters",
      category: "Financial Coaching",
      date: new Date("2025-11-24T12:00:00"),
      startTime: "12:00pm",
      endTime: "1:30pm",
      location: "Virtual Zoom Meeting",
      totalSpots: 20,
      filledSpots: 10,
      status: "active",
      displayOnWebsite: true,
    },
    // December 2, 2025 - Financial Futures ESP
    {
      programId: programIds.ffESP,
      title: "Financial Futures ESP - Coach",
      description: "Coach - 8 weekly workshops (virtual). Start Date: 12/2/2025",
      organization: "Women's Money Matters",
      category: "Financial Coaching",
      date: new Date("2025-12-02T18:30:00"),
      startTime: "6:30pm",
      endTime: "8:00pm",
      location: "Virtual Zoom Meeting",
      totalSpots: 20,
      filledSpots: 1,
      status: "active",
      displayOnWebsite: true,
    },
    // December 2, 2025 - Resilience Center
    {
      programId: programIds.resilienceCenter,
      title: "Resilience Center of Franklin County - Coach",
      description: "Coach - 8 weekly workshops (virtual). Start Date: 12/02/2025",
      organization: "Women's Money Matters",
      category: "Financial Coaching",
      date: new Date("2025-12-02T18:30:00"),
      startTime: "6:30pm",
      endTime: "8:00pm",
      location: "Virtual Zoom Meeting",
      totalSpots: 20,
      filledSpots: 0,
      status: "active",
      displayOnWebsite: true,
    },
    // December 3, 2025 - Financial Futures Collective
    {
      programId: programIds.ffCollective,
      title: "Financial Futures Collective - Coach",
      description: "Coach - 9 weekly workshops (virtual). Start Date: 12/3/2025",
      organization: "Women's Money Matters",
      category: "Financial Coaching",
      date: new Date("2025-12-03T18:30:00"),
      startTime: "6:30pm",
      endTime: "8:00pm",
      location: "Virtual Zoom Meeting",
      totalSpots: 20,
      filledSpots: 2,
      status: "active",
      displayOnWebsite: true,
    },
    // December 15, 2025 - Financial Futures Collective
    {
      programId: programIds.ffCollective,
      title: "Financial Futures Collective - Coach",
      description: "Coach - 8 weekly workshops (virtual). Start Date: 12/15/2025",
      organization: "Women's Money Matters",
      category: "Financial Coaching",
      date: new Date("2025-12-15T18:30:00"),
      startTime: "6:30pm",
      endTime: "8:00pm",
      location: "Virtual Zoom Meeting",
      totalSpots: 20,
      filledSpots: 2,
      status: "active",
      displayOnWebsite: true,
    },
  ];

  for (const opp of opportunitiesData) {
    await db.insert(opportunities).values({
      id: randomUUID(),
      ...opp,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log("✅ Real data seeded successfully!");
  return { programIds, opportunitiesCount: opportunitiesData.length };
}

