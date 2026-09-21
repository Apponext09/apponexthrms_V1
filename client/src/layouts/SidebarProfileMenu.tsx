import type { ReactNode } from 'react';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarProfileMenuProps {
  children: ReactNode;
  profilePath: string;
  onLogout: () => void;
  onProfileNavigate?: () => void;
}

export function SidebarProfileMenu({ children, profilePath, onLogout, onProfileNavigate }: SidebarProfileMenuProps) {
  const navigate = useNavigate();
  const openProfile = () => {
    navigate(profilePath);
    onProfileNavigate?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-48">
          <DropdownMenuItem onSelect={openProfile} className="gap-2">
            <User className="size-4" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onLogout}
            className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40"
          >
            <LogOut className="size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mt-2 grid gap-1 md:hidden">
        <button
          type="button"
          onClick={openProfile}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-foreground hover:bg-muted"
        >
          <User className="size-4" />
          My Profile
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </>
  );
}
