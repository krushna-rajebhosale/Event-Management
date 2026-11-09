import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  imports: [CommonModule, FormsModule, RouterLink]
})
export class SignupComponent {
  fullName = '';
  email = '';
  password = '';

  showPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // basic validation
    if (!this.fullName.trim() || !this.email.trim() || this.password.length < 8) {
      this.errorMessage = 'Please fill all fields. Password must be at least 8 characters.';
      return;
    }

    this.isLoading = true;

    this.authService.register(this.fullName, this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Account created successfully ✅ Redirecting to login...';

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 800);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Signup failed. Try again.';
      }
    });
  }
}