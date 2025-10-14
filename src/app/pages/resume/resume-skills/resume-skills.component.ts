import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResumeService } from '../../resume-services/resume.service';
import { ResumeTagAutocompleteService } from '../../resume-services/resume-tag-autocomplete.service';
import { ResumeSkill, ResumeSkillForm, SKILL_CATEGORIES } from '../../../interfaces/resume.interface';

@Component({
  selector: 'app-resume-skills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    MessageModule,
    MultiSelectModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './resume-skills.component.html',
  styleUrl: './resume-skills.component.scss'
})
export class ResumeSkillsComponent implements OnInit {
  @ViewChild('dt') table!: Table;
  
  skills: ResumeSkill[] = [];
  skillForm: ResumeSkillForm = {
    name: '',
    category: '',
    is_featured: false,
    display_order: 0,
    tags: []
  };
  
  skillCategories = SKILL_CATEGORIES.map(cat => ({ label: cat, value: cat }));
  
  loading = false;
  saving = false;
  showDialog = false;
  editingSkill: ResumeSkill | null = null;
  
  // Tag autocomplete properties
  tagSuggestions: string[] = [];
  filteredTagSuggestions: string[] = [];
  currentTag: string = '';
  
  // Add tag dialog properties
  showAddTagDialog = false;
  newTagName = '';
  savingTag = false;
  
  // Tag filter properties
  availableTags: string[] = [];
  selectedTagFilters: string[] = [];

  constructor(
    private resumeService: ResumeService,
    private tagAutocompleteService: ResumeTagAutocompleteService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadSkills();
    await this.loadTagSuggestions();
  }

  async loadTagSuggestions() {
    try {
      this.tagSuggestions = await this.tagAutocompleteService.getPopularTags();
    } catch (error) {
      console.error('Error loading tag suggestions:', error);
    }
  }

  async searchTags(event: any) {
    const query = event.query;
    try {
      this.tagAutocompleteService.getSuggestions(query, 'skill').subscribe({
        next: (suggestions) => {
          this.filteredTagSuggestions = suggestions;
        },
        error: (error) => {
          console.error('Error searching tags:', error);
          this.filteredTagSuggestions = [];
        }
      });
    } catch (error) {
      console.error('Error searching tags:', error);
      this.filteredTagSuggestions = [];
    }
  }

  addTag(event: any) {
    if (event.value && event.value.trim()) {
      const tag = event.value.trim();
      if (!this.skillForm.tags.includes(tag)) {
        this.skillForm.tags.push(tag);
        this.tagAutocompleteService.addTagToCache(tag);
      }
      this.currentTag = '';
    }
  }

  onTagKeyDown(event: any) {
    if (event.key === 'Enter' && this.currentTag.trim()) {
      event.preventDefault();
      const tag = this.currentTag.trim();
      if (!this.skillForm.tags.includes(tag)) {
        this.skillForm.tags.push(tag);
        this.tagAutocompleteService.addTagToCache(tag);
      }
      this.currentTag = '';
    }
  }

  /**
   * Helper method to extract tag names from ResumeTag objects or strings
   */
  getTagNames(tags: any[]): string[] {
    return tags.map(tag => typeof tag === 'string' ? tag : tag.name);
  }

  async loadSkills() {
    this.loading = true;
    try {
      this.skills = await this.resumeService.getSkills();
      this.extractAvailableTags();
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

  extractAvailableTags() {
    // Extract all unique tags from all skills
    const tagsSet = new Set<string>();
    
    this.skills.forEach(skill => {
      if (skill.tags && skill.tags.length > 0) {
        const tagNames = this.getTagNames(skill.tags);
        tagNames.forEach(tag => tagsSet.add(tag));
      }
    });
    
    // Convert to sorted array
    this.availableTags = Array.from(tagsSet).sort();
  }

  openNewSkillDialog() {
    this.editingSkill = null;
    this.skillForm = {
      name: '',
      category: '',
      is_featured: false,
      display_order: 0,
      tags: []
    };
    this.currentTag = '';
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  openEditSkillDialog(skill: ResumeSkill) {
    this.editingSkill = skill;
    this.skillForm = {
      name: skill.name,
      category: skill.category || '',
      is_featured: skill.is_featured || false,
      display_order: skill.display_order || 0,
      tags: (skill.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name)
    };
    this.currentTag = '';
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
          this.skillForm
        );
        const index = this.skills.findIndex(s => s.id === this.editingSkill!.id);
        if (index !== -1) {
          this.skills[index] = updatedSkill;
        }
      } else {
        const newSkill = await this.resumeService.createSkill(this.skillForm);
        this.skills.unshift(newSkill);
        
        // Add new tags to autocomplete cache
        if (this.skillForm.tags) {
          this.skillForm.tags.forEach(tag => {
            this.tagAutocompleteService.addTagToCache(tag);
          });
        }
      }
      
      // Refresh available tags for the filter
      this.extractAvailableTags();
      
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
      
      // Refresh available tags for the filter
      this.extractAvailableTags();
      
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
      category: '',
      is_featured: false,
      display_order: 0,
      tags: []
    };
  }

  openAddTagDialog() {
    this.newTagName = '';
    this.showAddTagDialog = true;
  }

  async saveNewTag() {
    if (!this.newTagName.trim()) {
      return;
    }

    const tagName = this.newTagName.trim();
    
    this.savingTag = true;
    try {
      // Save tag to database
      await this.resumeService.createTag(tagName);
      
      // Add to current skill's tags if not already there
      if (!this.skillForm.tags.includes(tagName)) {
        this.skillForm.tags.push(tagName);
      }
      
      // Add to cache for autocomplete
      this.tagAutocompleteService.addTagToCache(tagName);
      
      // Reload tag suggestions
      await this.loadTagSuggestions();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Tag "${tagName}" created successfully`
      });
      
      this.showAddTagDialog = false;
      this.newTagName = '';
    } catch (error: any) {
      console.error('Error creating tag:', error);
      
      // Check if it's a duplicate tag error
      if (error?.message?.includes('already exists') || error?.code === '23505') {
        this.messageService.add({
          severity: 'warn',
          summary: 'Tag Already Exists',
          detail: `The tag "${tagName}" already exists. It has been added to your skill.`
        });
        
        // Add to current skill's tags anyway
        if (!this.skillForm.tags.includes(tagName)) {
          this.skillForm.tags.push(tagName);
        }
        
        this.showAddTagDialog = false;
        this.newTagName = '';
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create tag'
        });
      }
    } finally {
      this.savingTag = false;
    }
  }

  removeTag(index: number) {
    this.skillForm.tags.splice(index, 1);
  }

  onTagFilterChange() {
    if (!this.table) return;
    
    if (!this.selectedTagFilters || this.selectedTagFilters.length === 0) {
      // Clear filter
      this.table.filteredValue = null;
      return;
    }
    
    // Filter skills that have at least one tag matching any of the selected tags
    this.table.filteredValue = this.skills.filter(skill => {
      if (!skill.tags || skill.tags.length === 0) {
        return false;
      }
      
      const tagNames = this.getTagNames(skill.tags);
      return tagNames.some(tag => 
        this.selectedTagFilters.includes(tag)
      );
    });
  }
}
