import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../pages/service/auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate() {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          return true; // User is authenticated, allow access
        } else {
          // User is not authenticated, redirect to login
          this.router.navigate(['/auth/login']);
          return false;
        }
      })
    );
  }
} 