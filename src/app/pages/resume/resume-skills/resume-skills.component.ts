import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipsModule } from 'primeng/chips';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResumeService } from '../../service/resume.service';
import { ResumeSkill, ResumeSkillForm } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-skills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ChipsModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TableModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './resume-skills.component.html',
  styleUrl: './resume-skills.component.scss'
})
export class ResumeSkillsComponent implements OnInit {
  skills: ResumeSkill[] = [];
  skillForm: ResumeSkillForm = {
    name: '',
    tags: []
  };
  
  loading = false;
  saving = false;
  showDialog = false;
  editingSkill: ResumeSkill | null = null;

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadSkills();
  }

  async loadSkills() {
    this.loading = true;
    try {
      this.skills = await this.resumeService.getSkills();
    } catch (error) {
      console.error('Error loading skills:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load skills'
      });
    } finally {
      this.loading = false;
    }
  }

  openNewSkillDialog() {
    this.editingSkill = null;
    this.skillForm = {
      name: '',
      tags: []
    };
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  openEditSkillDialog(skill: ResumeSkill) {
    this.editingSkill = skill;
    this.skillForm = {
      name: skill.name,
      tags: [...(skill.tags || [])]
    };
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  async saveSkill() {
    if (!this.skillForm.name.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Skill name is required'
      });
      return;
    }

    this.saving = true;
    try {
      if (this.editingSkill) {
        const updatedSkill = await this.resumeService.updateSkill(
          this.editingSkill.id!, 
          this.skillForm as ResumeSkill
        );
        const index = this.skills.findIndex(s => s.id === this.editingSkill!.id);
        if (index !== -1) {
          this.skills[index] = updatedSkill;
        }
      } else {
        const newSkill = await this.resumeService.createSkill(this.skillForm as ResumeSkill);
        this.skills.unshift(newSkill);
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Skill saved successfully'
      });
      
      this.showDialog = false;
    } catch (error) {
      console.error('Error saving skill:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save skill'
      });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(skill: ResumeSkill) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${skill.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteSkill(skill);
      }
    });
  }

  async deleteSkill(skill: ResumeSkill) {
    try {
      await this.resumeService.deleteSkill(skill.id!);
      this.skills = this.skills.filter(s => s.id !== skill.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Skill deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting skill:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete skill'
      });
    }
  }

  cancelEdit() {
    this.showDialog = false;
    this.editingSkill = null;
    this.skillForm = {
      name: '',
      tags: []
    };
  }
}
