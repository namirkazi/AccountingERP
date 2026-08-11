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
    children: [
      {
        title: "Sales",
        icon: Receipt,
        path: "/transactions",
      },
      {
        title: "Receipts",
        icon: Landmark,
        path: "/transactions",
      },
      {
        title: "Payments",
        icon: CreditCard,
        path: "/transactions",
      },
      {
        title: "Expenses",
        icon: Receipt,
        path: "/transactions",
      },
    ],
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