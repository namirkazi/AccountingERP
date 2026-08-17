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
} from "lucide-react";

export const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },

  {
    title: "Masters",
    icon: FolderOpen,
    children: [
      {
        title: "Customers",
        icon: Users,
        path: "/customers",
      },
      {
        title: "Suppliers",
        icon: Building2,
        path: "/suppliers",
      },
      {
        title: "Assets",
        icon: Package,
        path: "/assets",
      },
    ],
  },
  {
    title: "Opening",
    icon: CircleDollarSign,
    children: [
      {
        title: "Capital & Balances",
        icon: CircleDollarSign,
        path: "/opening",
      },
    ],
  },

  {
    title: "Accounting",
    icon: Calculator,
    path: "/transactions"
  },
  {
    title: "Ledger",
    icon: BookOpen,
    path: "/ledger",
  },
  {
    title: "Reports",
    icon: ChartColumn,
    path: "/reports",
  },

  {
    title: "Administration",
    icon: Settings,
    path: "/settings",
    role: ["admin"],
  },
];