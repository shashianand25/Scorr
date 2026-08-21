import { Metadata } from "next";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "Scorr App - Dashboard",
  description: "Manage your AI-powered quizzes and flashcards.",
  openGraph: {
    title: "Scorr App",
    description: "AI-powered quizzes and flashcards.",
    type: "website",
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}

