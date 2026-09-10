import { Bell, HelpCircle, Moon, Sun } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/lib/theme-store";

const iconButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-full text-mint transition-colors hover:bg-muted";

export function HeaderActions() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Ajuda" className={iconButtonClass}>
              <HelpCircle className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Ajuda</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="Notificações" className={iconButtonClass}>
              <Bell className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Notificações</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={isDark ? "Desabilitar modo noturno" : "Habilitar modo noturno"}
              aria-pressed={isDark}
              onClick={() => toggleTheme()}
              className={iconButtonClass}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isDark ? "Desabilitar modo noturno" : "Habilitar modo noturno"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
