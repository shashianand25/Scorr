import { auth } from "@/auth";
import { prisma } from "./prisma";

export async function currentUserOrGuest() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user && !user.bannedAt) return user;
  }

  return prisma.user.upsert({
    where: { email: "guest@quizforge.local" },
    update: { lastActiveAt: new Date() },
    create: {
      email: "guest@quizforge.local",
      name: "Guest Creator",
      role: "TEACHER",
    },
  });
}
