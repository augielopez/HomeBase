import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ResumeMasterService } from './resume-master.service';

export interface TagSuggestion {
  tag: string;
  count: number;
  category?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResumeTagAutocompleteService {

  private tagCache: string[] = [];
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private masterService: ResumeMasterService) { }

  /**
   * Get autocomplete suggestions for tags
   */
  getSuggestions(query: string, tagType?: 'skill' | 'experience' | 'project' | 'volunteer'): Observable<string[]> {
    return new Observable(observer => {
      this.searchTags(query, tagType).then(suggestions => {
        observer.next(suggestions);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Search tags with caching
   */
  private async searchTags(query: string, tagType?: string): Promise<string[]> {
    // Check cache validity
    if (this.isCacheValid()) {
      return this.filterCachedTags(query);
    }

    // Refresh cache
    await this.refreshCache(tagType);
    return this.filterCachedTags(query);
  }

  /**
   * Filter cached tags based on query
   */
  private filterCachedTags(query: string): string[] {
    if (!query || query.trim().length < 2) {
      return this.tagCache.slice(0, 10); // Return top 10 when no query
    }

    const lowerQuery = query.toLowerCase().trim();
    return this.tagCache
      .filter(tag => tag.toLowerCase().includes(lowerQuery))
      .slice(0, 15); // Limit to 15 suggestions
  }

  /**
   * Refresh the tag cache
   */
  private async refreshCache(tagType?: string): Promise<void> {
    try {
      if (tagType) {
        this.tagCache = await this.masterService.searchTags('', tagType as any);
      } else {
        this.tagCache = await this.masterService.getAllTagNames();
      }
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    } catch (error) {
      console.error('Error refreshing tag cache:', error);
      this.tagCache = [];
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return this.tagCache.length > 0 && Date.now() < this.cacheExpiry;
  }

  /**
   * Get popular tags for initial suggestions
   */
  async getPopularTags(): Promise<string[]> {
    return await this.masterService.getPopularTags(10);
  }

  /**
   * Invalidate cache (useful when new tags are added)
   */
  invalidateCache(): void {
    this.cacheExpiry = 0;
    this.tagCache = [];
  }

  /**
   * Add a new tag to cache (for immediate availability)
   */
  addTagToCache(tag: string): void {
    if (tag && !this.tagCache.includes(tag)) {
      this.tagCache.unshift(tag); // Add to beginning
      this.tagCache = this.tagCache.slice(0, 50); // Keep cache size reasonable
    }
  }

  /**
   * Get tag suggestions with categories
   */
  async getTagSuggestionsWithCategories(query: string): Promise<TagSuggestion[]> {
    try {
      const allTags = await this.masterService.getAllTagNames();
      const tagStats = await this.masterService.getTagStatistics();
      
      const lowerQuery = query.toLowerCase().trim();
      const filteredTags = allTags.filter(tag => 
        !query || tag.toLowerCase().includes(lowerQuery)
      );

      return filteredTags.map(tagName => {
        const stat = tagStats.find(s => s.tag === tagName);
        return {
          tag: tagName,
          count: stat?.count || 1
        };
      }).sort((a, b) => b.count - a.count).slice(0, 15);
    } catch (error) {
      console.error('Error getting tag suggestions with categories:', error);
      return [];
    }
  }
}
