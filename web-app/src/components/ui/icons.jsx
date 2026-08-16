export {
  Settings,
  Archive,
  Bell,
  Mail,
  LogOut,
  Upload,
  Search,
  Trash2,
  Check,
  CheckCheck,
  Loader2,
  Crown,
  Shield,
  ShieldAlert,
  Clock,
  MapPin,
  Globe,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ArrowRight,
  ArrowLeft,
  Route,
  Sparkles,
  Shuffle,
  RotateCw,
  X,
  XCircle,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  FileText,
  User,
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  Edit3,
  Eye,
  Lock,
  Save,
  Menu,
} from 'lucide-react';

import React from 'react';
import {
  Settings,
  Archive,
  Bell,
  Mail,
  LogOut,
  Upload,
  Search,
  Trash2,
  Check,
  CheckCheck,
  Loader2,
  Crown,
  Shield,
  ShieldAlert,
  Clock,
  MapPin,
  Globe,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ArrowRight,
  ArrowLeft,
  Route,
  Sparkles,
  Shuffle,
  RotateCw,
  X,
  XCircle,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  FileText,
  User,
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  Edit3,
  Eye,
  Lock,
  Save,
  Menu,
} from 'lucide-react';

/* ==========================================================================
   Centralized Design System Custom SVG Icons
   Calibrated for consistent 24x24 optical grid, stroke weight, & visual mass
   ========================================================================== */

/**
 * Documents Tab Icon (files-filled) - Normalized 24x24
 */
export function DocumentsIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>files-filled</title>
      <path
        fill="currentColor"
        d="m11 2l3 .001V8a1 1 0 0 0 .883.993L15 9h6v6a3 3 0 0 1-3 3h-1v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h1V5a3 3 0 0 1 3-3M8 8H7a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1h-4a3 3 0 0 1-3-3zm12.415-1H16V2.585z"
      />
    </svg>
  );
}

/**
 * Summary Tab Icon (summary) - Normalized 24x24, 2px stroke
 */
export function SummaryIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>summary</title>
      <path d="M15 4H7m11 12l3 3l-3 3" />
      <path d="M3 4v13a2 2 0 0 0 2 2h16M7 14h7M7 9h12" />
    </svg>
  );
}

/**
 * Learning Path Tab Icon (path-arrow-solid) - Normalized 24x24
 */
export function LearningPathIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>path-arrow-solid</title>
      <g
        fill="currentColor"
        fillRule="evenodd"
        strokeWidth="1.5"
        clipRule="evenodd"
      >
        <path d="M17.47 2.47a.75.75 0 0 1 1.06 0l3.5 3.5a.75.75 0 0 1-.53 1.28h-2.75v9.25a.75.75 0 0 1-1.5 0V7.25H14.5a.75.75 0 0 1-.53-1.28z" />
        <path d="M3.25 7.5a4.25 4.25 0 0 1 8.5 0v9a2.75 2.75 0 1 0 5.5 0a.75.75 0 0 1 1.5 0a4.25 4.25 0 0 1-8.5 0v-9a2.75 2.75 0 1 0-5.5 0v12a.75.75 0 0 1-1.5 0z" />
      </g>
    </svg>
  );
}

/**
 * AI Tutor Tab Icon (question) - Normalized 24x24, 2px stroke
 */
export function AITutorIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>question</title>
      <path d="M15.4 7.5h-.05m3.35 0h-.05m-3.2 0a.1.1 0 1 1-.2 0a.1.1 0 0 1 .2 0m3.3 0a.1.1 0 1 1-.2 0a.1.1 0 0 1 .2 0" />
      <path d="M17 12.567c2.761 0 5-2.142 5-4.784S19.761 3 17 3s-5 2.142-5 4.783c0 1.27.517 2.423 1.36 3.279c.185.188.309.445.259.71a2.66 2.66 0 0 1-.543 1.175a3.25 3.25 0 0 0 2.111-.329h.001c.227-.12.34-.181.42-.193s.195.01.425.052q.479.09.967.09M10 13a3 3 0 1 1-6 0a3 3 0 0 1 6 0" />
      <path d="M12 21a5 5 0 0 0-10 0" />
    </svg>
  );
}

/**
 * Plus / New Button Icon - Normalized into 24x24 optical frame
 */
export function PlusIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>new</title>
      <g transform="translate(2, 2) scale(1.25)">
        <path
          fill="currentColor"
          d="M7.5 4a.5.5 0 0 1 .5.5V7h2.5a.5.5 0 0 1 0 1H8v2.5a.5.5 0 0 1-1 0V8H4.5a.5.5 0 0 1 0-1H7V4.5a.5.5 0 0 1 .5-.5"
        />
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M0 6.4c0-2.24 0-3.36.436-4.22A4.03 4.03 0 0 1 2.186.43c.856-.436 1.98-.436 4.22-.436h2.2c2.24 0 3.36 0 4.22.436c.753.383 1.36.995 1.75 1.75c.436.856.436 1.98.436 4.22v2.2c0 2.24 0 3.36-.436 4.22a4.03 4.03 0 0 1-1.75 1.75c-.856.436-1.98.436-4.22.436h-2.2c-2.24 0-3.36 0-4.22-.436a4.03 4.03 0 0 1-1.75-1.75C0 11.964 0 10.84 0 8.6zM6.4 1h2.2c1.14 0 1.93 0 2.55.051c.605.05.953.142 1.22.276a3.02 3.02 0 0 1 1.31 1.31c.134.263.226.611.276 1.22c.05.617.051 1.41.051 2.55v2.2c0 1.14 0 1.93-.051 2.55c-.05.605-.142.953-.276 1.22a3 3 0 0 1-1.31 1.31c-.263.134-.611.226-1.22.276c-.617.05-1.41.051-2.55.051H6.4c-1.14 0-1.93 0-2.55-.05c-.605-.05-.953-.143-1.22-.277a3 3 0 0 1-1.31-1.31c-.134-.263-.226-.61-.276-1.22c-.05-.617-.051-1.41-.051-2.55v-2.2c0-1.14 0-1.93.051-2.55c.05-.605.142-.953.276-1.22a3.02 3.02 0 0 1 1.31-1.31c.263-.134.611-.226 1.22-.276C4.467 1.001 5.26 1 6.4 1"
          clipRule="evenodd"
        />
      </g>
    </svg>
  );
}

/**
 * Logs / Activity Trail Icon - Normalized 24x24, 2px stroke
 */
export function LogsIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>logs</title>
      <path d="M3 5h1m-1 7h1m-1 7h1M8 5h1m-1 7h1m-1 7h1m4-14h8m-8 7h8m-8 7h8" />
    </svg>
  );
}

/**
 * Quiz Icon - Normalized 24x24
 */
export function QuizIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>quiz-outline</title>
      <path
        fill="currentColor"
        d="M14.738 14.688q.312-.313.312-.738t-.312-.737T14 12.9t-.737.313t-.313.737t.313.738T14 15t.738-.312M13.25 11.8h1.5q0-.725.15-1.062t.7-.888q.75-.75 1-1.212t.25-1.088q0-1.125-.788-1.837T14 5q-1.025 0-1.787.575T11.15 7.1l1.35.55q.225-.625.613-.937T14 6.4q.6 0 .975.338t.375.912q0 .35-.2.663t-.7.787q-.825.725-1.012 1.138T13.25 11.8M8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm0-2h12V4H8zm-4 6q-.825 0-1.412-.587T2 20V6h2v14h14v2zM8 4v12z"
      />
    </svg>
  );
}

/**
 * Flashcards Icon - Calibrated optical weight (strokeWidth=3.5 in 48x48 space = 1.75px optical weight)
 */
export function FlashcardsIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>flashcards</title>
      <path d="M14.243 7.561h19.514a2.65 2.65 0 0 1 2.657 2.658v27.563a2.65 2.65 0 0 1-2.657 2.657H14.243a2.65 2.65 0 0 1-2.657-2.657V10.219a2.65 2.65 0 0 1 2.656-2.658m1.108 9.325h17.703M15.35 20.312h17.703M15.35 23.74h17.703M15.35 27.166h17.703M15.35 13.459h7.097M15.35 30.593h7.097M15.35 34.02h17.703m-21.468 3.716h24.83m-16.556 0v2.702m8.283-2.702v2.702m-16.573-3.6L5.592 14.524a2.65 2.65 0 0 1 1.878-3.255h0l4.1-1.099m24.861 26.668l5.977-22.314a2.65 2.65 0 0 0-1.878-3.255h0l-4.1-1.099" />
    </svg>
  );
}

/**
 * Regenerate / Generate Icon - Normalized 24x24
 */
export function RegenerateIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>regenerate</title>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5.5 4.4A9.95 9.95 0 0 1 12 2v-.005c5.515 0 10 4.485 10 10c0 1.115-.18 2.205-.54 3.25l-1.42-.485c.305-.885.46-1.815.46-2.76c0-4.685-3.815-8.5-8.5-8.5c-2.03 0-3.945.715-5.46 1.995H8.5v1.5H4V2.5h1.5zm11.96 14.105H15.5V17.01H20v4.495h-1.5v-1.9a9.95 9.95 0 0 1-6.5 2.4c-5.515 0-10-4.485-10-10c0-1.115.18-2.205.54-3.25l1.42.485A8.5 8.5 0 0 0 3.5 12c0 4.685 3.815 8.5 8.5 8.5c2.03 0 3.945-.715 5.46-1.995M13.25 14h1.5c0-1.79 1.46-3.25 3.25-3.25v-1.5c-1.79 0-3.25-1.46-3.25-3.25h-1.5c0 1.79-1.46 3.25-3.25 3.25v1.5c1.79 0 3.25 1.46 3.25 3.25M14 8.55c.37.58.865 1.075 1.45 1.45c-.58.37-1.075.865-1.45 1.45A4.8 4.8 0 0 0 12.55 10A4.8 4.8 0 0 0 14 8.55m-7.5 5.7c.965 0 1.75-.785 1.75-1.75h1.5c0 .965.785 1.75 1.75 1.75v1.5c-.965 0-1.75.785-1.75-1.75h-1.5c0-.965-.785-1.75-1.75-1.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Devices & Sessions Icon - Normalized 24x24
 */
export function DevicesIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>devices-outline-rounded</title>
      <g transform="translate(0.5, 0.5) scale(0.95)">
        <path
          fill="currentColor"
          d="M11.539 19H3.5q-.213 0-.356-.144T3 18.499t.144-.356T3.5 18h8.039q.212 0 .356.144t.144.357t-.144.356t-.356.143m-5.923-2.384q-.691 0-1.153-.463T4 15V6.616q0-.691.463-1.153T5.616 5h13.73q.213 0 .357.144t.143.357t-.143.356t-.357.143H5.616q-.231 0-.424.192T5 6.616V15q0 .23.192.423t.423.193h5.924q.212 0 .356.143q.143.144.143.357t-.143.356t-.357.144zm14.576 1.057v-7.577q0-.134-.096-.23q-.096-.097-.23-.097h-3.732q-.134 0-.23.096t-.096.231v7.577q0 .135.096.23q.096.097.23.097h3.731q.135 0 .231-.096t.096-.231M16.02 19q-.504 0-.858-.353q-.353-.354-.353-.858V9.98q0-.505.353-.858q.353-.354.858-.354h3.962q.504 0 .858.353q.353.354.353.859v7.807q0 .505-.353.859q-.353.353-.858.353zm1.978-6.5q.29 0 .483-.2q.193-.202.193-.47q0-.29-.193-.483t-.488-.193q-.273 0-.469.193t-.196.488q0 .273.2.469q.201.196.47.196M18 13.885"
        />
      </g>
    </svg>
  );
}

/**
 * Technical / Code Workspace Icon (code-bold) - Normalized 24x24
 */
export function CodeBoldIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>code-bold</title>
      <path
        fill="currentColor"
        d="M14.18 4.276a.75.75 0 0 1 .531.918l-3.973 14.83a.75.75 0 0 1-1.45-.389l3.974-14.83a.75.75 0 0 1 .919-.53m2.262 3.053a.75.75 0 0 1 1.059-.056l1.737 1.564c.737.662 1.347 1.212 1.767 1.71c.44.525.754 1.088.754 1.784c0 .695-.313 1.258-.754 1.782c-.42.499-1.03 1.049-1.767 1.711l-1.737 1.564a.75.75 0 0 1-1.004-1.115l1.697-1.527c.788-.709 1.319-1.19 1.663-1.598c.33-.393.402-.622.402-.818s-.072-.424-.402-.817c-.344-.409-.875-.89-1.663-1.598l-1.697-1.527a.75.75 0 0 1-.056-1.06m-8.94 1.06a.75.75 0 1 0-1.004-1.115L4.761 8.836c-.737.662-1.347 1.212-1.767 1.71c-.44.525-.754 1.088-.754 1.784c0 .695.313 1.258.754 1.782c.42.499 1.03 1.049 1.767 1.711l1.737 1.564a.75.75 0 0 0 1.004-1.115l-1.697-1.527c-.788-.709-1.319-1.19-1.663-1.598c-.33-.393-.402-.622-.402-.818s.072-.424.402-.817c.344-.409.875-.89 1.663-1.598z"
      />
    </svg>
  );
}

/**
 * Non-Technical / Book Workspace Icon (book-linear) - Normalized 24x24, 1.8px stroke
 */
export function BookLinearIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <title>book-linear</title>
      <path d="M4 8c0-2.828 0-4.243.879-5.121C5.757 2 7.172 2 10 2h4c2.828 0 4.243 0 5.121.879C20 3.757 20 5.172 20 8v8c0 2.828 0 4.243-.879 5.121C18.243 22 16.828 22 14 22h-4c-2.828 0-4.243 0-5.121-.879C4 20.243 4 18.828 4 16z" />
      <path d="M19.898 16h-12c-.93 0-1.395 0-1.777.102A3 3 0 0 0 4 18.224" />
      <path d="M8 7h8m-8 3.5h5" />
    </svg>
  );
}

/**
 * Google Drive Brand Icon - Normalized 24x24
 */
export function GoogleDriveIcon({ className = 'h-4 w-4 shrink-0', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 87.3 78"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066da"
      />
      <path
        d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z"
        fill="#00ac47"
      />
      <path
        d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15z"
        fill="#ea4335"
      />
      <path
        d="M43.65 25H87.3c0-1.55-.4-3.1-1.2-4.5l-3.85-6.65c-.8-1.4-1.95-2.5-3.3-3.3L65.2 23.8H43.65z"
        fill="#00832d"
      />
      <path
        d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
        fill="#2684fc"
      />
      <path
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  );
}

/* ==========================================================================
   Semantic Application Icon Registry
   Reference icons by semantic domain name everywhere in your code.
   ========================================================================== */
export const AppIcons = {
  // Navigation & Tabs
  Documents: DocumentsIcon,
  Summary: SummaryIcon,
  LearningPath: LearningPathIcon,
  ClarifyDoubts: AITutorIcon,
  AITutor: AITutorIcon,
  ManageWorkspace: Settings,
  
  // Workspaces
  WorkspaceTechnical: CodeBoldIcon,
  WorkspaceNonTechnical: BookLinearIcon,
  Plus: PlusIcon,
  New: PlusIcon,
  
  // Learning & Assessment
  Quiz: QuizIcon,
  Flashcards: FlashcardsIcon,
  Regenerate: RegenerateIcon,
  Generate: RegenerateIcon,
  Reset: RegenerateIcon,
  
  // Audit & Sessions
  Logs: LogsIcon,
  Activity: LogsIcon,
  Devices: DevicesIcon,
  Sessions: DevicesIcon,
  GoogleDrive: GoogleDriveIcon,
  
  // System & Platform
  Archive: Archive,
  Notifications: Bell,
  Invitations: Mail,
  Settings: Settings,
  Logout: LogOut,
  Upload: Upload,
  Search: Search,
  Trash: Trash2,
  Check: Check,
  CheckDouble: CheckCheck,
  Loader: Loader2,
  Crown: Crown,
  Shield: Shield,
  ShieldAlert: ShieldAlert,
  Clock: Clock,
  MapPin: MapPin,
  Globe: Globe,
  ArrowRight: ArrowRight,
  ArrowLeft: ArrowLeft,
  Route: Route,
  Sparkles: Sparkles,
  Shuffle: Shuffle,
  RotateCw: RotateCw,
  Close: X,
  CloseCircle: XCircle,
  CheckCircle: CheckCircle,
  CheckCircle2: CheckCircle2,
  AlertCircle: AlertCircle,
  AlertTriangle: AlertTriangle,
  Lightbulb: Lightbulb,
  FileText: FileText,
  User: User,
  Users: Users,
  UserPlus: UserPlus,
  UserCheck: UserCheck,
  UserMinus: UserMinus,
  Edit: Edit3,
  Eye: Eye,
  Lock: Lock,
  Save: Save,
  Menu: Menu,
  ChevronDown: ChevronDown,
  ChevronUp: ChevronUp,
  ChevronLeft: ChevronLeft,
  ChevronRight: ChevronRight,
  ChevronsUpDown: ChevronsUpDown,
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
