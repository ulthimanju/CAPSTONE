/**
 * Unified Icon System — Phosphor Icons (@phosphor-icons/react)
 *
 * Single source of truth for all icons. Never import from 'lucide-react'.
 *
 * Weight conventions:
 *   regular  — default, navigation, labels, inline text
 *   bold     — primary action buttons, emphasis
 *   fill     — active/selected states, status indicators
 *   light    — decorative, empty-state illustrations
 *
 * Size scale (Tailwind className):
 *   h-3 w-3  (12px) — micro indicators, badge dots
 *   h-4 w-4  (16px) — table rows, compact lists, input addons
 *   h-5 w-5  (20px) — buttons, nav items, card actions
 *   h-6 w-6  (24px) — section headers, primary nav
 *   h-8 w-8  (32px) — empty-state callout icons
 *   h-10 w-10(40px) — hero icons, large empty states
 */

import React from 'react';
import {
  // Directional / Navigation
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowSquareOut,
  ArrowsCounterClockwise,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowsLeftRight,
  CaretDown,
  CaretUp,
  CaretLeft,
  CaretRight,
  CaretUpDown,
  // UI Controls
  X,
  XCircle,
  Check,
  CheckCircle,
  Checks,
  Warning,
  WarningCircle,
  Info,
  CircleNotch,
  MagnifyingGlass,
  DotsThreeVertical,
  DotsThree,
  List,
  Minus,
  // User & Collaboration
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserCircle,
  // Files & Storage
  FileText,
  Files,
  FilePlus,
  FolderPlus,
  Folder,
  Image,
  Presentation,
  Table,
  Upload,
  CloudArrowUp,
  Download,
  // Communication
  Bell,
  Envelope,
  ChatCircleText,
  PaperPlaneRight,
  // Knowledge & Education
  BookOpen,
  Books,
  Article,
  ListBullets,
  Lightbulb,
  Brain,
  Exam,
  Cards,
  Path,
  Trophy,
  // Actions & Tools
  Gear,
  Lock,
  LockOpen,
  Globe,
  Shield,
  ShieldCheck,
  ShieldWarning,
  Crown,
  Archive,
  SignOut,
  Trash,
  Eye,
  EyeSlash,
  PencilSimple,
  FloppyDisk,
  Tag,
  Shuffle,
  Code,
  Compass,
  MapPin,
  Clock,
  Buildings,
  DeviceMobile,
  DeviceTablet,
  Laptop,
  Question,
  Sparkle,
  StackSimple,
  Share,
  Copy,
  Link,
} from '@phosphor-icons/react';

// ─── Backward-compatible aliases (old lucide names → Phosphor equivalents) ───
export const Smartphone = DeviceMobile;
export const Tablet = DeviceTablet;
export const Layers = StackSimple;
export const Send = PaperPlaneRight;
export const FileSpreadsheet = Table;
export const ArrowRightLeft = ArrowsLeftRight;
export const RefreshCw = ArrowClockwise;
export const CheckCheck = Checks;
export const CheckCircle2 = CheckCircle;
export const Settings = Gear;
export const Menu = List;
export const LogOut = SignOut;
export const Mail = Envelope;
export const Trash2 = Trash;
export const RotateCcw = ArrowCounterClockwise;
export const RotateCw = ArrowClockwise;
export const Sparkles = Sparkle;
export const Loader2 = CircleNotch;
export const AlertCircle = WarningCircle;
export const AlertTriangle = Warning;
export const ShieldAlert = ShieldWarning;
export const ChevronDown = CaretDown;
export const ChevronUp = CaretUp;
export const ChevronLeft = CaretLeft;
export const ChevronRight = CaretRight;
export const ChevronsUpDown = CaretUpDown;
export const ExternalLink = ArrowSquareOut;
export const Code2 = Code;
export const Building = Buildings;
export const Edit3 = PencilSimple;
export const Save = FloppyDisk;
export const Search = MagnifyingGlass;
export const Route = Path;
export const Share2 = Share;
export const Close = X;
export const CloseCircle = XCircle;

// ─── Re-export Phosphor primitives ────────────────────────────────────────────
export {
  // Directional / Navigation
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowSquareOut,
  ArrowsCounterClockwise,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowsLeftRight,
  CaretDown,
  CaretUp,
  CaretLeft,
  CaretRight,
  CaretUpDown,
  // UI Controls
  X,
  XCircle,
  Check,
  CheckCircle,
  Checks,
  Warning,
  WarningCircle,
  Info,
  CircleNotch,
  MagnifyingGlass,
  DotsThreeVertical,
  DotsThree,
  List,
  Minus,
  // User & Collaboration
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserCircle,
  // Files & Storage
  FileText,
  Files,
  FilePlus,
  FolderPlus,
  Folder,
  Image,
  Presentation,
  Table,
  Upload,
  CloudArrowUp,
  Download,
  // Communication
  Bell,
  Envelope,
  ChatCircleText,
  PaperPlaneRight,
  // Knowledge & Education
  BookOpen,
  Books,
  Article,
  ListBullets,
  Lightbulb,
  Brain,
  Exam,
  Cards,
  Path,
  Trophy,
  // Actions & Tools
  Gear,
  Lock,
  LockOpen,
  Globe,
  Shield,
  ShieldCheck,
  ShieldWarning,
  Crown,
  Archive,
  SignOut,
  Trash,
  Eye,
  EyeSlash,
  PencilSimple,
  FloppyDisk,
  Tag,
  Shuffle,
  Code,
  Compass,
  MapPin,
  Clock,
  Buildings,
  DeviceMobile,
  DeviceTablet,
  Laptop,
  Question,
  Sparkle,
  StackSimple,
  Share,
  Copy,
  Link,
};

/* ==========================================================================
   Semantic Domain Icons
   Each wraps a Phosphor icon with the appropriate weight and default size.
   ========================================================================== */

/** Documents Tab — Files fill weight for active/selected feel */
export function DocumentsIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <Files weight="fill" className={className} aria-hidden="true" {...props} />;
}

/** Summary Tab — Article, editorial reading context */
export function SummaryIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <Article weight="regular" className={className} aria-hidden="true" {...props} />;
}

/** Learning Path Tab — Path, connective step-based navigation */
export function LearningPathIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <Path weight="bold" className={className} aria-hidden="true" {...props} />;
}

/** AI Tutor / Clarify Doubts Tab — ChatCircleText, conversational AI context */
export function AITutorIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <ChatCircleText weight="regular" className={className} aria-hidden="true" {...props} />;
}

/** Plus / Add / Create — square plus geometry */
export function PlusIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      aria-hidden="true"
      fill="currentColor"
      {...props}
    >
      <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V64H224V192ZM136,104v16h16a8,8,0,0,1,0,16H136v16a8,8,0,0,1-16,0V136H104a8,8,0,0,1,0-16h16V104a8,8,0,0,1,16,0Z" />
    </svg>
  );
}

/** Logs / Activity Audit — ListBullets, timestamped log entries */
export function LogsIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <ListBullets weight="regular" className={className} aria-hidden="true" {...props} />;
}

/** Quiz / Assessment — Exam, academic testing, distinctive */
export function QuizIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <Exam weight="regular" className={className} aria-hidden="true" {...props} />;
}

/** Flashcards — Cards, physical card deck metaphor */
export function FlashcardsIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <Cards weight="regular" className={className} aria-hidden="true" {...props} />;
}

/** Regenerate / Reset — ArrowsCounterClockwise, clear refresh metaphor */
export function RegenerateIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <ArrowsCounterClockwise weight="regular" className={className} aria-hidden="true" {...props} />;
}

/** Devices & Sessions — DeviceMobile, multi-device context */
export function DevicesIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <DeviceMobile weight="regular" className={className} aria-hidden="true" {...props} />;
}

/** Technical Workspace — Code, bold weight for emphasis */
export function CodeBoldIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <Code weight="bold" className={className} aria-hidden="true" {...props} />;
}

/** Non-Technical Workspace — BookOpen, reading/study context */
export function BookLinearIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return <BookOpen weight="regular" className={className} aria-hidden="true" {...props} />;
}

/** Google Drive Brand Icon — custom SVG (no Phosphor equivalent) */
export function GoogleDriveIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 87.3 78"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z" fill="#00ac47" />
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15z" fill="#ea4335" />
      <path d="M43.65 25H87.3c0-1.55-.4-3.1-1.2-4.5l-3.85-6.65c-.8-1.4-1.95-2.5-3.3-3.3L65.2 23.8H43.65z" fill="#00832d" />
      <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}

/* ==========================================================================
   Semantic Application Icon Registry
   ========================================================================== */
export const AppIcons = {
  Documents:            DocumentsIcon,
  Summary:              SummaryIcon,
  LearningPath:         LearningPathIcon,
  ClarifyDoubts:        AITutorIcon,
  AITutor:              AITutorIcon,
  ManageWorkspace:      Gear,
  WorkspaceTechnical:   CodeBoldIcon,
  WorkspaceNonTechnical:BookLinearIcon,
  Plus:                 PlusIcon,
  New:                  PlusIcon,
  Quiz:                 QuizIcon,
  Flashcards:           FlashcardsIcon,
  Regenerate:           RegenerateIcon,
  Generate:             RegenerateIcon,
  Reset:                RegenerateIcon,
  Logs:                 LogsIcon,
  Activity:             LogsIcon,
  Devices:              DevicesIcon,
  Sessions:             DevicesIcon,
  GoogleDrive:          GoogleDriveIcon,
  Archive:              Archive,
  Notifications:        Bell,
  Invitations:          Envelope,
  Settings:             Gear,
  Logout:               SignOut,
  Upload:               Upload,
  CloudUpload:          CloudArrowUp,
  Search:               MagnifyingGlass,
  Trash:                Trash,
  Check:                Check,
  CheckDouble:          Checks,
  Loader:               CircleNotch,
  Crown:                Crown,
  Shield:               Shield,
  ShieldCheck:          ShieldCheck,
  ShieldAlert:          ShieldWarning,
  Clock:                Clock,
  MapPin:               MapPin,
  Globe:                Globe,
  ArrowRight:           ArrowRight,
  ArrowLeft:            ArrowLeft,
  ArrowUpRight:         ArrowUpRight,
  ArrowSquareOut:       ArrowSquareOut,
  Route:                Path,
  Sparkles:             Sparkle,
  Shuffle:              Shuffle,
  RotateCw:             ArrowClockwise,
  RotateCcw:            ArrowCounterClockwise,
  Close:                X,
  CloseCircle:          XCircle,
  CheckCircle:          CheckCircle,
  CheckCircle2:         CheckCircle,
  AlertCircle:          WarningCircle,
  AlertTriangle:        Warning,
  Info:                 Info,
  Lightbulb:            Lightbulb,
  Brain:                Brain,
  FileText:             FileText,
  Files:                Files,
  FolderPlus:           FolderPlus,
  Folder:               Folder,
  User:                 User,
  Users:                Users,
  UserPlus:             UserPlus,
  UserCheck:            UserCheck,
  UserMinus:            UserMinus,
  Edit:                 PencilSimple,
  Eye:                  Eye,
  Lock:                 Lock,
  Save:                 FloppyDisk,
  Menu:                 List,
  ChevronDown:          CaretDown,
  ChevronUp:            CaretUp,
  ChevronLeft:          CaretLeft,
  ChevronRight:         CaretRight,
  ChevronsUpDown:       CaretUpDown,
  DotsMenu:             DotsThreeVertical,
  Tag:                  Tag,
  Code:                 Code,
  Compass:              Compass,
  Buildings:            Buildings,
  Question:             Question,
  Share:                Share,
  Download:             Download,
  ExternalLink:         ArrowSquareOut,
  BookOpen:             BookOpen,
  Trophy:               Trophy,
  Send:                 PaperPlaneRight,
};

/**
 * Universal AppIcon Component
 * Usage: <AppIcon name="Summary" className="h-4 w-4" />
 */
export function AppIcon({ name, className = 'h-4 w-4 shrink-0', ...props }) {
  const Component = AppIcons[name] || AppIcons.FileText;
  return <Component className={className} {...props} />;
}

export default AppIcons;
