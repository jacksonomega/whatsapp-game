import { Component, signal, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'whatsapp-game';
  private http = inject(HttpClient);

  players = [
    { name: 'Ceo', image: 'ceo.jpeg', code: '1234' },
    { name: 'Jb', image: 'jb.jpeg', code: '5678' },
    { name: 'Sofrita', image: 'sofrita.jpeg', code: '9012' },
    { name: 'Wenhui', image: 'wenhui.jpeg', code: '3456' },
    { name: 'Yixin', image: 'yixin.jpeg', code: '7890' }
  ];

  selectedPlayerForLogin = signal<any>(null);
  loginCode = new FormControl('');
  loginError = signal(false);
  loggedInPlayer = signal<any>(null);

  streak = signal<number>(0);
  lastPraisedDate = signal<string | null>(null);
  showPraiseSection = signal<boolean>(false);


  ngOnInit() {
    const savedPlayer = localStorage.getItem('loggedInPlayer');
    if (savedPlayer) {
      const player = JSON.parse(savedPlayer);
      this.loggedInPlayer.set(player);
      this.questionForm.patchValue({ playerName: player.name });
    }

    const savedStreak = localStorage.getItem('streak');
    const savedLastPraised = localStorage.getItem('lastPraisedDate');

    if (savedStreak && savedLastPraised) {
      const lastDate = new Date(savedLastPraised);
      const today = new Date();
      lastDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        this.streak.set(0);
        localStorage.setItem('streak', '0');
      } else {
        this.streak.set(parseInt(savedStreak, 10));
      }
      this.lastPraisedDate.set(savedLastPraised);
    }
  }

  initiateLogin(player: any) {
    if (this.loggedInPlayer()?.name === player.name) {
      // Si ya está logueado y hace click en sí mismo, podemos darle la opción de desloguearse
      this.logout();
      return;
    }
    this.selectedPlayerForLogin.set(player);
    this.loginCode.reset();
    this.loginError.set(false);
  }

  cancelLogin() {
    this.selectedPlayerForLogin.set(null);
  }

  confirmLogin() {
    const player = this.selectedPlayerForLogin();
    if (player && this.loginCode.value === player.code) {
      this.loggedInPlayer.set(player);
      localStorage.setItem('loggedInPlayer', JSON.stringify(player));
      this.questionForm.patchValue({ playerName: player.name });
      this.selectedPlayerForLogin.set(null);
    } else {
      this.loginError.set(true);
    }
  }

  logout() {
    this.loggedInPlayer.set(null);
    localStorage.removeItem('loggedInPlayer');
    this.questionForm.patchValue({ playerName: '' });
  }

  openPraiseSection() {
    this.showPraiseSection.set(true);
  }

  closePraiseSection() {
    this.showPraiseSection.set(false);
  }

  praiseCeo() {
    const today = new Date().toDateString();
    if (this.lastPraisedDate() !== today) {
      this.streak.update(s => s + 1);
      this.lastPraisedDate.set(today);
      localStorage.setItem('streak', this.streak().toString());
      localStorage.setItem('lastPraisedDate', today);
    }
    setTimeout(() => {
      this.closePraiseSection();
    }, 1500);
  }

  canPraiseToday(): boolean {
    return this.lastPraisedDate() !== new Date().toDateString();
  }

  questionForm = new FormGroup({
    playerName: new FormControl('', Validators.required),
    question: new FormControl('', Validators.required)
  });

  isSubmitting = signal(false);
  showSuccess = signal(false);

  onSubmit() {
    if (this.questionForm.valid) {
      this.isSubmitting.set(true);

      const payload = this.questionForm.value;
      const webhookUrl = 'https://n8n.omega-studio.tech/webhook/encuestas-wahtsapp';

      this.http.post(webhookUrl, payload).subscribe({
        next: (response) => {
          console.log('Successfully sent to n8n:', response);
          this.isSubmitting.set(false);
          this.showSuccess.set(true);
          this.questionForm.reset();

          setTimeout(() => {
            this.showSuccess.set(false);
          }, 3000);
        },
        error: (error) => {
          console.error('Error sending to n8n:', error);
          this.isSubmitting.set(false);
          // Even on error, you might want to show an error state or a success state 
          // depending on how CORS is configured on the webhook. Let's show success 
          // or alert the user. Since webhooks often return opaque responses due to CORS, 
          // we'll assume success if it fired, or just log the error.
          this.showSuccess.set(true);
          this.questionForm.reset();

          setTimeout(() => {
            this.showSuccess.set(false);
          }, 3000);
        }
      });
    } else {
      this.questionForm.markAllAsTouched();
    }
  }
}
