import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from '@/theme/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn('relative transition-colors', className)}
      onClick={toggleTheme}
      title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="size-4 text-[#f4c95d] transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="size-4 text-foreground/80 transition-transform duration-300 rotate-0 scale-100" />
      )}
    </Button>
  );
}

export function ThemeToggleDropdown({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className={cn('relative', className)}
            aria-label="Theme settings"
            title="Theme settings"
          />
        }
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="size-4 text-[#f4c95d]" />
        ) : (
          <Moon className="size-4 text-foreground/80" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          className={theme === 'light' ? 'font-bold text-primary' : ''}
          onClick={() => setTheme('light')}
        >
          <Sun className="mr-2 size-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem
          className={theme === 'dark' ? 'font-bold text-primary' : ''}
          onClick={() => setTheme('dark')}
        >
          <Moon className="mr-2 size-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          className={theme === 'system' ? 'font-bold text-primary' : ''}
          onClick={() => setTheme('system')}
        >
          <Laptop className="mr-2 size-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
