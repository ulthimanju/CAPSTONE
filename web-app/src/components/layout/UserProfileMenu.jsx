import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, ChevronsUpDown, Laptop } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { GoogleDriveIcon } from '@/components/ui/GoogleDriveIcon';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu';
import { useAuthStore } from '@/store/authStore';
import { useLogout, useGoogleDriveStatusQuery } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/cn';

export function UserProfileMenu({ className }) {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const navigate = useNavigate();
  const { data: driveStatus } = useGoogleDriveStatusQuery();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between gap-2.5 rounded-ui border border-sep-line bg-surface-raised p-2 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            className
          )}
          aria-label="Open user profile menu"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar src={user.picture_url} name={user.name} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="font-display text-xs font-semibold text-text truncate">
                {user.name}
              </span>
              <span className="font-mono text-[11px] text-text/70 truncate">
                {user.email}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-text/50" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[248px]">
        {/* User Identity Details */}
        <div className="px-3 py-2">
          <p className="font-display text-sm font-semibold text-text truncate">
            {user.name}
          </p>
          <p className="font-mono text-xs text-text/70 truncate">
            {user.email}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-ui border border-sep-line bg-sand px-2 py-0.5 font-mono text-[10px] text-text">
            <Shield className="h-3 w-3 text-accent" aria-hidden="true" />
            <span>Role: {user.role || 'Student'}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Google Drive Status Indicator */}
        <DropdownMenuLabel className="flex items-center justify-between font-mono text-xs">
          <span className="flex items-center gap-1.5 text-text/80">
            <GoogleDriveIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Google Drive:
          </span>
          <span className={driveStatus?.isLinked ? 'text-success font-semibold' : 'text-text/60'}>
            {driveStatus?.isLinked ? 'Linked' : 'Not Linked'}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Active Sessions Navigation */}
        <DropdownMenuItem
          onClick={() => navigate('/sessions')}
          className="cursor-pointer font-mono text-xs"
        >
          <Laptop className="mr-2 h-4 w-4 shrink-0 text-text/60" aria-hidden="true" />
          <span>Active Sessions</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out Action */}
        <DropdownMenuItem
          onClick={logout}
          className="text-danger hover:bg-danger-tint focus:bg-danger-tint focus:text-danger cursor-pointer font-mono text-xs"
        >
          <LogOut className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserProfileMenu;
