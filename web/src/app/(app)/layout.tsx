"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { signOutUser } from "@/lib/firebase";
import { 
  LayoutDashboard, 
  Library, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Swords,
  User as UserIcon
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Library", href: "/library", icon: Library },
    { label: "Battle Arena", href: "/arena", icon: Swords },
    { label: "Create Quiz", href: "/create", icon: PlusCircle },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col backdrop-blur-md">
        <div className="p-6">
          <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-lg font-black">S</span>
            </div>
            Scorr
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400 font-semibold"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <item.icon size={20} className={isActive ? "text-indigo-400" : "text-slate-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800/50 hover:text-slate-200">
            <Settings size={20} />
            Settings
          </button>
          <button 
            onClick={() => signOutUser()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={20} />
            Sign Out
          </button>
          
          <div className="mt-4 flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
              ) : (
                <UserIcon size={20} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-slate-200 truncate">{user.displayName || "User"}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
        <div className="relative z-10 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
