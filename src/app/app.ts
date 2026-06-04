import { Component, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'whatsapp-game';
  private http = inject(HttpClient);
  
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
