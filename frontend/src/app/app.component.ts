import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { FeedbackService } from './services/feedback.service';
import {
  FormData, FillPacFeedback, BucketElevatorFeedback
} from './models/feedback.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  currentPageIndex = 0;
  pageFlow: string[] = ['page0', 'page1', 'page2', 'page3', 'pageSuccess'];

  countries = ['India', 'Germany', 'USA', 'Japan', 'France', 'UK', 'China', 'Brazil'];
  designations = ['Manager', 'Engineer', 'Operator', 'Technician', 'Analyst', 'Director'];
  oeeUnitOptions = ['1', '2', '3', '4', '5+'];
  monitoringOptions = ['1', '2', '3+'];
  spoutOptions = ['8', '12', '16', '24'];

  isEmailVerified = false;
  otpSent = false;
  otpInput = '';
  otpStatus = '';
  otpStatusType: 'success' | 'error' | '' = '';
  sendingOtp = false;
  verifyingOtp = false;

  errors: Record<string, string> = {};

  formData: FormData = {
    sectionA: { country: '', companyName: '', plantLocation: '' },
    sectionB: { name: '', designation: '', contact: '', email: '' },
    sectionC: {
      products: [],
      fillPac: { units: null, oeeUnits: '', services: [] },
      bucketElevator: {
        units: null, conditionMonitoringUnits: '', type: '',
        installationDate: '', workingEfficiently: '', beltSlippage: '',
        maintenanceCost: '', services: []
      }
    },
    sectionD_FillPac: [],
    sectionD_BucketElevator: []
  };

  fillPacPages: number[] = [];
  bucketElevatorPages: number[] = [];

  constructor(private feedbackService: FeedbackService, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void {}

  get progress(): number {
    return (this.currentPageIndex / (this.pageFlow.length - 1)) * 100;
  }
  get currentPageId(): string { return this.pageFlow[this.currentPageIndex]; }
  get isLastContent(): boolean { return this.currentPageIndex === this.pageFlow.length - 2; }
  get isSuccess(): boolean { return this.currentPageId === 'pageSuccess'; }

  handleDotClick(index: number): void {
    if (index < this.currentPageIndex) this.goToPage(index);
  }
  goToPage(index: number): void { this.currentPageIndex = index; }

  nextPage(): void {
    if (!this.validatePage()) return;
    if (this.currentPageIndex === 3) this.setupDynamicPages();
    if (this.isLastContent) { this.submitForm(); }
    else if (this.currentPageIndex < this.pageFlow.length - 1) { this.goToPage(this.currentPageIndex + 1); }
  }
  prevPage(): void { if (this.currentPageIndex > 0) this.goToPage(this.currentPageIndex - 1); }

  validatePage(): boolean {
    this.errors = {};
    const page = this.currentPageId;
    if (page === 'page1') {
      if (!this.formData.sectionA.country) this.errors['country'] = 'Required';
      if (!this.formData.sectionA.companyName) this.errors['companyName'] = 'Required';
      if (!this.formData.sectionA.plantLocation) this.errors['plantLocation'] = 'Required';
    } else if (page === 'page2') {
      if (!this.formData.sectionB.name) this.errors['name'] = 'Required';
      if (!this.formData.sectionB.designation) this.errors['designation'] = 'Required';
      if (!this.formData.sectionB.email) {
        this.errors['email'] = 'Required';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.formData.sectionB.email)) this.errors['email'] = 'Invalid email format';
      }
      if (!this.isEmailVerified) { this.otpStatus = 'Please verify your email to proceed'; this.otpStatusType = 'error'; this.errors['emailVerified'] = 'Required'; }
    } else if (page === 'page3') {
      if (!this.formData.sectionC.products.length) this.errors['products'] = 'Please select at least one product';
      if (this.formData.sectionC.products.includes('FillPac')) {
        const fp = this.formData.sectionC.fillPac;
        if (!fp.units || fp.units < 1) this.errors['fpUnits'] = 'Required';
        if (!fp.oeeUnits) this.errors['fpOeeUnits'] = 'Required';
      }
      if (this.formData.sectionC.products.includes('BucketElevator')) {
        const be = this.formData.sectionC.bucketElevator;
        if (!be.units || be.units < 1) this.errors['beUnits'] = 'Required';
        if (!be.conditionMonitoringUnits) this.errors['beMonitoring'] = 'Required';
        if (!be.type) this.errors['beType'] = 'Required';
        if (!be.installationDate) this.errors['beDate'] = 'Required';
        if (!be.workingEfficiently) this.errors['beEfficient'] = 'Required';
        if (!be.beltSlippage) this.errors['beSlippage'] = 'Required';
        if (!be.maintenanceCost) this.errors['beCost'] = 'Required';
      }
    } else if (page.startsWith('page_fp_')) {
      const unitIdx = parseInt(page.split('_')[2], 10) - 1;
      const fp = this.formData.sectionD_FillPac[unitIdx];
      (['spouts','installationDate','oeeAccurate','perfAccurate','qualAccurate','availAccurate','bagsMatch','dataFreq','bottlenecks','usefulMetric','missingFeatures','faultInfo','bagInfo','userFriendly'] as (keyof FillPacFeedback)[])
        .forEach(k => { if (!fp[k]) this.errors[`fp_${unitIdx}_${k}`] = 'Required'; });
    } else if (page.startsWith('page_be_')) {
      const unitIdx = parseInt(page.split('_')[2], 10) - 1;
      const be = this.formData.sectionD_BucketElevator[unitIdx];
      (['understanding','effectiveness','trainingSatisfaction','userFriendly','usageFreq','reducedBreakdowns','supportRating'] as (keyof BucketElevatorFeedback)[])
        .forEach(k => { if (!be[k]) this.errors[`be_${unitIdx}_${k}`] = 'Required'; });
    }
    return Object.keys(this.errors).length === 0;
  }

  toggleProduct(value: string, checked: boolean): void {
    if (checked) { if (!this.formData.sectionC.products.includes(value)) this.formData.sectionC.products.push(value); }
    else { this.formData.sectionC.products = this.formData.sectionC.products.filter(p => p !== value); }
  }
  isProductSelected(value: string): boolean { return this.formData.sectionC.products.includes(value); }
  toggleService(section: 'fpServices' | 'beServices', value: string, checked: boolean): void {
    const arr = section === 'fpServices' ? this.formData.sectionC.fillPac.services : this.formData.sectionC.bucketElevator.services;
    if (checked) { if (!arr.includes(value)) arr.push(value); }
    else { const i = arr.indexOf(value); if (i > -1) arr.splice(i, 1); }
  }
  isServiceSelected(section: 'fpServices' | 'beServices', value: string): boolean {
    const arr = section === 'fpServices' ? this.formData.sectionC.fillPac.services : this.formData.sectionC.bucketElevator.services;
    return arr.includes(value);
  }

  setupDynamicPages(): void {
    this.pageFlow = ['page0', 'page1', 'page2', 'page3'];
    this.fillPacPages = [];
    this.bucketElevatorPages = [];
    
    if (this.formData.sectionC.products.includes('FillPac')) {
      const n = this.formData.sectionC.fillPac.units || 0;
      if (this.formData.sectionD_FillPac.length > n) {
        this.formData.sectionD_FillPac = this.formData.sectionD_FillPac.slice(0, n);
      } else {
        while (this.formData.sectionD_FillPac.length < n) {
          this.formData.sectionD_FillPac.push({});
        }
      }
      for (let i = 1; i <= n; i++) { this.pageFlow.push(`page_fp_${i}`); this.fillPacPages.push(i); }
    } else {
      this.formData.sectionD_FillPac = [];
    }

    if (this.formData.sectionC.products.includes('BucketElevator')) {
      const n = this.formData.sectionC.bucketElevator.units || 0;
      if (this.formData.sectionD_BucketElevator.length > n) {
        this.formData.sectionD_BucketElevator = this.formData.sectionD_BucketElevator.slice(0, n);
      } else {
        while (this.formData.sectionD_BucketElevator.length < n) {
          this.formData.sectionD_BucketElevator.push({});
        }
      }
      for (let i = 1; i <= n; i++) { this.pageFlow.push(`page_be_${i}`); this.bucketElevatorPages.push(i); }
    } else {
      this.formData.sectionD_BucketElevator = [];
    }
    
    this.pageFlow.push('pageSuccess');
  }

  getFpFeedback(unitNum: number): FillPacFeedback { return this.formData.sectionD_FillPac[unitNum - 1]; }
  getBeFeedback(unitNum: number): BucketElevatorFeedback { return this.formData.sectionD_BucketElevator[unitNum - 1]; }
  hasError(key: string): boolean { return !!this.errors[key]; }

  sendOtp(): void {
    if (!this.formData.sectionB.email) { this.errors['email'] = 'Required'; return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.sectionB.email)) { this.errors['email'] = 'Invalid email format'; return; }
    
    this.sendingOtp = true; this.otpStatus = 'Sending...'; this.otpStatusType = '';
    this.feedbackService.sendOtp(this.formData.sectionB.email).subscribe({
      next: () => { 
        this.otpSent = true; this.otpStatus = `OTP sent to ${this.formData.sectionB.email}`; this.otpStatusType = 'success'; this.sendingOtp = false; 
        this.cdr.detectChanges();
      },
      error: (err) => { 
        this.otpStatus = err.error?.detail || 'Failed to send OTP.'; this.otpStatusType = 'error'; this.sendingOtp = false; 
        this.cdr.detectChanges();
      }
    });
  }

  verifyOtp(): void {
    if (this.otpInput.length !== 6) { this.otpStatus = 'Please enter a 6-digit OTP'; this.otpStatusType = 'error'; return; }
    this.verifyingOtp = true;
    this.feedbackService.verifyOtp(this.formData.sectionB.email, this.otpInput).subscribe({
      next: (data) => {
        this.isEmailVerified = true;
        if (data.access_token) localStorage.setItem('feedback_token', data.access_token);
        this.otpStatus = 'Email verified!'; this.otpStatusType = 'success'; this.verifyingOtp = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.validatePage()) {
            if (this.currentPageIndex === 3) this.setupDynamicPages();
            if (this.isLastContent) { this.submitForm(); }
            else if (this.currentPageIndex < this.pageFlow.length - 1) { this.goToPage(this.currentPageIndex + 1); }
          }
          this.cdr.detectChanges();
        }, 1000);
      },
      error: (err) => { 
        this.otpStatus = err.error?.detail || 'Invalid OTP. Please try again.'; this.otpStatusType = 'error'; this.verifyingOtp = false; 
        this.cdr.detectChanges();
      }
    });
  }

  resetEmailVerification(): void { this.isEmailVerified = false; this.otpSent = false; this.otpInput = ''; this.otpStatus = ''; this.otpStatusType = ''; }

  submitForm(): void {
    this.feedbackService.submitFeedback(this.formData).subscribe({
      next: () => { this.goToPage(this.pageFlow.indexOf('pageSuccess')); },
      error: (err) => {
        if (err.status === 401) { alert('Your session has expired. Please verify your email again.'); this.goToPage(2); }
        else { alert('Failed to submit feedback. Please try again.'); }
      }
    });
  }

  resetForm(): void { window.location.reload(); }
}
