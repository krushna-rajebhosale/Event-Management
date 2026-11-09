import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, NgIf, NgClass } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

type CurrentUser = {
  id?: number;
  name: string;
  email?: string;
  avatar: string | null;
  affiliation: string;
};

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIf, NgClass],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  sidebarCollapsed = false;
  showMobileNav = false;

  currentUser: CurrentUser = {
    name: 'User',
    email: '',
    avatar: null,
    affiliation: 'Organization Name'
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadUser();
    this.checkScreenSize();

    // refresh user data whenever route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadUser();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUser(): void {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);

        this.currentUser = {
          id: parsed?.id,
          name: parsed?.name || parsed?.full_name || 'User',
          email: parsed?.email || '',
          avatar: parsed?.avatar || parsed?.profile_image || null,
          affiliation: parsed?.affiliation || parsed?.organization || 'Organization Name'
        };
      } catch {
        this.currentUser = {
          name: 'User',
          email: '',
          avatar: null,
          affiliation: 'Organization Name'
        };
      }
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', JSON.stringify(this.sidebarCollapsed));
  }

  toggleMobileNav(): void {
    this.showMobileNav = !this.showMobileNav;
  }

  closeMobileNavAfterRoute(): void {
    if (window.innerWidth < 768) {
      this.showMobileNav = false;
    }
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    const screenWidth = window.innerWidth;

    if (screenWidth < 768) {
      this.sidebarCollapsed = false;
      this.showMobileNav = false;
    } else {
      const storedState = localStorage.getItem('sidebarCollapsed');
      if (storedState !== null) {
        this.sidebarCollapsed = JSON.parse(storedState);
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const navbar = document.querySelector('.navbar');
    const navbarToggler = document.querySelector('.navbar-toggler');

    if (
      this.showMobileNav &&
      navbar &&
      !navbar.contains(target) &&
      !navbarToggler?.contains(target)
    ) {
      this.showMobileNav = false;
    }
  }

  @HostListener('keydown.escape')
  onEscapeKey(): void {
    if (this.showMobileNav) {
      this.showMobileNav = false;
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeMobileNavAfterRoute();
  }

  getUserDisplayName(): string {
    return this.currentUser?.name || 'User';
  }

  getUserInitials(): string {
    const name = this.currentUser?.name || 'U';

    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}