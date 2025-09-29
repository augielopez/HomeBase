import { Component, OnInit } from '@angular/core';
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
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResumeService } from '../../service/resume.service';
import { ResumeProject, ResumeProjectForm } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-projects',
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
    TextareaModule,
    ToastModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './resume-projects.component.html',
  styleUrl: './resume-projects.component.scss'
})
export class ResumeProjectsComponent implements OnInit {
  projects: ResumeProject[] = [];
  projectForm: ResumeProjectForm = {
    title: '',
    description: '',
    tags: []
  };
  
  loading = false;
  saving = false;
  showDialog = false;
  editingProject: ResumeProject | null = null;

  constructor(
    private resumeService: ResumeService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  async ngOnInit() {
    await this.loadProjects();
  }

  async loadProjects() {
    this.loading = true;
    try {
      this.projects = await this.resumeService.getProjects();
    } catch (error) {
      console.error('Error loading projects:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load projects'
      });
    } finally {
      this.loading = false;
    }
  }

  openNewProjectDialog() {
    this.editingProject = null;
    this.projectForm = {
      title: '',
      description: '',
      tags: []
    };
    this.showDialog = true;
  }

  openEditProjectDialog(project: ResumeProject) {
    this.editingProject = project;
    this.projectForm = {
      title: project.title,
      description: project.description || '',
      tags: [...(project.tags || [])]
    };
    this.showDialog = true;
  }

  async saveProject() {
    if (!this.projectForm.title.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Project title is required'
      });
      return;
    }

    this.saving = true;
    try {
      if (this.editingProject) {
        const updatedProject = await this.resumeService.updateProject(
          this.editingProject.id!, 
          this.projectForm as ResumeProject
        );
        const index = this.projects.findIndex(p => p.id === this.editingProject!.id);
        if (index !== -1) {
          this.projects[index] = updatedProject;
        }
      } else {
        const newProject = await this.resumeService.createProject(this.projectForm as ResumeProject);
        this.projects.unshift(newProject);
      }
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Project saved successfully'
      });
      
      this.showDialog = false;
    } catch (error) {
      console.error('Error saving project:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save project'
      });
    } finally {
      this.saving = false;
    }
  }

  confirmDelete(project: ResumeProject) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${project.title}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteProject(project);
      }
    });
  }

  async deleteProject(project: ResumeProject) {
    try {
      await this.resumeService.deleteProject(project.id!);
      this.projects = this.projects.filter(p => p.id !== project.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete project'
      });
    }
  }

  cancelEdit() {
    this.showDialog = false;
    this.editingProject = null;
    this.projectForm = {
      title: '',
      description: '',
      tags: []
    };
  }
}
