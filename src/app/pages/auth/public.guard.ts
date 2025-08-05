import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PublicGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate() {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          // User is authenticated, redirect to dashboard
          this.router.navigate(['/dashboard']);
          return false;
        } else {
          // User is not authenticated, allow access to public pages
          return true;
        }
      })
    );
  }
} 