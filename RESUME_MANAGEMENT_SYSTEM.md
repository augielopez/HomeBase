# Resume Management System

A comprehensive resume management and job tailoring system integrated into the HomeBase Angular application.

## Features

### 📋 Resume Management
- **Contact Information**: Manage personal contact details
- **Skills Management**: Add skills with customizable tags
- **Work Experience**: Detailed work history with responsibilities and achievements
- **Education**: Academic background tracking
- **Certifications**: Professional certifications and credentials
- **Projects**: Personal and professional project portfolio
- **Volunteer Work**: Community involvement and volunteer experience

### 🤖 AI-Powered Job Tailoring
- **Job Description Analysis**: AI analyzes job requirements and extracts key skills
- **Resume Customization**: Automatically tailors resume content for specific applications
- **Smart Matching**: Matches your experience and skills with job requirements
- **Export Options**: Generate tailored resumes in Markdown format

## Database Schema

The system uses a normalized PostgreSQL database with the following key tables:

- `resume_contact` - Contact information (single record)
- `resume_skills` - Skills with tags
- `resume_experience` - Work experience with responsibilities
- `resume_education` - Educational background
- `resume_certifications` - Professional certifications
- `resume_projects` - Project portfolio
- `resume_volunteer` - Volunteer work

## API Structure

### Resume Service (`resume.service.ts`)
- CRUD operations for all resume components
- Master resume aggregation
- AI tailoring integration

### AI Tailoring Function (`supabase/functions/ai-tailor-resume/`)
- Edge function for AI-powered resume customization
- OpenAI GPT-4 integration
- Mock responses for development

## UI Components

### Core Components
- `ResumeContactComponent` - Contact information management
- `ResumeSkillsComponent` - Skills with tag management
- `ResumeExperienceComponent` - Work experience with responsibilities
- `ResumeEducationComponent` - Educational background
- `ResumeCertificationsComponent` - Certifications management
- `ResumeProjectsComponent` - Project portfolio
- `ResumeVolunteerComponent` - Volunteer work
- `ResumeTailoringComponent` - AI job tailoring assistant

### Features
- **Responsive Design**: Works on desktop and mobile
- **Tag Management**: Editable chips for skills and experience tags
- **Accordion Layout**: Organized experience display
- **Form Validation**: Comprehensive input validation
- **Toast Notifications**: User feedback for all operations
- **Confirmation Dialogs**: Safe deletion with confirmation

## Setup Instructions

### 1. Database Migration
Run the migration to create resume tables:
```sql
-- The migration file is located at:
-- supabase/migrations/20241201000012_create_resume_tables.sql
```

### 2. Environment Variables
Add OpenAI API key to Supabase secrets:
```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Deploy Edge Function
Deploy the AI tailoring function:
```bash
supabase functions deploy ai-tailor-resume
```

## Usage Guide

### 1. Setting Up Your Resume
1. Navigate to **Career & Resume** in the main menu
2. Start with **Contact Information** to add your basic details
3. Add **Skills** with relevant tags for better matching
4. Input **Work Experience** with detailed responsibilities
5. Add **Education**, **Certifications**, **Projects**, and **Volunteer Work**

### 2. Job Tailoring
1. Go to **Job Tailoring Assistant**
2. Paste the complete job description
3. Click **Tailor Resume**
4. Review the AI-generated tailored resume
5. Export as Markdown for further editing

### 3. Best Practices
- **Use Tags Effectively**: Tag your skills and experience for better AI matching
- **Detailed Descriptions**: Provide comprehensive descriptions for better tailoring
- **Keep Updated**: Regularly update your resume components
- **Review AI Output**: Always review and refine AI-generated content

## Technical Architecture

### Frontend (Angular)
- **Standalone Components**: Modern Angular architecture
- **PrimeNG UI**: Professional UI components
- **Reactive Forms**: Form validation and management
- **Service Layer**: Centralized data management

### Backend (Supabase)
- **PostgreSQL**: Robust database with RLS
- **Edge Functions**: Serverless AI processing
- **Real-time**: Live data synchronization
- **Authentication**: Secure user management

### AI Integration
- **OpenAI GPT-4**: Advanced language model
- **Prompt Engineering**: Optimized prompts for resume tailoring
- **Fallback System**: Mock responses for development
- **Error Handling**: Graceful error management

## File Structure

```
src/app/pages/resume/
├── resume-contact/
├── resume-skills/
├── resume-experience/
├── resume-education/
├── resume-certifications/
├── resume-projects/
├── resume-volunteer/
└── resume-tailoring/

supabase/functions/
└── ai-tailor-resume/
    └── index.ts

supabase/migrations/
└── 20241201000012_create_resume_tables.sql
```

## Future Enhancements

- **PDF Export**: Direct PDF generation from tailored resumes
- **Template System**: Multiple resume templates
- **Cover Letter Generation**: AI-powered cover letter creation
- **Job Application Tracking**: Integration with job application workflow
- **Analytics**: Resume performance metrics
- **Collaboration**: Multi-user resume editing

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript interfaces for type safety
3. Implement proper error handling
4. Add comprehensive form validation
5. Include user feedback for all operations
6. Test thoroughly before submitting changes

## Support

For issues or questions about the resume management system:
1. Check the existing documentation
2. Review the code comments and interfaces
3. Test with the provided mock data
4. Ensure all dependencies are properly installed
