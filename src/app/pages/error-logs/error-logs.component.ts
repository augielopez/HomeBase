import { Component, OnInit } from '@angular/core';
import { ErrorLogService } from '../service/error-log.service';
import { ErrorLog, ErrorLogFilters, ErrorLogStats, ErrorType, ErrorCategory, ErrorSeverity } from '../../interfaces';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-error-logs',
    templateUrl: './error-logs.component.html',
    styleUrls: ['./error-logs.component.scss']
})
export class ErrorLogsComponent implements OnInit {
    errorLogs: ErrorLog[] = [];
    errorStats: ErrorLogStats | null = null;
    loading = false;
    selectedError: ErrorLog | null = null;
    showErrorDetails = false;

    // Filters
    filters: ErrorLogFilters = {
        limit: 50,
        offset: 0
    };

    // Filter options
    errorTypes: ErrorType[] = [
        'csv_import',
        'ai_categorization',
        'database',
        'api',
        'validation',
        'authentication',
        'authorization',
        'network',
        'file_processing',
        'transaction_processing',
        'category_management',
        'account_management',
        'other'
    ];

    errorCategories: ErrorCategory[] = ['critical', 'error', 'warning', 'info'];
    errorSeverities: ErrorSeverity[] = ['critical', 'error', 'warning', 'info', 'debug'];

    constructor(
        private errorLogService: ErrorLogService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadErrorStats();
        this.loadErrorLogs();
    }

    loadErrorStats() {
        this.errorLogService.getErrorStats().subscribe({
            next: (stats) => {
                this.errorStats = stats;
            },
            error: (error) => {
                console.error('Error loading error stats:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load error statistics'
                });
            }
        });
    }

    loadErrorLogs() {
        this.loading = true;
        this.errorLogService.getErrorLogs(this.filters).subscribe({
            next: (logs) => {
                this.errorLogs = logs;
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading error logs:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load error logs'
                });
                this.loading = false;
            }
        });
    }

    applyFilters() {
        this.filters.offset = 0; // Reset to first page
        this.loadErrorLogs();
    }

    clearFilters() {
        this.filters = {
            limit: 50,
            offset: 0
        };
        this.loadErrorLogs();
    }

    viewErrorDetails(error: ErrorLog) {
        this.selectedError = error;
        this.showErrorDetails = true;
    }

    closeErrorDetails() {
        this.selectedError = null;
        this.showErrorDetails = false;
    }

    markAsResolved(error: ErrorLog) {
        this.errorLogService.markErrorResolved(error.id, 'Manually resolved by user').subscribe({
            next: (success) => {
                if (success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Error marked as resolved'
                    });
                    this.loadErrorLogs();
                    this.loadErrorStats();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to mark error as resolved'
                    });
                }
            },
            error: (error) => {
                console.error('Error marking as resolved:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to mark error as resolved'
                });
            }
        });
    }

    getSeverityColor(severity: ErrorSeverity): string {
        switch (severity) {
            case 'critical':
                return '#dc2626'; // red-600
            case 'error':
                return '#ea580c'; // orange-600
            case 'warning':
                return '#d97706'; // amber-600
            case 'info':
                return '#2563eb'; // blue-600
            case 'debug':
                return '#6b7280'; // gray-500
            default:
                return '#6b7280';
        }
    }

    getCategoryColor(category: ErrorCategory): string {
        switch (category) {
            case 'critical':
                return '#dc2626'; // red-600
            case 'error':
                return '#ea580c'; // orange-600
            case 'warning':
                return '#d97706'; // amber-600
            case 'info':
                return '#2563eb'; // blue-600
            default:
                return '#6b7280';
        }
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString();
    }

    truncateText(text: string, maxLength: number = 100): string {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    exportErrorLogs() {
        // Simple CSV export functionality
        const csvContent = this.generateCSV(this.errorLogs);
        this.downloadCSV(csvContent, 'error-logs.csv');
    }

    private generateCSV(logs: ErrorLog[]): string {
        const headers = [
            'ID',
            'Error Type',
            'Category',
            'Severity',
            'Message',
            'Component',
            'Function',
            'File Name',
            'Row Number',
            'Created At',
            'Resolved'
        ];

        const rows = logs.map(log => [
            log.id,
            log.error_type,
            log.error_category,
            log.severity,
            `"${log.error_message.replace(/"/g, '""')}"`,
            log.component || '',
            log.function_name || '',
            log.file_name || '',
            log.row_number || '',
            log.created_at,
            log.resolved ? 'Yes' : 'No'
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    private downloadCSV(content: string, filename: string) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
