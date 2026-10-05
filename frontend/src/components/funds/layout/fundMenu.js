import {
  ArrowLeftRight,
  BookOpen,
  LayoutDashboard
} from "lucide-react";

export const fundMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/funds/dashboard",
  },

  {
    title: "Deposit / Withdrawal",
    icon: ArrowLeftRight,
    path: "/funds/transactions",
  },
  {
    title: "Funds Ledger",
    icon: BookOpen,
    path: "/funds/ledger",
  },
];