import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { LayoutComponent } from './layout/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CreateEventComponent } from './pages/create-event/create-event.component';
import { ManageEventsComponent } from './pages/manage-events/manage-events.component';
import { RegistrationsComponent } from './pages/registrations/registrations.component';
import { CheckInsComponent } from './pages/check-ins/check-ins.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { HelpSupportComponent } from './pages/help-support/help-support.component';
import { EditEventComponent } from './pages/edit-event/edit-event.component';

// ✅ Add these imports
import { PublicRegisterComponent } from './pages/public-register/public-register.component';
import { EventMediaComponent } from './pages/event-media/event-media.component';
import { ProfileComponent } from './pages/profile/profile.component';




export const routes: Routes = [
  // ✅ Public pages (no layout)
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },

  // ✅ Public participant registration page
  { path: 'register/:eventId', component: PublicRegisterComponent },
  { path: 'event-media/:eventId', component: EventMediaComponent },
   

  // ✅ Admin pages with Layout
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'create-event', component: CreateEventComponent },
      { path: 'manage-events', component: ManageEventsComponent },
      { path: 'registrations', component: RegistrationsComponent },
      { path: 'check-ins', component: CheckInsComponent }, // admin check-ins page
      { path: 'reports', component: ReportsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'support', component: HelpSupportComponent },
      { path: 'event-media', component: EventMediaComponent },
      { path: 'edit-event/:id', component: EditEventComponent },
      { path: 'profile', component: ProfileComponent } // placeholder for user profile page
    ]
  },

  // ✅ optional fallback
  { path: '**', redirectTo: '' }
];