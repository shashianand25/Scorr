import type { User } from "../lib/firebase";

export const getUserFirstName = (user: User | null): string => {
  if (!user) return "User";
  if (user.displayName) return user.displayName.split(" ")[0];
  if (user.email) {
    const localPart = user.email.split("@")[0];
    const namePart  = localPart.split(/[._\-+0-9]/)[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }
  return "User";
};

export const getUserFullName = (user: User | null): string => {
  if (!user) return "Scorr User";
  if (user.displayName) return user.displayName;
  if (user.email) {
    const localPart = user.email.split("@")[0];
    const parts = localPart.split(/[._\-+]/).filter(p => p.replace(/\d/g, "").length > 0);
    return parts.map(p => p.replace(/\d+/g, "").charAt(0).toUpperCase() + p.replace(/\d+/g, "").slice(1)).join(" ");
  }
  return "Scorr User";
};

export const getUserInitial = (user: User | null): string => {
  const name = getUserFullName(user);
  return name.charAt(0).toUpperCase();
};
