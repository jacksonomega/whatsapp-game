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
    { name: 'Ceo', image: 'ceo.jpeg', code: '8492', message: 'Mi Jefe el mejor' },
    { name: 'Jb', image: 'jb.jpeg', code: '3715', message: 'No Potes más!!' },
    { name: 'Sofrita', image: 'sofrita.jpeg', code: '6294', message: 'Aprende a montar bici' },
    { name: 'Wenhui', image: 'wenhui.jpeg', code: '1837', message: 'Deja las Drogas' },
    { name: 'Yixin', image: 'yixin.jpeg', code: '9451', message: 'No te caigas' },
    { name: 'Fosia', image: 'fosia.jpeg', code: '5283', message: 'No cocines más!!!' },
    { name: 'Diddy', image: 'diddy.jpeg', code: '4916', message: 'Retrasado desde pequeño' }
  ];

  selectedPlayerForLogin = signal<any>(null);
  loginCode = new FormControl('');
  loginError = signal(false);
  loggedInPlayer = signal<any>(null);

  streak = signal<number>(0);
  lastPraisedDate = signal<string | null>(null);
  showPraiseSection = signal<boolean>(false);
  questionsAskedToday = signal<number>(0);
  limitError = signal<boolean>(false);

  ngOnInit() {
    const savedPlayer = localStorage.getItem('loggedInPlayer');
    if (savedPlayer) {
      const player = JSON.parse(savedPlayer);
      this.loggedInPlayer.set(player);
      this.questionForm.patchValue({ playerName: player.name });
      this.loadUserData(player.name);
    }
  }

  loadUserData(playerName: string) {
    const today = new Date().toDateString();

    let savedStreak = localStorage.getItem(`streak_${playerName}`);
    let savedLastPraised = localStorage.getItem(`lastPraisedDate_${playerName}`);

    // Si no hay racha específica pero existe la antigua global, la migramos
    if (!savedStreak && localStorage.getItem('streak')) {
      savedStreak = localStorage.getItem('streak');
      savedLastPraised = localStorage.getItem('lastPraisedDate');
      if (savedStreak) localStorage.setItem(`streak_${playerName}`, savedStreak);
      if (savedLastPraised) localStorage.setItem(`lastPraisedDate_${playerName}`, savedLastPraised);
    }

    if (savedStreak && savedLastPraised) {
      const lastDate = new Date(savedLastPraised);
      const todayDate = new Date();
      lastDate.setHours(0, 0, 0, 0);
      todayDate.setHours(0, 0, 0, 0);

      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        this.streak.set(0);
        localStorage.setItem(`streak_${playerName}`, '0');
      } else {
        this.streak.set(parseInt(savedStreak, 10));
      }
      this.lastPraisedDate.set(savedLastPraised);
    } else {
      this.streak.set(0);
      this.lastPraisedDate.set(null);
    }

    const savedLastQuestionDate = localStorage.getItem(`lastQuestionDate_${playerName}`);
    const savedQuestionsAsked = localStorage.getItem(`questionsAsked_${playerName}`);

    if (savedLastQuestionDate === today) {
      this.questionsAskedToday.set(parseInt(savedQuestionsAsked || '0', 10));
    } else {
      this.questionsAskedToday.set(0);
      localStorage.setItem(`lastQuestionDate_${playerName}`, today);
      localStorage.setItem(`questionsAsked_${playerName}`, '0');
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
      this.loadUserData(player.name);
      this.selectedPlayerForLogin.set(null);
    } else {
      this.loginError.set(true);
    }
  }

  logout() {
    this.loggedInPlayer.set(null);
    localStorage.removeItem('loggedInPlayer');
    this.questionForm.patchValue({ playerName: '' });
    this.streak.set(0);
    this.lastPraisedDate.set(null);
    this.questionsAskedToday.set(0);
    this.limitError.set(false);
  }

  openPraiseSection() {
    this.showPraiseSection.set(true);
  }

  closePraiseSection() {
    this.showPraiseSection.set(false);
  }

  praiseCeo() {
    const playerName = this.loggedInPlayer()?.name;
    if (!playerName) return;

    const today = new Date().toDateString();
    if (this.lastPraisedDate() !== today) {
      this.streak.update(s => s + 1);
      this.lastPraisedDate.set(today);
      localStorage.setItem(`streak_${playerName}`, this.streak().toString());
      localStorage.setItem(`lastPraisedDate_${playerName}`, today);
      this.limitError.set(false);
    }
    setTimeout(() => {
      this.closePraiseSection();
    }, 1500);
  }

  canPraiseToday(): boolean {
    return this.lastPraisedDate() !== new Date().toDateString();
  }

  hasReachedLimit(): boolean {
    const hasPraisedToday = this.lastPraisedDate() === new Date().toDateString();
    const maxQuestions = hasPraisedToday ? 2 : 1;
    return this.questionsAskedToday() >= maxQuestions;
  }

  questionForm = new FormGroup({
    playerName: new FormControl('', Validators.required),
    question: new FormControl('', Validators.required)
  });

  isSubmitting = signal(false);
  showSuccess = signal(false);

  onSubmit() {
    if (this.hasReachedLimit()) {
      this.limitError.set(true);
      return;
    }
    this.limitError.set(false);

    if (this.questionForm.valid) {
      this.isSubmitting.set(true);

      const payload = this.questionForm.value;
      const webhookUrl = 'https://n8n.omega-studio.tech/webhook/encuestas-wahtsapp';

      this.http.post(webhookUrl, payload).subscribe({
        next: (response) => {
          console.log('Successfully sent to n8n:', response);
          this.handleSuccess();
        },
        error: (error) => {
          console.error('Error sending to n8n:', error);
          this.handleSuccess();
        }
      });
    } else {
      this.questionForm.markAllAsTouched();
    }
  }

  private handleSuccess() {
    const playerName = this.loggedInPlayer()?.name;
    if (playerName) {
      this.questionsAskedToday.update(v => v + 1);
      localStorage.setItem(`questionsAsked_${playerName}`, this.questionsAskedToday().toString());
      localStorage.setItem(`lastQuestionDate_${playerName}`, new Date().toDateString());
    }

    this.isSubmitting.set(false);
    this.showSuccess.set(true);
    this.questionForm.reset();
    if (playerName) {
      this.questionForm.patchValue({ playerName });
    }

    setTimeout(() => {
      this.showSuccess.set(false);
    }, 3000);
  }
}
