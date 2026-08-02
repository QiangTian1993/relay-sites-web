// 集中图标模块 —— Swiss 风格统一封装
// 所有 SVG 图标用 stroke-width=1.5（瑞士几何感），颜色用 currentColor（跟随父级）
// 不用 emoji 不用 unicode 字符

import {
  Shuffle,        // 🔀 → relay_sites
  Wrench,         // 🛠️ → vibe_coding
  BarChart3,      // 📊 → logo
  Search,         // ⌕
  X,              // ✕
  ArrowRight,     // →
  ArrowLeft,      // ←
  ArrowUp,        // ↑
  ArrowDown,      // ↓
  ArrowUpRight,   // ↗
  Star,           // ★
  Inbox,          // ∅
  Sigma,          // ∑
  Plus,           // +
  Hash,
  ExternalLink,
  Calendar,
  LayoutList,
  LayoutGrid,
  Image as LayoutGallery,
  Zap,
  CircleCheck,
  CircleAlert,
  CircleDot,
  Check,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export {
  Shuffle,
  Wrench,
  BarChart3,
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Star,
  Inbox,
  Sigma,
  Plus,
  Hash,
  ExternalLink,
  Calendar,
};

// 语义别名（业务用，更可读）
export const IconSites = Shuffle;       // 中转站
export const IconTools = Wrench;        // 编程工具
export const IconLogo = BarChart3;       // Logo
export const IconSearch = Search;        // 搜索
export const IconClose = X;              // 关闭/清空
export const IconArrowRight = ArrowRight;
export const IconArrowLeft = ArrowLeft;
export const IconArrowUp = ArrowUp;
export const IconArrowDown = ArrowDown;
export const IconExternal = ArrowUpRight;
export const IconStar = Star;            // 评分
export const IconEmpty = Inbox;          // 空
export const IconSum = Sigma;            // 求和
export const IconPlus = Plus;
export const IconHash = Hash;
export const IconExtLink = ExternalLink;
export const IconCalendar = Calendar;
export const IconLayoutList = LayoutList;
export const IconLayoutGrid = LayoutGrid;
export const IconLayoutGallery = LayoutGallery;
export const IconZap = Zap;
export const IconCircleCheck = CircleCheck;
export const IconCircleAlert = CircleAlert;
export const IconCircleDot = CircleDot;
export const IconCheck = Check;
export const IconAlertTriangle = AlertTriangle;
export type { LucideIcon };
