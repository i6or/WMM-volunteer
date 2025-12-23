import { Link, useLocation } from "wouter";
import { Bell, Heart, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3" data-testid="link-home">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Heart className="text-primary-foreground h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Women's Money Matters</h1>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/coaching-opportunities"
              className={`text-sm transition-colors ${
                location === "/coaching-opportunities" || location === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="nav-coaching"
            >
              Coaching Opportunities
            </Link>
            <Link
              href="/presenter-opportunities"
              className={`text-sm transition-colors ${
                location === "/presenter-opportunities" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="nav-presenter"
            >
              Presenter Opportunities
            </Link>
            <Link
              href="/admin"
              className={`text-sm transition-colors ${
                location === "/admin" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="nav-admin"
            >
              Admin
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center" data-testid="avatar-user">
              <User className="text-muted-foreground h-4 w-4" />
            </div>
            <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-menu">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
