import React from 'react';
import { LogOut, Cloud, Shield } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
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

export function UserProfileMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const { data: driveStatus } = useGoogleDriveStatusQuery();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-ui border border-sep-line bg-surface-raised p-1 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Open user profile menu"
        >
          <Avatar src={user.picture_url} name={user.name} size="sm" />
          <span className="hidden text-xs font-medium text-text sm:inline-block max-w-[120px] truncate">
            {user.name}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
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
            <Cloud className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Google Drive:
          </span>
          <span className={driveStatus?.isLinked ? 'text-success font-semibold' : 'text-text/60'}>
            {driveStatus?.isLinked ? 'Linked' : 'Not Linked'}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Sign Out Action */}
        <DropdownMenuItem
          onClick={logout}
          className="text-danger hover:bg-danger-tint focus:bg-danger-tint focus:text-danger cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserProfileMenu;
