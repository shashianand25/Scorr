import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scorr - Profile",
  description: "View your Scorr profile, XP, level, and stats.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
