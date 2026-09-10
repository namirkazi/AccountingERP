import {
  LayoutDashboard,
  FolderOpen,
  Wallet,
  ChartColumn,
  Settings,
  Users,
  Building2,
  Receipt,
  CreditCard,
  Landmark,
  Package,
  CircleDollarSign,
  Calculator,
  BookOpen,
  CirclePlus,
} from "lucide-react";

export const menuItems = [
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
