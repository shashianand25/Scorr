import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@quizforge.local" },
    update: {},
    create: {
      email: "admin@quizforge.local",
      name: "QuizForge Admin",
      role: "ADMIN",
      passwordHash: await hash("admin1234", 12),
      xp: 5200,
      level: 12,
      streak: 18,
    },
  });

  await prisma.achievement.createMany({
    data: [
      { key: "first_quiz", name: "First Spark", description: "Create your first quiz.", icon: "sparkles", xpReward: 100 },
      { key: "streak_7", name: "One Week Hot", description: "Keep a 7 day learning streak.", icon: "flame", xpReward: 250 },
      { key: "perfect_score", name: "Flawless", description: "Score 100% on a quiz.", icon: "trophy", xpReward: 200 },
    ],
    skipDuplicates: true,
  });

  const title = "Science Warmup";
  const quiz = await prisma.quiz.upsert({
    where: { slug: slugify(title) },
    update: {},
    create: {
      title,
      slug: slugify(title),
      category: "Science",
      visibility: "PUBLIC",
      tags: ["biology", "physics", "sample"],
      timeLimitSec: 30,
      sourceText: "@title: Science Warmup\n? Select prime numbers\n+ 2\n+ 3\n- 4\n- 9",
      authorId: admin.id,
      questions: {
        create: [
          {
            order: 0,
            type: "MULTIPLE_CHOICE",
            prompt: "Select prime numbers",
            difficulty: "EASY",
            tags: ["math"],
            answers: {
              create: [
                { order: 0, text: "2", isCorrect: true },
                { order: 1, text: "3", isCorrect: true },
                { order: 2, text: "4", isCorrect: false },
                { order: 3, text: "9", isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.analyticsEvent.create({
    data: { type: "seed.quiz.created", quizId: quiz.id, userId: admin.id, metadata: { source: "seed" } },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
