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

/** Google Drive Brand Icon — Official Google Drive (2026) Edition */
export function GoogleDriveIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      viewBox="0 0 800 742"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <mask id="gdrive-2026-mask" width="168" height="154" x="12" y="18" maskUnits="userSpaceOnUse">
        <path
          fill="#ffffff"
          d="M63.09 37c14.626-25.333 51.193-25.334 65.819 0l45.033 78c14.626 25.334-3.657 57.001-32.91 57.001H50.967c-29.253 0-47.536-31.667-32.91-57.001Z"
        />
      </mask>
      <g mask="url(#gdrive-2026-mask)" transform="matrix(4.8140532,0,0,4.8140532,-62.146701,-86.652356)">
        <path fill="url(#gdrive-2026-grad-b)" d="M206.905 172.02h-91.888l-19.015-32.934 45.944-79.578Z" />
        <path fill="url(#gdrive-2026-grad-c)" d="M-14.919 172.006 50.04 59.494v.002L31.032 92.422h38.02L115 172.004l-129.918.001Z" />
        <path fill="url(#gdrive-2026-grad-d)" d="M96.007-20.085 141.954 59.5l-19.011 32.928H31.048Z" />
      </g>
      <defs>
        <linearGradient id="gdrive-2026-grad-b" x1="193.6" x2="103.09" y1="165.6" y2="111.21" gradientUnits="userSpaceOnUse">
          <stop offset=".09" stopColor="#ffe921" />
          <stop offset="1" stopColor="#fec700" />
        </linearGradient>
        <linearGradient id="gdrive-2026-grad-c" x1="114.4" x2="15.53" y1="181.61" y2="121.8" gradientUnits="userSpaceOnUse">
          <stop offset=".15" stopColor="#a9a8ff" />
          <stop offset=".33" stopColor="#6d97ff" />
          <stop offset=".48" stopColor="#3186ff" />
        </linearGradient>
        <linearGradient id="gdrive-2026-grad-d" x1="128.88" x2="28.7" y1="37.88" y2="84.64" gradientUnits="userSpaceOnUse">
          <stop offset=".55" stopColor="#0ebc5f" />
          <stop offset=".85" stopColor="#78c9ff" />
        </linearGradient>
      </defs>
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
