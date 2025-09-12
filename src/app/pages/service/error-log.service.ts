import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Observable, from, map, catchError, of } from 'rxjs';
import { 
    ErrorLog, 
    CreateErrorLogRequest, 
    ErrorLogFilters, 
    ErrorLogStats,
    ErrorType,
    ErrorCategory,
    ErrorSeverity
} from '../../interfaces';

@Injectable({
    providedIn: 'root'
})
export class ErrorLogService {
    
    constructor(private supabaseService: SupabaseService) {}

    /**
     * Log an error to the database
     */
    logError(errorRequest: CreateErrorLogRequest): Observable<ErrorLog | null> {
        return from(this.logErrorAsync(errorRequest));
    }

    /**
     * Async version of logError
     */
    async logErrorAsync(errorRequest: CreateErrorLogRequest): Promise<ErrorLog | null> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();
            
            const errorLogData = {
                user_id: userId,
                error_type: errorRequest.error_type,
                error_category: errorRequest.error_category,
                error_code: errorRequest.error_code,
                error_message: errorRequest.error_message,
                error_stack: errorRequest.error_stack,
                operation: errorRequest.operation,
                component: errorRequest.component,
                function_name: errorRequest.function_name,
                error_data: errorRequest.error_data,
                file_name: errorRequest.file_name,
                row_number: errorRequest.row_number,
                batch_id: errorRequest.batch_id,
                request_data: errorRequest.request_data,
                response_data: errorRequest.response_data,
                user_agent: errorRequest.user_agent || navigator.userAgent,
                ip_address: errorRequest.ip_address,
                session_id: errorRequest.session_id,
                severity: errorRequest.severity || 'error'
            };

            const { data, error } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .insert([errorLogData])
                .select()
                .single();

            if (error) {
                console.error('Failed to log error:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in logErrorAsync:', error);
            return null;
        }
    }

    /**
     * Get error logs with optional filters
     */
    getErrorLogs(filters: ErrorLogFilters = {}): Observable<ErrorLog[]> {
        return from(this.getErrorLogsAsync(filters));
    }

    /**
     * Async version of getErrorLogs
     */
    async getErrorLogsAsync(filters: ErrorLogFilters = {}): Promise<ErrorLog[]> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();
            
            let query = this.supabaseService.getClient()
                .from('hb_error_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters.error_type) {
                query = query.eq('error_type', filters.error_type);
            }
            if (filters.error_category) {
                query = query.eq('error_category', filters.error_category);
            }
            if (filters.severity) {
                query = query.eq('severity', filters.severity);
            }
            if (filters.operation) {
                query = query.eq('operation', filters.operation);
            }
            if (filters.component) {
                query = query.eq('component', filters.component);
            }
            if (filters.file_name) {
                query = query.eq('file_name', filters.file_name);
            }
            if (filters.resolved !== undefined) {
                query = query.eq('resolved', filters.resolved);
            }
            if (filters.date_from) {
                query = query.gte('created_at', filters.date_from);
            }
            if (filters.date_to) {
                query = query.lte('created_at', filters.date_to);
            }

            // Apply pagination
            if (filters.limit) {
                query = query.limit(filters.limit);
            }
            if (filters.offset) {
                query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Failed to get error logs:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in getErrorLogsAsync:', error);
            return [];
        }
    }

    /**
     * Get error statistics
     */
    getErrorStats(): Observable<ErrorLogStats> {
        return from(this.getErrorStatsAsync());
    }

    /**
     * Async version of getErrorStats
     */
    async getErrorStatsAsync(): Promise<ErrorLogStats> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();
            
            // Get total errors
            const { count: totalErrors } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            // Get errors by type
            const { data: errorsByType } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .select('error_type')
                .eq('user_id', userId);

            // Get errors by category
            const { data: errorsByCategory } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .select('error_category')
                .eq('user_id', userId);

            // Get errors by severity
            const { data: errorsBySeverity } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .select('severity')
                .eq('user_id', userId);

            // Get recent errors
            const { data: recentErrors } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            // Get unresolved count
            const { count: unresolvedCount } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('resolved', false);

            // Process the data
            const errorsByTypeMap = errorsByType?.reduce((acc, error) => {
                const errorType = error.error_type as ErrorType;
                acc[errorType] = (acc[errorType] || 0) + 1;
                return acc;
            }, {} as Partial<Record<ErrorType, number>>) || {};

            const errorsByCategoryMap = errorsByCategory?.reduce((acc, error) => {
                const errorCategory = error.error_category as ErrorCategory;
                acc[errorCategory] = (acc[errorCategory] || 0) + 1;
                return acc;
            }, {} as Partial<Record<ErrorCategory, number>>) || {};

            const errorsBySeverityMap = errorsBySeverity?.reduce((acc, error) => {
                const errorSeverity = error.severity as ErrorSeverity;
                acc[errorSeverity] = (acc[errorSeverity] || 0) + 1;
                return acc;
            }, {} as Partial<Record<ErrorSeverity, number>>) || {};

            return {
                total_errors: totalErrors || 0,
                errors_by_type: errorsByTypeMap,
                errors_by_category: errorsByCategoryMap,
                errors_by_severity: errorsBySeverityMap,
                recent_errors: recentErrors || [],
                unresolved_count: unresolvedCount || 0
            };
        } catch (error) {
            console.error('Error in getErrorStatsAsync:', error);
            return {
                total_errors: 0,
                errors_by_type: {} as Partial<Record<ErrorType, number>>,
                errors_by_category: {} as Partial<Record<ErrorCategory, number>>,
                errors_by_severity: {} as Partial<Record<ErrorSeverity, number>>,
                recent_errors: [],
                unresolved_count: 0
            };
        }
    }

    /**
     * Mark an error as resolved
     */
    markErrorResolved(errorId: string, resolutionNotes?: string): Observable<boolean> {
        return from(this.markErrorResolvedAsync(errorId, resolutionNotes));
    }

    /**
     * Async version of markErrorResolved
     */
    async markErrorResolvedAsync(errorId: string, resolutionNotes?: string): Promise<boolean> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();
            
            const { error } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .update({
                    resolved: true,
                    resolved_at: new Date().toISOString(),
                    resolved_by: userId,
                    resolution_notes: resolutionNotes
                })
                .eq('id', errorId)
                .eq('user_id', userId);

            if (error) {
                console.error('Failed to mark error as resolved:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in markErrorResolvedAsync:', error);
            return false;
        }
    }

    /**
     * Delete old error logs (cleanup)
     */
    deleteOldErrorLogs(daysOld: number = 30): Observable<number> {
        return from(this.deleteOldErrorLogsAsync(daysOld));
    }

    /**
     * Async version of deleteOldErrorLogs
     */
    async deleteOldErrorLogsAsync(daysOld: number = 30): Promise<number> {
        try {
            const userId = await this.supabaseService.getCurrentUserId();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const { count, error } = await this.supabaseService.getClient()
                .from('hb_error_logs')
                .delete({ count: 'exact' })
                .eq('user_id', userId)
                .lt('created_at', cutoffDate.toISOString());

            if (error) {
                console.error('Failed to delete old error logs:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            console.error('Error in deleteOldErrorLogsAsync:', error);
            return 0;
        }
    }

    /**
     * Helper method to create a standardized error log entry
     */
    createErrorLog(
        error: any,
        errorType: ErrorType,
        operation: string,
        component: string,
        functionName: string,
        errorData?: any,
        additionalContext?: Partial<CreateErrorLogRequest>
    ): CreateErrorLogRequest {
        return {
            error_type: errorType,
            error_category: this.determineErrorCategory(error),
            error_code: error.code || error.status || undefined,
            error_message: error.message || error.toString(),
            error_stack: error.stack,
            operation,
            component,
            function_name: functionName,
            error_data: errorData,
            severity: this.determineSeverity(error),
            ...additionalContext
        };
    }

    /**
     * Determine error category based on error
     */
    private determineErrorCategory(error: any): ErrorCategory {
        if (error.code === '42501' || error.message?.includes('row-level security')) {
            return 'critical';
        }
        if (error.status >= 500) {
            return 'critical';
        }
        if (error.status >= 400) {
            return 'error';
        }
        if (error.name === 'ValidationError') {
            return 'warning';
        }
        return 'error';
    }

    /**
     * Determine severity based on error
     */
    private determineSeverity(error: any): ErrorSeverity {
        if (error.code === '42501' || error.message?.includes('row-level security')) {
            return 'critical';
        }
        if (error.status >= 500) {
            return 'critical';
        }
        if (error.status >= 400) {
            return 'error';
        }
        if (error.name === 'ValidationError') {
            return 'warning';
        }
        return 'error';
    }
}
