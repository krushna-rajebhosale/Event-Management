import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userId!: number;

  profile = {
    name: '',
    email: '',
    profile_image: ''
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    this.userId = user?.id || 0;

    if (this.userId) {
      this.loadProfile();
    }
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.getProfile(this.userId).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.profile = {
          name: res.name || '',
          email: res.email || '',
          profile_image: res.profile_image || ''
        };
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to load profile.';
      }
    });
  }

  saveProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.updateProfile(this.userId, {
      name: this.profile.name,
      email: this.profile.email
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res?.message || 'Profile updated ✅';

        const oldUser = JSON.parse(localStorage.getItem('user') || 'null') || {};
        localStorage.setItem('user', JSON.stringify({
          ...oldUser,
          id: this.userId,
          name: this.profile.name,
          email: this.profile.email
        }));
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to update profile.';
      }
    });
  }

  changePassword(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (
      !this.passwordForm.currentPassword ||
      !this.passwordForm.newPassword ||
      !this.passwordForm.confirmPassword
    ) {
      this.errorMessage = 'Please fill all password fields.';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.errorMessage = 'New password and confirm password do not match.';
      return;
    }

    this.isLoading = true;

    this.profileService.changePassword(this.userId, {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res?.message || 'Password changed ✅';

        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };

        this.showCurrentPassword = false;
        this.showNewPassword = false;
        this.showConfirmPassword = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to change password.';
      }
    });
  }

  toggleCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}