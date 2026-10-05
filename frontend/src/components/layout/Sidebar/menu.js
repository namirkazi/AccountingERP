import {
  ArrowLeftRight,
  BookOpen,
  Calculator,
  CircleDollarSign,
  CirclePlus,
  LayoutDashboard,
  Settings
} from "lucide-react";


export const accountingMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },

  {
    title: "Capital & Balances",
    icon: CircleDollarSign,
    path: "/opening",
  },

  {
    title: "Accounting",
    icon: Calculator,
    path: "/transactions",
  },

  {
    title: "Ledger",
    icon: BookOpen,
    path: "/ledger",
  },

  {
    title: "Add Company",
    icon: CirclePlus,
    path: "/companies/add",
  },

  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
    role: ["admin"],
  },
];


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