/**
 * Predefined job categories for IT positions
 */
export const JOB_CATEGORIES = [
    'Software Developer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'QA Engineer',
    'Data Scientist',
    'Data Engineer',
    'Machine Learning Engineer',
    'Product Owner',
    'Project Manager',
    'Scrum Master',
    'UX/UI Designer',
    'Mobile Developer',
    'Cloud Engineer',
    'Security Engineer',
    'Database Administrator',
    'System Administrator',
    'Technical Writer',
]

export type JobCategory = (typeof JOB_CATEGORIES)[number]
