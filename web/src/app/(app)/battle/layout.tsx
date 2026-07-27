import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scorr - Battle Arena",
  description: "Challenge your friends to a real-time quiz battle.",
};

export default function BattleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
